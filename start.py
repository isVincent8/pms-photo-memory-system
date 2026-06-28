#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PMS 一键启动脚本

功能：
1. 检测并清理项目占用的端口（默认 5173 等）
2. 检测并清理残留的项目相关进程
3. 一键启动前端（以及可选后端）
4. 自动用系统默认浏览器打开页面
5. 在终端显示本机 IP 和访问地址

用法：
    python3 start.py

说明：
- 当前项目为纯前端项目（Vite + Vue），脚本默认只启动前端。
- 如果后续增加后端服务，请修改下方 BACKEND 配置，将 enabled 设为 True，
  并填入正确的启动命令和端口。
"""

import argparse
import os
import re
import sys
import time
import signal
import socket
import subprocess
import webbrowser
from pathlib import Path
from typing import List, Optional

# ==================== 配置区（按需修改） ====================

PROJECT_ROOT = Path(__file__).resolve().parent

FRONTEND = {
    "name": "前端",
    # --no-open 避免 Vite 自动打开浏览器，由本脚本统一打开
    "command": ["npm", "run", "dev", "--", "--no-open"],
    "port": 5173,
    "cwd": PROJECT_ROOT,
    "ready_timeout": 60,
}

BACKEND = {
    # 当前项目无独立后端；若有，请改为 True 并填写实际启动命令
    "enabled": False,
    "name": "后端",
    "command": ["python3", "server.py"],
    "port": 3000,
    "cwd": PROJECT_ROOT,
    "ready_timeout": 60,
}

# 浏览器打开的地址（通常指向前端）
BROWSER_URL = f"http://127.0.0.1:{FRONTEND['port']}"

# 进程匹配关键词（用于清理残留的项目相关进程）
# 格式：[(服务名, 正则匹配关键词), ...]
PROCESS_PATTERNS = [
    (FRONTEND["name"], re.escape(str(PROJECT_ROOT)) + r".*vite"),
    # 启用后端时取消下面注释并修改关键词
    # (BACKEND["name"], re.escape(str(PROJECT_ROOT)) + r".*server\.py"),
]

# ==================== 工具函数 ====================


def log(msg: str) -> None:
    print(f"[start.py] {msg}")


def get_local_ip() -> str:
    """获取本机局域网 IP（用于局域网访问）。"""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = "127.0.0.1"
    finally:
        s.close()
    return ip


def get_pids_on_port(port: int) -> List[int]:
    """返回占用指定 TCP 端口的所有 PID。"""
    try:
        result = subprocess.run(
            ["lsof", "-ti", f"tcp:{port}"],
            capture_output=True,
            text=True,
            check=False,
        )
        pids = [
            int(p.strip())
            for p in result.stdout.strip().split()
            if p.strip().isdigit()
        ]
        return pids
    except Exception as e:
        log(f"检测端口 {port} 时出错: {e}")
        return []


def find_project_processes() -> List[int]:
    """根据 PROCESS_PATTERNS 查找项目相关进程 PID。"""
    pids = set()
    current_pid = os.getpid()
    for name, pattern in PROCESS_PATTERNS:
        try:
            result = subprocess.run(
                ["pgrep", "-f", pattern],
                capture_output=True,
                text=True,
                check=False,
            )
            for token in result.stdout.strip().split():
                if token.isdigit():
                    pid = int(token)
                    if pid != current_pid:
                        pids.add(pid)
        except Exception as e:
            log(f"查找 {name} 相关进程时出错: {e}")
    return list(pids)


def kill_processes(pids: List[int], reason: str) -> None:
    """先 SIGTERM 再 SIGKILL 结束指定 PID 列表。"""
    if not pids:
        return
    log(f"{reason}，正在结束进程: {pids}")
    for pid in pids:
        try:
            os.kill(pid, signal.SIGTERM)
        except ProcessLookupError:
            pass
        except Exception as e:
            log(f"结束进程 {pid} 失败: {e}")

    time.sleep(0.5)

    for pid in pids:
        try:
            os.kill(pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        except Exception:
            pass


def wait_for_port(port: int, timeout: int = 60) -> bool:
    """轮询等待本机端口变为可连接。"""
    deadline = time.time() + timeout
    while time.time() < deadline:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(0.5)
        try:
            s.connect(("127.0.0.1", port))
            s.close()
            return True
        except (ConnectionRefusedError, socket.timeout, OSError):
            time.sleep(0.3)
        finally:
            s.close()
    return False


def start_service(service: dict) -> subprocess.Popen:
    """启动一个服务，子进程进入新会话以便整组清理。"""
    name = service["name"]
    cmd = service["command"]
    cwd = service["cwd"]
    log(f"启动 {name}: {' '.join(cmd)}")
    env = os.environ.copy()
    env["FORCE_COLOR"] = "1"
    return subprocess.Popen(
        cmd,
        cwd=cwd,
        env=env,
        start_new_session=True,
        stdin=subprocess.DEVNULL,
        stdout=None,
        stderr=None,
    )


# ==================== 主流程 ====================

running_processes: List[subprocess.Popen] = []


def cleanup() -> None:
    """清理所有已启动的子进程。"""
    log("正在停止所有启动的服务...")
    for proc in running_processes:
        if proc.poll() is not None:
            continue
        try:
            pgid = os.getpgid(proc.pid)
            os.killpg(pgid, signal.SIGTERM)
        except Exception:
            try:
                proc.terminate()
            except Exception:
                pass

    time.sleep(0.5)

    for proc in running_processes:
        if proc.poll() is not None:
            continue
        try:
            pgid = os.getpgid(proc.pid)
            os.killpg(pgid, signal.SIGKILL)
        except Exception:
            try:
                proc.kill()
            except Exception:
                pass


def signal_handler(signum, frame) -> None:
    cleanup()
    sys.exit(0)


def check_command(cmd: List[str]) -> Optional[str]:
    """检查命令是否可用，返回第一个可执行文件名。"""
    if not cmd:
        return None
    try:
        subprocess.run([cmd[0], "--version"], capture_output=True, check=False)
        return None
    except FileNotFoundError:
        return cmd[0]


PREVIEW = {
    "name": "预览",
    "command": ["npm", "run", "preview", "--", "--no-open"],
    "port": 4173,
    "cwd": PROJECT_ROOT,
    "ready_timeout": 60,
}

BUILD = {
    "name": "构建",
    "command": ["npm", "run", "build"],
    "cwd": PROJECT_ROOT,
}


def run_build() -> int:
    """执行一次性构建任务。"""
    log(f"开始构建: {' '.join(BUILD['command'])}")
    proc = subprocess.Popen(
        BUILD["command"],
        cwd=BUILD["cwd"],
        env={**os.environ, "FORCE_COLOR": "1"},
        stdin=subprocess.DEVNULL,
    )
    try:
        return proc.wait()
    except KeyboardInterrupt:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()
        return 130


def build_service_command(base: dict, port: Optional[int], host: bool) -> List[str]:
    """根据命令行参数构造服务启动命令。"""
    cmd = list(base["command"])
    if port is not None:
        cmd.extend(["--port", str(port)])
    if host:
        cmd.append("--host")
    return cmd


def run_dev(port: Optional[int] = None, host: bool = False, open_browser: bool = True) -> None:
    """启动开发服务器（并可选启动后端）。"""
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    local_ip = get_local_ip()
    frontend_port = port if port is not None else FRONTEND["port"]
    cmd = build_service_command(FRONTEND, port, host)

    missing = check_command(cmd)
    if missing:
        log(f"找不到命令: {missing}，请确认 Node.js / npm 已安装")
        sys.exit(1)
    if BACKEND["enabled"]:
        missing = check_command(BACKEND["command"])
        if missing:
            log(f"找不到后端命令: {missing}")
            sys.exit(1)

    ports_to_clear = [frontend_port]
    if BACKEND["enabled"]:
        ports_to_clear.append(BACKEND["port"])

    port_pids: List[int] = []
    for p in ports_to_clear:
        port_pids.extend(get_pids_on_port(p))
    port_pids = list(set(port_pids))
    if port_pids:
        kill_processes(port_pids, f"端口 {ports_to_clear} 已被占用")

    project_pids = find_project_processes()
    if project_pids:
        kill_processes(project_pids, "发现残留的项目相关进程")

    if BACKEND["enabled"]:
        backend_proc = start_service(BACKEND)
        running_processes.append(backend_proc)
        log(f"等待后端端口 {BACKEND['port']} 就绪...")
        if not wait_for_port(BACKEND["port"], BACKEND["ready_timeout"]):
            log("后端启动超时，请检查后端的启动命令和日志")
            cleanup()
            sys.exit(1)

    frontend_proc = start_service({**FRONTEND, "command": cmd})
    running_processes.append(frontend_proc)

    log(f"等待前端端口 {frontend_port} 就绪...")
    if not wait_for_port(frontend_port, FRONTEND["ready_timeout"]):
        log("前端启动超时，请检查 npm 依赖和 Vite 配置")
        cleanup()
        sys.exit(1)

    print("\n" + "=" * 50)
    print("PMS 已启动")
    print(f"本机 IP:    {local_ip}")
    print(f"本地访问:   http://127.0.0.1:{frontend_port}")
    if host:
        print(f"局域网访问: http://{local_ip}:{frontend_port}")
    if BACKEND["enabled"]:
        print(f"后端接口:   http://127.0.0.1:{BACKEND['port']}")
    else:
        print("后端服务:   未启用（可在 BACKEND 配置中开启）")
    print("=" * 50 + "\n")

    if open_browser:
        url = f"http://127.0.0.1:{frontend_port}"
        log(f"正在打开浏览器: {url}")
        try:
            webbrowser.open(url)
        except Exception as e:
            log(f"自动打开浏览器失败: {e}")

    log("按 Ctrl+C 停止所有服务")
    try:
        for proc in running_processes:
            proc.wait()
    except KeyboardInterrupt:
        pass
    finally:
        cleanup()


def run_preview(port: Optional[int] = None, host: bool = False, open_browser: bool = True) -> None:
    """启动生产预览服务器。"""
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    dist_dir = PROJECT_ROOT / "dist"
    if not dist_dir.exists():
        log("未找到 dist 目录，请先执行: python3 start.py build")
        sys.exit(1)

    local_ip = get_local_ip()
    preview_port = port if port is not None else PREVIEW["port"]
    cmd = build_service_command(PREVIEW, port, host)

    missing = check_command(cmd)
    if missing:
        log(f"找不到命令: {missing}，请确认 Node.js / npm 已安装")
        sys.exit(1)

    port_pids = get_pids_on_port(preview_port)
    if port_pids:
        kill_processes(port_pids, f"端口 {preview_port} 已被占用")

    proc = start_service({**PREVIEW, "command": cmd})
    running_processes.append(proc)

    log(f"等待预览端口 {preview_port} 就绪...")
    if not wait_for_port(preview_port, PREVIEW["ready_timeout"]):
        log("预览服务启动超时，请检查是否已执行构建")
        cleanup()
        sys.exit(1)

    print("\n" + "=" * 50)
    print("PMS 预览服务已启动")
    print(f"本地访问:   http://127.0.0.1:{preview_port}")
    if host:
        print(f"局域网访问: http://{local_ip}:{preview_port}")
    print("=" * 50 + "\n")

    if open_browser:
        url = f"http://127.0.0.1:{preview_port}"
        log(f"正在打开浏览器: {url}")
        try:
            webbrowser.open(url)
        except Exception as e:
            log(f"自动打开浏览器失败: {e}")

    log("按 Ctrl+C 停止所有服务")
    try:
        for p in running_processes:
            p.wait()
    except KeyboardInterrupt:
        pass
    finally:
        cleanup()


def main() -> None:
    parser = argparse.ArgumentParser(description="PMS 一键启动脚本")
    parser.add_argument(
        "command",
        nargs="?",
        default="dev",
        choices=["dev", "build", "preview"],
        help="要执行的操作：dev（开发，默认）、build（构建）、preview（预览）",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=None,
        help="自定义服务端口（dev/preview 有效）",
    )
    parser.add_argument(
        "--host",
        action="store_true",
        help="暴露到局域网（dev/preview 有效）",
    )
    parser.add_argument(
        "--no-browser",
        dest="open_browser",
        action="store_false",
        default=True,
        help="启动后不自动打开浏览器",
    )
    args = parser.parse_args()

    if args.command == "build":
        sys.exit(run_build())
    elif args.command == "preview":
        run_preview(port=args.port, host=args.host, open_browser=args.open_browser)
    else:
        run_dev(port=args.port, host=args.host, open_browser=args.open_browser)


if __name__ == "__main__":
    main()
