"""
Database adapter — unified MySQL / SQLite interface.
Auto-detects: MySQL if available (local), falls back to SQLite (cloud).
"""
import os
import sqlite3
import re
from datetime import datetime, date, timedelta

import pymysql

DB_TYPE = os.environ.get('DB_TYPE', '').lower()
SQLITE_PATH = os.path.join(os.path.dirname(__file__) or '.', 'cinema.db')

# Try MySQL config
try:
    from config import DB_CONFIG
except ImportError:
    DB_CONFIG = {
        "host": "localhost", "user": "root",
        "password": "zwq123123", "database": "cinema2",
        "charset": "utf8mb4"
    }


def _mysql_available():
    """Test whether MySQL is reachable."""
    if DB_TYPE == 'sqlite':
        return False
    try:
        c = pymysql.connect(**DB_CONFIG, connect_timeout=2)
        c.close()
        return True
    except Exception:
        return False


_use_mysql = _mysql_available()
_use_sqlite = not _use_mysql


def _adapt_sql(sql, params=()):
    """Convert MySQL SQL + %s params to SQLite-compatible SQL with ? placeholders."""
    # Replace MySQL date functions
    sql = sql.replace('CURDATE() + INTERVAL 1 DAY', "date('now', '+1 day')")
    sql = sql.replace('CURDATE()', "date('now')")
    sql = sql.replace('NOW()', "datetime('now')")
    sql = sql.replace('%s', '?')
    # Handle boolean/integer params that pymysql expects as ints
    return sql


def _row_to_dict(row, col_names):
    """Convert sqlite3.Row or tuple to dict."""
    if row is None:
        return None
    if isinstance(row, sqlite3.Row):
        return dict(row)
    return {col_names[i]: row[i] for i in range(len(row))}


class SQLiteDictCursor:
    """Mimics pymysql DictCursor for SQLite."""
    def __init__(self, conn):
        self.conn = conn
        self.cursor = conn.cursor()
        self.rowcount = 0
        self.lastrowid = 0
        self._description = []

    def _parse_value(self, v):
        """Convert text datetime/timedelta strings to Python objects like pymysql would."""
        if not isinstance(v, str):
            return v
        # Match "YYYY-MM-DD HH:MM:SS" (datetime)
        if re.match(r'^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$', v):
            try:
                return datetime.strptime(v, '%Y-%m-%d %H:%M:%S')
            except ValueError:
                pass
        # Match "YYYY-MM-DD" (date)
        if re.match(r'^\d{4}-\d{2}-\d{2}$', v):
            try:
                return datetime.strptime(v, '%Y-%m-%d').date()
            except ValueError:
                pass
        # Match "HH:MM:SS" (time → timedelta)
        if re.match(r'^\d{2}:\d{2}:\d{2}$', v):
            try:
                parts = v.split(':')
                return timedelta(hours=int(parts[0]), minutes=int(parts[1]), seconds=int(parts[2]))
            except ValueError:
                pass
        return v

    def _make_dict(self, row):
        if row is None:
            return None
        desc = self._description
        d = {}
        for i, col in enumerate(desc):
            d[col] = self._parse_value(row[i])
        return d

    def execute(self, sql, params=()):
        adapted = _adapt_sql(sql, params)
        self.cursor.execute(adapted, params)
        self._description = [d[0] for d in (self.cursor.description or [])]
        self.rowcount = self.cursor.rowcount
        self.lastrowid = self.cursor.lastrowid

    def fetchone(self):
        row = self.cursor.fetchone()
        if row is None:
            return None
        return self._make_dict(row)

    def fetchall(self):
        return [self._make_dict(row) for row in self.cursor.fetchall()]

    def close(self):
        self.cursor.close()


def get_db_connection():
    if _use_mysql:
        conn = pymysql.connect(**DB_CONFIG)
        return conn, conn.cursor(pymysql.cursors.DictCursor)
    else:
        conn = sqlite3.connect(SQLITE_PATH)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        return conn, SQLiteDictCursor(conn)


# ============================
#  Schema and Seed Data
# ============================

