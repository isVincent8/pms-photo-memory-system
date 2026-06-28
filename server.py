#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PMS Cloud Backend —— Google Drive 同步服务

为前端提供 OAuth2 登录与 Drive 文件读写接口：
- /api/auth/*      登录态管理
- /api/drive/*     文件夹解析与 push/pull

开发时由 Vite 代理转发 /api 到本服务（默认 3000 端口），保持同域 cookie。
"""

import io
import json
import os
import secrets
from datetime import datetime, timezone
from functools import wraps
from pathlib import Path
from typing import Any

from flask import Flask, jsonify, redirect, request, session
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload

PROJECT_ROOT = Path(__file__).resolve().parent

# ============== 配置 ==============

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "").strip()
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "").strip()
FLASK_SECRET_KEY = os.environ.get("FLASK_SECRET_KEY", "").strip() or secrets.token_hex(32)

# 开发环境默认走 Vite 代理；生产请配置为真实域名，并在 Google Cloud Console 白名单。
OAUTH_REDIRECT_URI = os.environ.get(
    "OAUTH_REDIRECT_URI",
    "http://localhost:5173/api/auth/callback",
).strip()

DRIVE_FOLDER_PATH = os.environ.get("DRIVE_FOLDER_PATH", "PMS/Data").strip()
DRIVE_SCOPES = ["https://www.googleapis.com/auth/drive.file"]

FILE_KEY_TO_NAME = {
    "pms_index": "index.json",
    "pms_settings": "settings.json",
}

app = Flask(__name__)
app.secret_key = FLASK_SECRET_KEY
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_NAME"] = "pms_session"


# ============== 工具函数 ==============

def log(msg: str) -> None:
    print(f"[server.py] {msg}")


def credentials_from_session() -> Credentials | None:
    """从 Flask session 重建 Google Credentials。"""
    token = session.get("google_token")
    if not token:
        return None
    creds = Credentials(
        token=token.get("token"),
        refresh_token=token.get("refresh_token"),
        token_uri=token.get("token_uri"),
        client_id=token.get("client_id"),
        client_secret=token.get("client_secret"),
        scopes=token.get("scopes"),
    )
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        session["google_token"] = {
            "token": creds.token,
            "refresh_token": creds.refresh_token,
            "token_uri": creds.token_uri,
            "client_id": creds.client_id,
            "client_secret": creds.client_secret,
            "scopes": creds.scopes,
        }
    return creds


def get_drive_service() -> Any:
    creds = credentials_from_session()
    if not creds:
        return None
    return build("drive", "v3", credentials=creds, static_discovery=False)


def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not credentials_from_session():
            return jsonify({"authenticated": False, "error": "未登录"}), 401
        return f(*args, **kwargs)

    return decorated


def make_flow() -> Flow:
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise RuntimeError("未配置 GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET")
    client_config = {
        "web": {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [OAUTH_REDIRECT_URI],
        }
    }
    return Flow.from_client_config(
        client_config,
        scopes=DRIVE_SCOPES,
        redirect_uri=OAUTH_REDIRECT_URI,
    )


def resolve_folder_path(service: Any, path: str, parent_id: str = "root") -> dict | None:
    """按路径逐级查找/创建文件夹，返回 {id, name, path}。"""
    parts = [p for p in path.strip("/").split("/") if p]
    if not parts:
        return {"id": "root", "name": "root", "path": "/"}

    current_id = parent_id
    current_path = ""
    for part in parts:
        current_path = f"{current_path}/{part}" if current_path else part
        query = (
            f"mimeType='application/vnd.google-apps.folder' "
            f"and name='{part}' and '{current_id}' in parents and trashed=false"
        )
        res = service.files().list(q=query, spaces="drive", fields="files(id, name)", pageSize=1).execute()
        files = res.get("files", [])
        if files:
            current_id = files[0]["id"]
        else:
            meta = {
                "name": part,
                "mimeType": "application/vnd.google-apps.folder",
                "parents": [current_id],
            }
            current_id = service.files().create(body=meta, fields="id").execute()["id"]

    return {"id": current_id, "name": parts[-1], "path": current_path}


def find_file_in_folder(service: Any, folder_id: str, filename: str) -> dict | None:
    query = f"name='{filename}' and '{folder_id}' in parents and trashed=false"
    res = service.files().list(q=query, spaces="drive", fields="files(id, name, modifiedTime)", pageSize=1).execute()
    files = res.get("files", [])
    return files[0] if files else None


# ============== 认证接口 ==============

@app.get("/api/auth/status")
def auth_status():
    creds = credentials_from_session()
    if not creds:
        return jsonify({"authenticated": False})
    try:
        service = build("oauth2", "v2", credentials=creds, static_discovery=False)
        profile = service.userinfo().get().execute()
        return jsonify({"authenticated": True, "email": profile.get("email")})
    except Exception as e:
        log(f"获取用户信息失败: {e}")
        session.clear()
        return jsonify({"authenticated": False, "error": str(e)}), 200


@app.get("/api/auth/login")
def auth_login():
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        return jsonify({"error": "服务器未配置 Google OAuth 凭据"}), 503
    try:
        flow = make_flow()
        authorization_url, state = flow.authorization_url(
            access_type="offline",
            include_granted_scopes="true",
            prompt="consent",
        )
        session["oauth_state"] = state
        return redirect(authorization_url)
    except Exception as e:
        log(f"创建 OAuth 流程失败: {e}")
        return jsonify({"error": "OAuth 初始化失败"}), 500


@app.get("/api/auth/callback")
def auth_callback():
    state = request.args.get("state")
    stored_state = session.get("oauth_state")
    if not state or state != stored_state:
        return jsonify({"error": "非法的 OAuth 状态参数"}), 400

    try:
        flow = make_flow()
        flow.fetch_token(authorization_response=request.url)
        creds = flow.credentials
        session["google_token"] = {
            "token": creds.token,
            "refresh_token": creds.refresh_token,
            "token_uri": creds.token_uri,
            "client_id": creds.client_id,
            "client_secret": creds.client_secret,
            "scopes": creds.scopes,
        }
        session.pop("oauth_state", None)
        # 登录成功后跳回前端设置页
        frontend = os.environ.get("FRONTEND_URL", "http://localhost:5173/settings")
        return redirect(frontend)
    except Exception as e:
        log(f"OAuth 回调处理失败: {e}")
        return jsonify({"error": "登录失败"}), 500


@app.get("/api/auth/logout")
def auth_logout():
    session.clear()
    frontend = os.environ.get("FRONTEND_URL", "http://localhost:5173/settings")
    return redirect(frontend)


# ============== Drive 接口 ==============

@app.post("/api/drive/folder")
@login_required
def drive_folder():
    data = request.get_json(silent=True) or {}
    path = data.get("path", DRIVE_FOLDER_PATH).strip()
    try:
        service = get_drive_service()
        if not service:
            return jsonify({"success": False, "error": "未登录"}), 401
        info = resolve_folder_path(service, path)
        return jsonify({"success": True, **info})
    except Exception as e:
        log(f"解析文件夹失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.post("/api/drive/push")
@login_required
def drive_push():
    data = request.get_json(silent=True) or {}
    key = data.get("key")
    payload = data.get("data")
    folder_id = data.get("folderId")

    if key not in FILE_KEY_TO_NAME:
        return jsonify({"success": False, "error": f"不支持的 key: {key}"}), 400
    if payload is None:
        return jsonify({"success": False, "error": "缺少 data"}), 400

    try:
        service = get_drive_service()
        if not service:
            return jsonify({"success": False, "error": "未登录"}), 401

        # 未提供 folderId 时按默认路径解析
        if not folder_id:
            info = resolve_folder_path(service, DRIVE_FOLDER_PATH)
            folder_id = info["id"]

        filename = FILE_KEY_TO_NAME[key]
        existing = find_file_in_folder(service, folder_id, filename)

        content = json.dumps(payload, ensure_ascii=False, indent=2)
        media = MediaIoBaseUpload(
            io.BytesIO(content.encode("utf-8")),
            mimetype="application/json",
            resumable=False,
        )

        if existing:
            service.files().update(
                fileId=existing["id"],
                body={"name": filename, "mimeType": "application/json"},
                media_body=media,
            ).execute()
            file_id = existing["id"]
        else:
            body = {
                "name": filename,
                "mimeType": "application/json",
                "parents": [folder_id],
            }
            file_id = service.files().create(body=body, media_body=media, fields="id").execute()["id"]

        synced_at = datetime.now(timezone.utc).isoformat()
        return jsonify({"success": True, "syncedAt": synced_at, "folderId": folder_id, "fileId": file_id})
    except Exception as e:
        log(f"推送失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.post("/api/drive/pull")
@login_required
def drive_pull():
    data = request.get_json(silent=True) or {}
    folder_id = data.get("folderId")
    folder_path = data.get("folderPath", DRIVE_FOLDER_PATH).strip()

    try:
        service = get_drive_service()
        if not service:
            return jsonify({"success": False, "error": "未登录"}), 401

        if not folder_id:
            info = resolve_folder_path(service, folder_path)
            folder_id = info["id"]

        result: dict[str, Any] = {"success": True, "folderId": folder_id}
        drive_empty = True

        for key, filename in FILE_KEY_TO_NAME.items():
            file_info = find_file_in_folder(service, folder_id, filename)
            if not file_info:
                continue
            drive_empty = False
            content = (
                service.files()
                .get(fileId=file_info["id"], alt="media")
                .execute()
            )
            if isinstance(content, bytes):
                content = content.decode("utf-8")
            result[key] = json.loads(content)

        result["driveEmpty"] = drive_empty
        return jsonify(result)
    except Exception as e:
        log(f"拉取失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


# ============== 健康检查 ==============

@app.get("/api/health")
def health():
    return jsonify({"ok": True, "oauth_configured": bool(GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)})


# ============== 启动 ==============

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "3000"))
    debug = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    log(f"启动 PMS Cloud Backend，端口 {port}")
    log(f"OAuth 回调地址: {OAUTH_REDIRECT_URI}")
    app.run(host="127.0.0.1", port=port, debug=debug)
