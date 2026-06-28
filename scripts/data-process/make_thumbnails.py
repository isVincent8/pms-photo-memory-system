#!/usr/bin/env python3
# 缩略图生成脚本（Task 1.4）
# 为 public/img/{slug}/ 下每张照片生成缩略图至 public/img/{slug}/thumbs/{基名}.jpg。
# 缩略图统一 JPEG，最大边 400px，等比缩放。幂等：覆盖已有缩略图。
#
# 用法：python3 data-process/make_thumbnails.py
# 依赖：Pillow（见 requirements.txt）

import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
IMG_DIR = os.path.join(PROJECT_ROOT, 'public', 'img')

SKIP_DIRS = {'thumbs', '_meta'}
IMG_EXTS = {'.jpg', '.jpeg', '.png', '.webp', '.gif'}
MAX_SIZE = 400


def walk_photos(root):
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for name in sorted(filenames):
            if os.path.splitext(name)[1].lower() in IMG_EXTS:
                yield os.path.join(dirpath, name)


def make_thumb(src):
    base = os.path.splitext(os.path.basename(src))[0]
    thumb_dir = os.path.join(os.path.dirname(src), 'thumbs')
    os.makedirs(thumb_dir, exist_ok=True)
    dest = os.path.join(thumb_dir, base + '.jpg')
    with Image.open(src) as im:
        im = im.convert('RGB')
        im.thumbnail((MAX_SIZE, MAX_SIZE))
        im.save(dest, 'JPEG', quality=80)
    return dest


def main():
    if not os.path.isdir(IMG_DIR):
        print('public/img 不存在，先运行 relocate。')
        return
    count = 0
    for photo in walk_photos(IMG_DIR):
        dest = make_thumb(photo)
        count += 1
        print(f'  thumb -> {os.path.relpath(dest, PROJECT_ROOT)}')
    print(f'缩略图生成完成，共 {count} 张。')


if __name__ == '__main__':
    main()
