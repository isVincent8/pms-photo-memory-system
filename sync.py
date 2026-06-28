#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PMS 一键同步脚本

功能：
1. 检查仓库状态
2. 可选运行 typecheck + build
3. 自动提交并推送到 GitHub
4. 触发 Vercel 自动部署

用法：
    python3 sync.py                      # 默认同步，自动生成提交信息
    python3 sync.py -m "更新内容"         # 指定提交信息
    python3 sync.py --skip-build         # 跳过构建检查
"""

import argparse
import subprocess
import sys
from datetime import datetime
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent


def log(msg: str) -> None:
    print(f"[sync.py] {msg}")


def run(cmd: list[str], check: bool = True) -> subprocess.CompletedProcess:
    log(" ".join(cmd))
    return subprocess.run(
        cmd,
        cwd=PROJECT_ROOT,
        stdout=sys.stdout,
        stderr=sys.stderr,
        text=True,
        check=check,
    )


def has_changes() -> bool:
    """检查是否有已暂存或未暂存的变更。"""
    result = subprocess.run(
        ["git", "status", "--short"],
        cwd=PROJECT_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    return bool(result.stdout.strip())


def staged_changes() -> bool:
    """检查是否有已暂存的变更。"""
    result = subprocess.run(
        ["git", "diff", "--cached", "--quiet"],
        cwd=PROJECT_ROOT,
        capture_output=True,
        check=False,
    )
    return result.returncode != 0


def main() -> int:
    parser = argparse.ArgumentParser(description="PMS 一键同步到 GitHub/Vercel")
    parser.add_argument("-m", "--message", help="Git 提交信息")
    parser.add_argument(
        "--skip-build",
        action="store_true",
        help="跳过 npm run typecheck 和 npm run build",
    )
    args = parser.parse_args()

    # 1. 检查 git 仓库
    result = subprocess.run(
        ["git", "rev-parse", "--git-dir"],
        cwd=PROJECT_ROOT,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        log("当前目录不是 Git 仓库，请先初始化")
        return 1

    # 2. 检查 remote
    result = subprocess.run(
        ["git", "remote", "get-url", "origin"],
        cwd=PROJECT_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        log("未找到 origin 远程仓库，请先配置")
        return 1
    remote_url = result.stdout.strip()
    log(f"远程仓库: {remote_url}")

    # 3. 可选构建检查
    if not args.skip_build:
        log("运行类型检查...")
        run(["npm", "run", "typecheck"])
        log("运行生产构建...")
        run(["npm", "run", "build"])
    else:
        log("跳过构建检查")

    # 4. 检查是否有变更
    if not has_changes():
        log("没有变更需要同步")
        return 0

    # 5. 提交信息
    message = args.message or f"sync: update at {datetime.now().strftime('%Y-%m-%d %H:%M')}"

    # 6. git add / commit / push
    run(["git", "add", "."])

    if not staged_changes():
        log("没有需要提交的变更")
        return 0

    run(["git", "commit", "-m", message])
    run(["git", "push", "origin", "main"])

    log("同步完成")
    log("GitHub: https://github.com/isVincent8/pms-photo-memory-system")
    log("Vercel 将自动部署最新提交: https://pms-photo-memory-system.vercel.app")
    return 0


if __name__ == "__main__":
    sys.exit(main())