SCHEMA_SQL = [
    """CREATE TABLE IF NOT EXISTS admin_user (
        user_id INTEGER PRIMARY KEY, username TEXT, password TEXT,
        name TEXT, phone TEXT, register_time TEXT
    )""",
    """CREATE TABLE IF NOT EXISTS cinema (
        cinema_id INTEGER PRIMARY KEY, user_id INTEGER, cinema_name TEXT,
        type TEXT, address TEXT, phone TEXT, hall_count INTEGER,
        status TEXT, create_time TEXT
    )""",
    """CREATE TABLE IF NOT EXISTS favorite (
        favorite_id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER,
        movie_id INTEGER, create_time TEXT
    )""",
    """CREATE TABLE IF NOT EXISTS movie (
        movie_id INTEGER PRIMARY KEY, user_id INTEGER, movie_name TEXT,
        director TEXT, actors TEXT, genre TEXT, duration INTEGER,
        release_date TEXT, poster_url TEXT, description TEXT, extra TEXT
    )""",
    """CREATE TABLE IF NOT EXISTS refund (
        refund_id INTEGER PRIMARY KEY, movie_id INTEGER, user_id INTEGER,
        cinema_id INTEGER, reason TEXT, amount REAL, show_time TEXT,
        refund_time TEXT, status TEXT
    )""",
    """CREATE TABLE IF NOT EXISTS review (
        review_id INTEGER PRIMARY KEY, movie_id INTEGER, cinema_id INTEGER,
        user_id INTEGER, content TEXT, rating INTEGER, create_time TEXT,
        status TEXT
    )""",
    """CREATE TABLE IF NOT EXISTS schedule (
        schedule_id INTEGER PRIMARY KEY AUTOINCREMENT, movie_id INTEGER,
        cinema_id INTEGER, show_date TEXT, show_time TEXT, price REAL,
        available_seats INTEGER, language TEXT DEFAULT ''
    )""",
    """CREATE TABLE IF NOT EXISTS ticket (
        ticket_id INTEGER PRIMARY KEY, user_id INTEGER, movie_id INTEGER,
        cinema_id INTEGER, seat_number TEXT, price REAL, show_time TEXT,
        buy_time TEXT, status TEXT
    )""",
    """CREATE TABLE IF NOT EXISTS "user" (
        user_id INTEGER PRIMARY KEY, user_name TEXT, phone TEXT,
        email TEXT, password TEXT, register_time TEXT, status TEXT
    )""",
    """CREATE TABLE IF NOT EXISTS view_log (
        log_id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER,
        movie_id INTEGER, view_time TEXT, ip_address TEXT
    )""",
]

