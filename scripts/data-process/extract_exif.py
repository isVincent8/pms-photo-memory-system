#!/usr/bin/env python3
# EXIF 提取脚本（Task 1.4 + 验收目标 5）
# 遍历 public/img/{slug}/ 下所有照片（排除 thumbs/ 与 _meta/），
# 提取拍摄时间、GPS 经纬度、图像尺寸，输出 sidecar JSON 至 public/img/_meta/{基名}.json。
# generate_index.js 读取这些 sidecar 来填充 photos[].date / location / width / height。
#
# 用法：python3 data-process/extract_exif.py
# 依赖：Pillow, piexif（见 requirements.txt）

import json
import os
from datetime import datetime

from PIL import Image
import piexif

# 项目根：scripts/data-process/ 上两级
HERE = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
IMG_DIR = os.path.join(PROJECT_ROOT, 'public', 'img')
META_DIR = os.path.join(IMG_DIR, '_meta')

SKIP_DIRS = {'thumbs', '_meta'}
IMG_EXTS = {'.jpg', '.jpeg', '.png', '.webp', '.gif'}


def _rationals_to_degrees(value):
    """EXIF GPS 度分秒 ((d,1),(m,1),(s,den)) -> 十进制度数。"""
    d = value[0][0] / value[0][1] if len(value) > 0 else 0
    m = value[1][0] / value[1][1] if len(value) > 1 else 0
    s = value[2][0] / value[2][1] if len(value) > 2 else 0
    return d + m / 60 + s / 3600


def extract_gps(exif_dict):
    """从 piexif GPS IFD 提取 (latitude, longitude) 或 (None, None)。"""
    gps = exif_dict.get('GPS', {}) or {}
    if not gps or piexif.GPSIFD.GPSLatitude not in gps:
        return None, None
    try:
        lat = _rationals_to_degrees(gps[piexif.GPSIFD.GPSLatitude])
        if gps.get(piexif.GPSIFD.GPSLatitudeRef, b'N') == b'S':
            lat = -lat
        lon = _rationals_to_degrees(gps[piexif.GPSIFD.GPSLongitude])
        if gps.get(piexif.GPSIFD.GPSLongitudeRef, b'E') == b'W':
            lon = -lon
        return round(lat, 6), round(lon, 6)
    except Exception:
        return None, None


def _parse_dt(s):
    """'2017:03:25 13:00:00' -> '2017-03-25T13:00:00'。"""
    try:
        return datetime.strptime(s.decode() if isinstance(s, bytes) else s, '%Y:%m:%d %H:%M:%S').strftime('%Y-%m-%dT%H:%M:%S')
    except Exception:
        return None


def extract_one(path):
    """提取单张照片的 EXIF，返回 dict。"""
    result = {'date': None, 'latitude': None, 'longitude': None, 'width': None, 'height': None}
    try:
        with Image.open(path) as im:
            result['width'], result['height'] = im.size
            if 'exif' in im.info:
                exif_dict = piexif.load(im.info['exif'])
                exif_ifd = exif_dict.get('Exif', {}) or {}
                dt = exif_ifd.get(piexif.ExifIFD.DateTimeOriginal)
                if dt:
                    result['date'] = _parse_dt(dt)
                lat, lon = extract_gps(exif_dict)
                result['latitude'] = lat
                result['longitude'] = lon
    except Exception as e:
        print(f'  [warn] 读取失败 {os.path.relpath(path, PROJECT_ROOT)}: {e}')
    return result


def walk_photos(root):
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for name in sorted(filenames):
            if os.path.splitext(name)[1].lower() in IMG_EXTS:
                yield os.path.join(dirpath, name)


def main():
    if not os.path.isdir(IMG_DIR):
        print('public/img 不存在，先运行 relocate。')
        return
    os.makedirs(META_DIR, exist_ok=True)
    count = 0
    for photo in walk_photos(IMG_DIR):
        meta = extract_one(photo)
        base = os.path.splitext(os.path.basename(photo))[0]
        sidecar = os.path.join(META_DIR, base + '.json')
        with open(sidecar, 'w', encoding='utf-8') as f:
            json.dump(meta, f, ensure_ascii=False, indent=2)
            f.write('\n')
        count += 1
        rel = os.path.relpath(photo, PROJECT_ROOT)
        print(f'  exif -> {rel}  date={meta["date"]} gps=({meta["latitude"]},{meta["longitude"]}) {meta["width"]}x{meta["height"]}')
    print(f'EXIF 提取完成，共 {count} 张。')


if __name__ == '__main__':
    main()
