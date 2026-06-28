#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PMS 静态站点导出脚本

功能：
1. 运行 npm run build 构建生产包
2. 将 dist/ 内容复制到 exports/pms-site-<timestamp>/
3. 可选生成 ZIP 压缩包
4. 输出导出路径，便于部署到任意静态托管服务

用法：
    python3 export.py                 # 导出到目录
    python3 export.py --zip           # 导出并打包为 ZIP
    python3 export.py --out /path/to/dir   # 指定输出目录
"""

import argparse
import os
import shutil
import subprocess
import sys
import zipfile
from datetime import datetime
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent
DIST_DIR = PROJECT_ROOT / "dist"
DEFAULT_EXPORTS_DIR = PROJECT_ROOT / "exports"


def log(msg: str) -> None:
    print(f"[export.py] {msg}")


def run_build() -> bool:
    """执行 npm run build。"""
    log("开始构建生产包...")
    result = subprocess.run(
        ["npm", "run", "build"],
        cwd=PROJECT_ROOT,
        stdout=sys.stdout,
        stderr=sys.stderr,
        text=True,
    )
    if result.returncode != 0:
        log("构建失败，导出终止")
        return False
    if not DIST_DIR.exists():
        log("构建完成后未找到 dist/ 目录")
        return False
    log("构建完成")
    return True


def copy_dist(target_dir: Path) -> None:
    """复制 dist/ 到目标目录。"""
    if target_dir.exists():
        log(f"清理已存在的目录: {target_dir}")
        shutil.rmtree(target_dir)
    log(f"复制 dist/ -> {target_dir}")
    shutil.copytree(DIST_DIR, target_dir)


def create_zip(source_dir: Path, zip_path: Path) -> None:
    """将目录打包为 ZIP。"""
    log(f"生成压缩包: {zip_path}")
    if zip_path.exists():
        zip_path.unlink()
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for file_path in source_dir.rglob("*"):
            if file_path.is_file():
                arcname = file_path.relative_to(source_dir)
                zf.write(file_path, arcname)


def main() -> int:
    parser = argparse.ArgumentParser(description="PMS 静态站点导出")
    parser.add_argument("--out", type=str, help="输出目录（默认 exports/pms-site-<timestamp>）")
    parser.add_argument("--zip", action="store_true", help="额外生成 ZIP 压缩包")
    args = parser.parse_args()

    if not run_build():
        return 1

    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    if args.out:
        target_dir = Path(args.out).resolve()
    else:
        DEFAULT_EXPORTS_DIR.mkdir(exist_ok=True)
        target_dir = DEFAULT_EXPORTS_DIR / f"pms-site-{timestamp}"

    try:
        copy_dist(target_dir)
    except Exception as e:
        log(f"复制 dist 失败: {e}")
        return 1

    print("\n" + "=" * 50)
    print("PMS 静态站点导出成功")
    print(f"输出目录: {target_dir}")

    if args.zip:
        zip_path = Path(str(target_dir) + ".zip")
        try:
            create_zip(target_dir, zip_path)
            print(f"压缩包:   {zip_path}")
        except Exception as e:
            log(f"生成 ZIP 失败: {e}")
            return 1

    print("=" * 50 + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