SEED_DATA = {
    "admin_user": [
        (154, '31543', 'scrypt:32768:8:1$DgGPUHerHJI1yXRD$f87953fbab211da9eb6c23d6df3325ba843d3c233ea615f46d5375b12b2fc8eddca4a16d5d133285f0b2580215f25cd400c70b41cb10f705203e90326bdfe774', '张三', '12525135', '2026-01-01 00:10:50'),
        (155, 'admin01', 'scrypt:32768:8:1$DgGPUHerHJI1yXRD$f87953fbab211da9eb6c23d6df3325ba843d3c233ea615f46d5375b12b2fc8eddca4a16d5d133285f0b2580215f25cd400c70b41cb10f705203e90326bdfe774', '李四', '138001380', '2026-05-01 11:00:00'),
        (156, 'admin02', 'scrypt:32768:8:1$DgGPUHerHJI1yXRD$f87953fbab211da9eb6c23d6df3325ba843d3c233ea615f46d5375b12b2fc8eddca4a16d5d133285f0b2580215f25cd400c70b41cb10f705203e90326bdfe774', '王五', '156078462', '2026-04-27 15:24:00'),
    ],
    "cinema": [
        (1, 154, '星光影城（武汉店）', 'IMAX厅', '武汉市江汉区万达广场', '13800138001', 8, '1', '2026-01-01 10:00:00'),
        (2, 155, '银兴国际影城（光谷店）', '巨幕厅', '武汉市洪山区光谷广场C区', '13800138002', 10, '1', '2026-02-01 11:00:00'),
        (3, 156, '万达影城（汉街店）', '杜比全景声厅', '武汉市江夏区文化大道8号', '13800138003', 6, '0', '2026-03-01 09:30:00'),
    ],
    "favorite": [
        (6, 1001, 1, '2026-05-20 14:35:39'),
    ],
    "movie": [
        (1, 154, '流浪地球', '郭帆', '吴京、屈楚萧', '科幻/冒险', 125, '2019-02-05', '流浪地球.jpg', '太阳即将毁灭，人类在地球表面建造出巨大的推进器，寻找新的家园。然而宇宙之路危机四伏，为了拯救地球，流浪地球时代的年轻人挺身而出，展开争分夺秒的生死之战。', None),
        (2, 154, '哪吒之魔童降世', '杨宇（饺子）', '吕艳婷、囧森瑟夫', '动画/喜剧', 110, '2019-07-26', '哪吒之魔童降世.jpg', '天地灵气孕育出一颗混元珠，元始天尊将其提炼成灵珠和魔丸，灵珠投胎为人，可堪大用；而魔丸则会诞出魔王，为祸人间。然而阴差阳错，灵珠和魔丸被掉包。', None),
        (3, 154, '复仇者联盟4：终局之战', '罗素兄弟', '小罗伯特·唐尼，克里斯·埃文斯', '动作/科幻', 181, '2019-04-26', '复仇者联盟4.avif', '一声响指，宇宙间半数生命灰飞烟灭。几近绝望的复仇者们在惊奇队长的帮助下找到灭霸归隐之处，却得知六颗无限宝石均被销毁。', None),
    ],
    "review": [
        (1, 1, 1, 154, '特效超棒，剧情也很感人！', 5, '2026-05-05 18:00:00', '1'),
        (2, 2, 2, 155, '画面超好看，国漫之光！', 5, '2026-05-06 22:00:00', '1'),
        (3, 3, 1, 156, '座位不太舒服，体验一般', 3, '2026-05-07 12:30:00', '1'),
        (4, 1004, 3, 154, '悬疑感拉满，结局反转很精彩！', 4, '2026-05-08 21:00:00', '1'),
        (5, 1, None, 1001, 'test review', 4, '2026-05-20 13:15:28', '1'),
    ],
    "user": [
        (1001, 'user1', '13900139001', 'xiaoming@qq.com', 'scrypt:32768:8:1$FWWTehcmPQLR4Gsk$e165b6c2fc622eee8d34860fb17bac71aba18734a5d4ecf5db97c5e84e8ed774273c8d9f645d58cc705971d802af9d053d711bed9b8c2f0681f6a8fee3cc60c7', '2026-05-01 09:00:00', '1'),
        (1002, 'user2', '13900139002', 'xiaohong@qq.com', 'scrypt:32768:8:1$DgGPUHerHJI1yXRD$f87953fbab211da9eb6c23d6df3325ba843d3c233ea615f46d5375b12b2fc8eddca4a16d5d133285f0b2580215f25cd400c70b41cb10f705203e90326bdfe774', '2026-05-02 10:30:00', '1'),
        (1003, 'user3', '13900139003', 'xiaogang@qq.com', 'scrypt:32768:8:1$DgGPUHerHJI1yXRD$f87953fbab211da9eb6c23d6df3325ba843d3c233ea615f46d5375b12b2fc8eddca4a16d5d133285f0b2580215f25cd400c70b41cb10f705203e90326bdfe774', '2026-05-03 14:15:00', '2'),
        (1004, 'user4', '13900139004', 'xiaoli@qq.com', 'scrypt:32768:8:1$DgGPUHerHJI1yXRD$f87953fbab211da9eb6c23d6df3325ba843d3c233ea615f46d5375b12b2fc8eddca4a16d5d133285f0b2580215f25cd400c70b41cb10f705203e90326bdfe774', '2026-05-04 16:45:00', '0'),
        (1005, 'testuser', '13800138000', 'test@test.com', 'scrypt:32768:8:1$L9bhhfc25lhEl6Cc$e5578d82b2d8305e7a015a8bbd62754f6445c579235db9bd2be5fdc6395e8ea8c81aa7bf848caa4f6b99778dff50a9fac8b35cb84b63c938003c96fc51664004', '2026-05-20 13:12:14', '1'),
        (1006, 'vtest99', '13900000000', 'v@t.com', 'scrypt:32768:8:1$LskCujiDuDBRpxz9$d9c668a39bd88fe8a5fbb49a656d371a510e43d57f9806333f59341e24eb860657aa311472ca317d8a1e758d647256879fac11be565a854a8d4898bf0b10817a', '2026-05-20 13:16:22', '1'),
    ],
    "ticket": [
        (1, 1001, 1, 1, '1排5座', 35.00, '2026-05-15 14:00:00', '2026-05-14 15:00:00', '已支付'),
        (2, 1002, 2, 2, '3排8座', 40.00, '2026-05-16 19:30:00', '2026-05-12 10:10:00', '已支付'),
        (3, 1003, 3, 3, '5排12座', 40.00, '2026-05-17 20:00:00', '2026-05-17 13:28:00', '已退款'),
    ],
    "refund": [
        (1, 3, 1003, 154, '行程变更无法观影', 40.00, '2026-05-17 15:00:00', '2026-05-17 15:10:00', '已通过'),
    ],
    "schedule": [
        (127, 1, 1, '2026-05-24', '10:00:00', 35.00, 48, '国语2D'),
        (128, 1, 1, '2026-05-24', '14:15:00', 35.00, 50, 'IMAX 3D'),
        (130, 1, 2, '2026-05-24', '10:00:00', 35.00, 60, '英语3D'),
        (133, 1, 3, '2026-05-24', '10:00:00', 35.00, 70, '粤语2D'),
        (134, 1, 3, '2026-05-24', '14:15:00', 35.00, 70, '国语3D'),
        (135, 1, 3, '2026-05-24', '19:30:00', 35.00, 70, '国语2D'),
        (136, 2, 1, '2026-05-24', '10:00:00', 40.00, 60, '国语3D'),
        (137, 2, 1, '2026-05-24', '14:15:00', 40.00, 60, '国语2D'),
        (138, 2, 1, '2026-05-24', '19:30:00', 40.00, 60, '国语3D'),
        (139, 2, 2, '2026-05-24', '10:00:00', 40.00, 70, 'IMAX 3D'),
        (140, 2, 2, '2026-05-24', '14:15:00', 40.00, 70, 'IMAX 3D'),
        (142, 2, 3, '2026-05-24', '10:00:00', 40.00, 80, '国语2D'),
        (144, 2, 3, '2026-05-24', '19:30:00', 40.00, 80, '国语3D'),
        (145, 3, 1, '2026-05-24', '10:00:00', 55.00, 70, '原版2D'),
        (146, 3, 1, '2026-05-24', '14:15:00', 55.00, 70, '原版2D'),
        (147, 3, 1, '2026-05-24', '19:30:00', 55.00, 70, '国语2D'),
        (150, 3, 2, '2026-05-24', '19:30:00', 55.00, 80, '国语2D'),
        (151, 3, 3, '2026-05-24', '10:00:00', 55.00, 90, 'IMAX 3D'),
        (152, 3, 3, '2026-05-24', '14:15:00', 55.00, 90, '国语3D'),
    ],
}

