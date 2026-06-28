#!/usr/bin/env python3
# 一次性样本数据生成器：生成带 EXIF（拍摄时间 + GPS）的样本照片与手账原始笔记。
# 仅用于走通数据流水线，不属于可重用的 pipeline 步骤。
# 运行：python3 scripts/raw-data/generate_sample_data.py

import os
from datetime import datetime
from PIL import Image, ImageDraw
import piexif

ROOT = os.path.dirname(os.path.abspath(__file__))
PHOTOS = os.path.join(ROOT, 'photos-raw')
NOTES = os.path.join(ROOT, 'notes-raw')


def _rat(num):
    """浮点转 EXIF 有理数 (numerator, denominator)。"""
    if num >= 0:
        sign = 1
    else:
        sign = -1
        num = -num
    den = 1000000
    return (int(num * den) * sign, den)


def _deg(deg, minute, sec):
    """度分秒 -> EXIF GPS rational 三元组。"""
    return ((int(deg), 1), (int(minute), 1), _rat(sec))


def make_gps(latitude, longitude):
    """构造 piexif GPS IFD。latitude/longitude 为十进制度数。"""
    lat_ref = 'N' if latitude >= 0 else 'S'
    lon_ref = 'E' if longitude >= 0 else 'W'
    la = abs(latitude)
    lo = abs(longitude)
    lat_dms = _deg(int(la), (la - int(la)) * 60, 0)
    lon_dms = _deg(int(lo), (lo - int(lo)) * 60, 0)
    return {
        piexif.GPSIFD.GPSLatitudeRef: lat_ref,
        piexif.GPSIFD.GPSLatitude: lat_dms,
        piexif.GPSIFD.GPSLongitudeRef: lon_ref,
        piexif.GPSIFD.GPSLongitude: lon_dms,
    }


def make_exif(capture_dt, latitude, longitude):
    """构造完整 EXIF 字节。capture_dt: datetime。"""
    zeroth = {
        piexif.ImageIFD.DateTime: capture_dt.strftime('%Y:%m:%d %H:%M:%S'),
    }
    exif = {
        piexif.ExifIFD.DateTimeOriginal: capture_dt.strftime('%Y:%m:%d %H:%M:%S'),
        piexif.ExifIFD.DateTimeDigitized: capture_dt.strftime('%Y:%m:%d %H:%M:%S'),
    }
    gps = make_gps(latitude, longitude)
    return piexif.dump({'0th': zeroth, 'Exif': exif, 'GPS': gps, '1st': {}, 'thumbnail': None})


def make_photo(path, caption, capture_dt, latitude, longitude, color, size=(800, 600)):
    """生成一张带 EXIF 的 JPEG。文件名可含中文以测试重命名逻辑。"""
    img = Image.new('RGB', size, color)
    draw = ImageDraw.Draw(img)
    # 简单填充：居中写入说明文字与日期
    text = f'{caption}\n{capture_dt.date()}'
    draw.multiline_text((size[0] // 2 - 80, size[1] // 2 - 20), text, fill=(255, 255, 255))
    exif_bytes = make_exif(capture_dt, latitude, longitude)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, 'jpeg', exif=exif_bytes, quality=85)
    print(f'  photo -> {os.path.relpath(path, ROOT)}')


# 各阶段/相册的样本照片定义。文件名刻意混用中文/大写/不规则命名，测试重命名。
PHOTO_DEFS = {
    'childhood': {
        'coords': (39.9042, 116.4074),  # 北京
        'files': [
            ('童年01.jpg', '胡同夏天', datetime(2005, 7, 20, 14, 30, 0), (180, 120, 80)),
            ('IMG_0001.JPG', '冰糖葫芦', datetime(2006, 1, 15, 10, 0, 0), (200, 160, 90)),
            ('photo_family.jpg', '全家福', datetime(2008, 5, 3, 9, 15, 0), (90, 130, 170)),
        ],
    },
    'university': {
        'coords': (30.5928, 114.3055),  # 武汉
        'files': [
            ('樱花.jpg', '樱花季', datetime(2017, 3, 25, 13, 0, 0), (230, 180, 200)),
            ('DSCN1234.jpg', '东湖骑行', datetime(2016, 4, 10, 16, 45, 0), (120, 180, 130)),
            ('军训.JPG', '入学军训', datetime(2015, 9, 5, 8, 30, 0), (150, 150, 130)),
            ('毕业照.jpg', '毕业典礼', datetime(2019, 6, 20, 10, 0, 0), (60, 90, 160)),
        ],
    },
    'first-job': {
        'coords': (22.5431, 114.0579),  # 深圳
        'files': [
            ('微信图片_20210701.jpg', '入职第一天', datetime(2020, 7, 1, 9, 0, 0), (40, 50, 70)),
            ('工位.jpg', '我的工位', datetime(2021, 3, 12, 14, 20, 0), (90, 90, 95)),
            ('团建.jpg', '团队团建', datetime(2021, 11, 8, 18, 30, 0), (180, 90, 90)),
        ],
    },
    'travel-sanya': {
        'coords': (18.2528, 109.5119),  # 三亚
        'files': [
            ('海边.jpg', '第一眼海', datetime(2020, 8, 15, 16, 0, 0), (80, 150, 200)),
            ('日落.JPG', '海边日落', datetime(2020, 8, 15, 18, 45, 0), (230, 150, 90)),
            ('潜水.jpg', '第一次潜水', datetime(2020, 8, 16, 10, 30, 0), (40, 130, 180)),
        ],
    },
}

# 原始手账笔记：刻意使用纯文本/不规则换行，测试 markdown_formatter 的结构化能力。
NOTE_DEFS = {
    'childhood.txt': """\
童年

我记得北京的胡同，夏天蝉鸣很响。
冰糖葫芦是冬天最盼的东西，五毛钱一串。

  那时候妈妈总在巷口等我放学。
爸爸话不多，但每次下雨都会来接我。

一些零碎的：
- 学骑自行车摔了三次
- 第一次得奖状是三年级
- 养过一只叫小白的猫

这大概是记忆里最安稳的一段日子。
""",
    'university.txt': """\
大学四年 2015-2019

武汉的大学四年，是我最自由的时光。

关键回忆：
2016年春天 樱花季的东湖骑行，和 Alice 一起
2017年暑假 第一次实习，在公司通宵改 bug
2018年冬天 备考研，图书馆占座

室友 Alice 是四年形影不离的人。
妈妈每月寄一次家乡特产。

军训晒脱皮，但认识了第一批朋友。
毕业典礼那天哭成狗。
""",
    'first-job.txt': """\
初入职场 2020-2022

深圳的第一份工作。

入职第一天紧张到手心出汗。
工位靠窗，能看到远处的山。

Bob 是带我的前辈，教会我很多。
2021 年团建第一次喝醉。

- 第一次独立负责项目是 2021 年 3 月
- 第一次出差去了上海
- 学会和不同部门沟通

这段日子让我从学生变成大人。
""",
}


def main():
    print('生成样本照片...')
    for stage, spec in PHOTO_DEFS.items():
        lat, lon = spec['coords']
        for fname, caption, dt, color in spec['files']:
            make_photo(os.path.join(PHOTOS, stage, fname), caption, dt, lat, lon, color)

    print('生成原始手账笔记...')
    os.makedirs(NOTES, exist_ok=True)
    for fname, content in NOTE_DEFS.items():
        with open(os.path.join(NOTES, fname), 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'  note  -> notes-raw/{fname}')

    print('完成。')


if __name__ == '__main__':
    main()
