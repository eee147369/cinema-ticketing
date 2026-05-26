"""一次性脚本：清理旧排期 + 生成5/26至6/15的排期数据"""
import pymysql
import random
from datetime import date, timedelta
from config import DB_CONFIG

conn = pymysql.connect(**DB_CONFIG)
cur = conn.cursor()

# 1. 删除5/24之前的旧数据
cur.execute("DELETE FROM schedule WHERE show_date < '2026-05-24'")
deleted = cur.rowcount
print(f'已删除 {deleted} 条旧排期记录')

# 2. 删除5/26-6/15已有数据（幂等，避免重复插入）
cur.execute("DELETE FROM schedule WHERE show_date >= '2026-05-26' AND show_date <= '2026-06-15'")
cleared = cur.rowcount
print(f'已清除 {cleared} 条5/26-6/15旧记录')

# 3. 排期模板：参照5/24的排期模式
# (movie_id, cinema_id, time, price, language)
TEMPLATES = [
    # 你的名字 (movie_id=1)
    (1, 1, '10:00', 35, '中文2D'),
    (1, 1, '14:15', 35, 'IMAX 3D'),
    (1, 2, '10:00', 35, '英文3D'),
    (1, 3, '10:00', 35, '中文2D'),
    (1, 3, '14:15', 35, '中文3D'),
    (1, 3, '19:30', 35, '中文2D'),
    # 哪吒之魔童闹海 (movie_id=2)
    (2, 1, '10:00', 40, '中文3D'),
    (2, 1, '14:15', 40, '中文2D'),
    (2, 1, '19:30', 40, '中文3D'),
    (2, 2, '10:00', 40, 'IMAX 3D'),
    (2, 2, '14:15', 40, 'IMAX 3D'),
    (2, 3, '10:00', 40, '中文2D'),
    (2, 3, '19:30', 40, '中文3D'),
    # 速度与激情4：最终之战 (movie_id=3)
    (3, 1, '10:00', 55, '原声2D'),
    (3, 1, '14:15', 55, '原声2D'),
    (3, 1, '19:30', 55, '中文2D'),
    (3, 2, '19:30', 55, '中文2D'),
    (3, 3, '10:00', 55, 'IMAX 3D'),
    (3, 3, '14:15', 55, '中文3D'),
]

start = date(2026, 5, 26)
end = date(2026, 6, 15)
current = start
inserted = 0

while current <= end:
    for movie_id, cinema_id, show_time, price, language in TEMPLATES:
        seats = random.randint(40, 100)
        cur.execute(
            "INSERT INTO schedule (movie_id, cinema_id, show_date, show_time, price, available_seats, language) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s)",
            (movie_id, cinema_id, current, show_time, price, seats, language)
        )
        inserted += 1
    current += timedelta(days=1)

conn.commit()
print(f'已插入 {inserted} 条排期记录（{start} 至 {end}，共 {(end - start).days + 1} 天）')

# 验证
cur.execute("SELECT COUNT(*) FROM schedule WHERE show_date >= '2026-05-24'")
total = cur.fetchone()[0]
cur.execute("SELECT MIN(show_date), MAX(show_date) FROM schedule")
date_range = cur.fetchone()
print(f'验证：现有排期 {total} 条，日期范围 {date_range[0]} ~ {date_range[1]}')

conn.close()
print('完成')