# Generate future schedules (today + 21 days) for 3 movies x 3 cinemas
def _generate_future_schedules():
    today = date.today()
    existing_dates = set()
    for s in SEED_DATA['schedule']:
        existing_dates.add(s[3])  # show_date

    schedules = list(SEED_DATA['schedule'])
    movie_times = {1: ['10:00:00', '14:15:00', '19:30:00'], 2: ['10:00:00', '14:15:00', '19:30:00'], 3: ['10:00:00', '14:15:00', '19:30:00']}
    movie_prices = {1: 35.00, 2: 40.00, 3: 55.00}
    movie_cinemas = {
        1: [(1, ['中文2D', 'IMAX 3D']), (2, ['英文3D']), (3, ['中文2D', '中文3D', '中文2D'])],
        2: [(1, ['中文3D', '中文2D', '中文3D']), (2, ['IMAX 3D', 'IMAX 3D']), (3, ['中文2D', '中文3D'])],
        3: [(1, ['原声2D', '原声2D', '中文2D']), (2, ['中文2D']), (3, ['IMAX 3D', '中文3D'])],
    }

    import random
    next_id = max(s[0] for s in schedules) + 1
    for day_offset in range(1, 22):
        d = today + timedelta(days=day_offset)
        d_str = d.strftime('%Y-%m-%d')
        if d_str in existing_dates:
            continue
        for movie_id in [1, 2, 3]:
            cinemas_config = movie_cinemas.get(movie_id, [])
            for cinema_id, langs in cinemas_config:
                times = movie_times.get(movie_id, ['10:00:00', '14:15:00'])
                for i, t in enumerate(times):
                    if i < len(langs):
                        lang = langs[i]
                    else:
                        lang = langs[-1]
                    schedules.append((
                        next_id, movie_id, cinema_id, d_str, t,
                        movie_prices.get(movie_id, 40.00),
                        random.randint(40, 100), lang
                    ))
                    next_id += 1
    return schedules


def init_db():
    """Create tables and seed data for SQLite (no-op for MySQL)."""
    if _use_mysql:
        return
    conn = sqlite3.connect(SQLITE_PATH)
    try:
        for s in SCHEMA_SQL:
            conn.execute(s)

        # Check if data already exists
        cur = conn.execute("SELECT COUNT(*) FROM movie")
        if cur.fetchone()[0] > 0:
            return  # Already seeded

        for table, rows in SEED_DATA.items():
            if table == 'schedule':
                # Already handled separately
                continue
            if not rows:
                continue
            cols = len(rows[0])
            placeholders = ','.join(['?'] * cols)
            conn.executemany(f'INSERT OR IGNORE INTO "{table}" VALUES ({placeholders})', rows)

        # Seed schedules (including future dates)
        all_schedules = _generate_future_schedules()
        conn.executemany(
            'INSERT OR IGNORE INTO schedule VALUES (?,?,?,?,?,?,?,?)',
            all_schedules
        )

        conn.commit()
        print(f"[db] SQLite initialized: {SQLITE_PATH}")
    finally:
        conn.close()


def using_mysql():
    return _use_mysql


def using_sqlite():
    return _use_sqlite
