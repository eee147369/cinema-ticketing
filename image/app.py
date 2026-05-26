from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
from datetime import timedelta
import os
from db import get_db_connection, init_db, using_sqlite

app = Flask(__name__)
CORS(app)

# 托管前端静态文件，让所有页面可以通过 http://localhost:5000/ 访问
STATIC_DIR = os.path.dirname(__file__) or '.'

@app.route('/')
@app.route('/<path:filename>')
def serve_static(filename='cinema.html'):
    # 禁止直接访问 .py 文件（保护数据库配置）
    if filename.endswith('.py'):
        return 'Forbidden', 403
    if not filename or not os.path.splitext(filename)[1]:
        filename = 'cinema.html'
    target = os.path.join(STATIC_DIR, filename)
    if os.path.exists(target) and os.path.isfile(target):
        return send_from_directory(STATIC_DIR, filename)
    return send_from_directory(os.path.dirname(STATIC_DIR), filename)


@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get("username", "")
    password = data.get("password", "")

    if not username or not password:
        return jsonify({"error": "用户名和密码不能为空"}), 400

    conn, cur = get_db_connection()
    try:
        cur.execute(
            "SELECT user_id, user_name, phone, email, password, register_time FROM user WHERE user_name = %s",
            (username,)
        )
        user = cur.fetchone()
        if not user:
            return jsonify({"error": "用户名或密码错误"}), 401

        stored = user["password"]
        is_valid = check_password_hash(stored, password) if stored.startswith(("pbkdf2:", "scrypt:", "bcrypt:")) else stored == password
        if not is_valid:
            return jsonify({"error": "用户名或密码错误"}), 401

        return jsonify({
            "user_id": user["user_id"],
            "user_name": user["user_name"],
            "phone": user["phone"],
            "email": user["email"],
            "register_time": user["register_time"].strftime("%Y-%m-%d %H:%M:%S")
            if isinstance(user["register_time"], datetime)
            else str(user["register_time"])
        })
    finally:
        conn.close()


@app.route('/api/user/info', methods=['GET'])
def get_user_info():
    user_id = request.args.get("user_id", "")
    if not user_id:
        return jsonify({"error": "user_id 参数必填"}), 400
    conn, cur = get_db_connection()
    try:
        cur.execute(
            "SELECT user_id, user_name, phone, email, register_time FROM user WHERE user_id = %s",
            (user_id,)
        )
        user = cur.fetchone()
        if not user:
            return jsonify({"error": "用户不存在"}), 404
        return jsonify({
            "user_id": user["user_id"],
            "user_name": user["user_name"],
            "phone": user["phone"],
            "email": user["email"],
            "register_time": user["register_time"].strftime("%Y-%m-%d %H:%M:%S")
            if isinstance(user["register_time"], datetime)
            else str(user["register_time"])
        })
    finally:
        conn.close()


@app.route('/api/ticket/all', methods=['GET'])
def get_all_tickets():
    user_id = request.args.get("user_id", "")
    conn, cur = get_db_connection()
    try:
        if user_id:
            cur.execute("""
                SELECT t.*, u.user_name, m.movie_name, c.cinema_name
                FROM ticket t
                LEFT JOIN user u ON t.user_id = u.user_id
                LEFT JOIN movie m ON t.movie_id = m.movie_id
                LEFT JOIN cinema c ON t.cinema_id = c.cinema_id
                WHERE t.user_id = %s
                ORDER BY t.buy_time DESC
            """, (user_id,))
        else:
            cur.execute("""
                SELECT t.*, u.user_name, m.movie_name, c.cinema_name
                FROM ticket t
                LEFT JOIN user u ON t.user_id = u.user_id
                LEFT JOIN movie m ON t.movie_id = m.movie_id
                LEFT JOIN cinema c ON t.cinema_id = c.cinema_id
                ORDER BY t.buy_time DESC
            """)
        tickets = cur.fetchall()
        result = []
        for t in tickets:
            result.append({
                "ticket_id": t["ticket_id"],
                "user_id": t["user_id"],
                "user_name": t.get("user_name", ""),
                "movie_id": t["movie_id"],
                "movie_name": t.get("movie_name", ""),
                "cinema_id": t["cinema_id"],
                "cinema_name": t.get("cinema_name", ""),
                "seat_number": t["seat_number"],
                "price": float(t["price"]),
                "show_time": t["show_time"].strftime("%Y-%m-%d %H:%M")
                if isinstance(t["show_time"], datetime)
                else str(t["show_time"]),
                "buy_time": t["buy_time"].strftime("%Y-%m-%d %H:%M")
                if isinstance(t["buy_time"], datetime)
                else str(t["buy_time"]),
                "status": t["status"]
            })
        return jsonify(result)
    finally:
        conn.close()


@app.route('/api/favorite/list', methods=['GET'])
def get_favorite_list():
    user_id = request.args.get("user_id", "")
    if not user_id:
        return jsonify({"error": "user_id 参数必填"}), 400

    conn, cur = get_db_connection()
    try:
        cur.execute("""
            SELECT f.favorite_id, f.create_time,
                   m.movie_id, m.movie_name, m.genre, m.duration, m.poster_url
            FROM favorite f
            JOIN movie m ON f.movie_id = m.movie_id
            WHERE f.user_id = %s
            ORDER BY f.create_time DESC
        """, (user_id,))
        rows = cur.fetchall()
        result = []
        for r in rows:
            result.append({
                "favorite_id": r["favorite_id"],
                "movie_id": r["movie_id"],
                "movie_name": r["movie_name"],
                "genre": r["genre"],
                "duration": r["duration"],
                "poster_url": r["poster_url"],
                "create_time": r["create_time"].strftime("%Y-%m-%d %H:%M")
                if isinstance(r["create_time"], datetime)
                else str(r["create_time"])
            })
        return jsonify(result)
    finally:
        conn.close()


@app.route('/api/user/change-password', methods=['POST'])
def change_password():
    data = request.get_json()
    user_id = data.get("user_id", "")
    if not user_id:
        return jsonify({"error": "user_id 参数必填"}), 400
    old_pwd = data.get("oldPwd", "")
    new_pwd = data.get("newPwd", "")

    if not old_pwd or not new_pwd:
        return jsonify({"error": "密码不能为空"}), 400
    if len(new_pwd) < 6:
        return jsonify({"error": "新密码至少6位"}), 400

    conn, cur = get_db_connection()
    try:
        cur.execute("SELECT password FROM user WHERE user_id = %s", (user_id,))
        user = cur.fetchone()
        if not user:
            return jsonify({"error": "用户不存在"}), 404

        stored = user["password"]
        is_valid = check_password_hash(stored, old_pwd) if stored.startswith(("pbkdf2:", "scrypt:", "bcrypt:")) else stored == old_pwd
        if not is_valid:
            return jsonify({"error": "原始密码错误"}), 400

        cur.execute("UPDATE user SET password = %s WHERE user_id = %s",
                    (generate_password_hash(new_pwd), user_id))
        conn.commit()
        return jsonify({"message": "密码修改成功"})
    finally:
        conn.close()


@app.route('/api/movie/dates', methods=['GET'])
def get_movie_dates():
    conn, cur = get_db_connection()
    try:
        cur.execute(
            """SELECT DISTINCT DATE(show_time) AS show_date FROM ticket
               ORDER BY show_date LIMIT 3"""
        )
        dates = [row["show_date"].strftime("%Y-%m-%d") for row in cur.fetchall()]
        return jsonify(dates)
    finally:
        conn.close()


@app.route('/api/movie/list', methods=['GET'])
def get_movie_list():
    date_str = request.args.get("date", "")
    conn, cur = get_db_connection()
    try:
        cur.execute(
            """SELECT DISTINCT m.movie_id, m.movie_name, m.genre, m.duration,
                      m.poster_url, m.release_date
               FROM movie m
               JOIN schedule s ON m.movie_id = s.movie_id
               WHERE s.show_date = %s""",
            (date_str,)
        )
        movies = cur.fetchall()
        result = []
        for m in movies:
            cur.execute(
                """SELECT s.schedule_id, s.show_time, s.price, s.available_seats,
                          c.cinema_name, c.cinema_id
                   FROM schedule s
                   JOIN cinema c ON s.cinema_id = c.cinema_id
                   WHERE s.movie_id = %s AND s.show_date = %s
                   ORDER BY s.show_time""",
                (m["movie_id"], date_str)
            )
            schedules = [
                {
                    "schedule_id": s["schedule_id"],
                    "time": s["show_time"].strftime("%H:%M") if isinstance(s["show_time"], datetime) else str(s["show_time"])[:5],
                    "cinema_name": s["cinema_name"],
                    "cinema_id": s["cinema_id"],
                    "price": float(s["price"]),
                    "available_seats": s["available_seats"]
                }
                for s in cur.fetchall()
            ]
            result.append({
                "movie_id": m["movie_id"],
                "movie_name": m["movie_name"],
                "genre": m["genre"],
                "duration": m["duration"],
                "release_date": m["release_date"].strftime("%Y-%m-%d") if isinstance(m["release_date"], datetime) else str(m["release_date"]),
                "schedules": schedules
            })
        return jsonify(result)
    finally:
        conn.close()


@ app.route('/api/cinema/list', methods=['GET'])
def get_cinema_list():
    conn, cur = get_db_connection()
    try:
        cur.execute("SELECT cinema_id, cinema_name, address, type FROM cinema")
        cinemas = cur.fetchall()
        result = [{
            "cinema_id": c["cinema_id"],
            "cinema_name": c["cinema_name"],
            "address": c["address"],
            "type": c["type"]
        } for c in cinemas]
        return jsonify(result)
    finally:
        conn.close()


@ app.route('/api/cinema/types', methods=['GET'])
def get_cinema_types():
    conn, cur = get_db_connection()
    try:
        cur.execute("SELECT DISTINCT type FROM cinema WHERE type IS NOT NULL")
        types = [row["type"] for row in cur.fetchall()]
        return jsonify(types)
    finally:
        conn.close()


@app.route('/api/cinema/search', methods=['GET'])
def search_cinema():
    date = request.args.get("date", "")
    cinema_id = request.args.get("cinema_id", "")
    hall_type = request.args.get("type", "")

    conn, cur = get_db_connection()
    try:
        conditions = []
        params = []
        if date:
            conditions.append("s.show_date = %s")
            params.append(date)
        if cinema_id:
            conditions.append("c.cinema_id = %s")
            params.append(cinema_id)
        if hall_type:
            conditions.append("c.type = %s")
            params.append(hall_type)

        if not date:
            conditions.append("s.show_date >= CURDATE()")
        where = " AND ".join(conditions) if conditions else "1=1"

        cur.execute(f"""
            SELECT DISTINCT c.cinema_id, c.cinema_name, c.address, c.type
            FROM cinema c
            JOIN schedule s ON c.cinema_id = s.cinema_id
            WHERE {where}
            ORDER BY c.cinema_id
        """, params)
        cinemas = cur.fetchall()

        result = []
        for c in cinemas:
            movie_params = [c["cinema_id"]]
            movie_where = ""
            if date:
                movie_where = "AND s.show_date = %s"
                movie_params.append(date)

            cur.execute(f"""
                SELECT m.movie_name, m.genre, m.duration, m.poster_url,
                       s.show_time, s.price, s.available_seats
                FROM schedule s
                JOIN movie m ON s.movie_id = m.movie_id
                WHERE s.cinema_id = %s {movie_where}
                ORDER BY s.show_time
            """, movie_params)
            schedules = cur.fetchall()

            movies = []
            for s in schedules:
                movies.append({
                    "movie_name": s["movie_name"],
                    "genre": s["genre"],
                    "duration": s["duration"],
                    "poster_url": s["poster_url"],
                    "show_time": s["show_time"].strftime("%H:%M") if isinstance(s["show_time"], datetime) else str(s["show_time"])[:5],
                    "price": float(s["price"]),
                    "available_seats": s["available_seats"]
                })

            if not movies:
                continue

            result.append({
                "cinema_id": c["cinema_id"],
                "cinema_name": c["cinema_name"],
                "address": c["address"],
                "type": c["type"],
                "movies": movies
            })

        return jsonify(result)
    finally:
        conn.close()


@app.route('/api/cinema/detail', methods=['GET'])
def get_cinema_detail():
    cinema_id = request.args.get("cinema_id", "")
    date_filter = request.args.get("date", "")
    if not cinema_id:
        return jsonify({"error": "cinema_id 参数必填"}), 400

    conn, cur = get_db_connection()
    try:
        cur.execute(
            "SELECT cinema_id, cinema_name, address, type FROM cinema WHERE cinema_id = %s",
            (cinema_id,)
        )
        cinema = cur.fetchone()
        if not cinema:
            return jsonify({"error": "影院不存在"}), 404

        # 获取该影院所有上映电影的信息
        cur.execute("""
            SELECT DISTINCT m.movie_id, m.movie_name, m.genre, m.duration, m.poster_url,
                   m.director, m.actors, m.description
            FROM movie m
            JOIN schedule s ON m.movie_id = s.movie_id
            WHERE s.cinema_id = %s AND s.show_date >= CURDATE()
            ORDER BY m.movie_id
        """, (cinema_id,))
        movies_raw = cur.fetchall()

        # 获取可用日期
        cur.execute("""
            SELECT DISTINCT show_date FROM schedule
            WHERE cinema_id = %s AND show_date >= CURDATE()
            ORDER BY show_date LIMIT 7
        """, (cinema_id,))
        dates = []
        for row in cur.fetchall():
            d = row["show_date"]
            if isinstance(d, datetime):
                d = d.date()
            dates.append(d.strftime("%Y-%m-%d"))

        # 场次（按日期过滤）
        schedule_date = date_filter if date_filter else (dates[0] if dates else '')
        schedules = []
        if schedule_date:
            cur.execute("""
                SELECT m.movie_id, m.movie_name, m.genre, m.duration, m.poster_url,
                       s.schedule_id, s.show_time, s.price, s.available_seats, s.language
                FROM schedule s
                JOIN movie m ON s.movie_id = m.movie_id
                WHERE s.cinema_id = %s AND s.show_date = %s
                ORDER BY s.show_time
            """, (cinema_id, schedule_date))
            for s in cur.fetchall():
                time_str = str(s["show_time"])
                if isinstance(s["show_time"], datetime):
                    time_str = s["show_time"].strftime("%H:%M")
                elif ':' in time_str:
                    parts = time_str.split(':')
                    time_str = parts[0].zfill(2) + ':' + parts[1].zfill(2)
                else:
                    time_str = time_str[:5]

                schedules.append({
                    "movie_id": s["movie_id"],
                    "movie_name": s["movie_name"],
                    "genre": s["genre"],
                    "duration": s["duration"],
                    "poster_url": s["poster_url"],
                    "schedule_id": s["schedule_id"],
                    "show_time": time_str,
                    "price": float(s["price"]),
                    "available_seats": s["available_seats"],
                    "language": s["language"] or ''
                })

        movies_list = []
        for m in movies_raw:
            movies_list.append({
                "movie_id": m["movie_id"],
                "movie_name": m["movie_name"],
                "genre": m["genre"],
                "duration": m["duration"],
                "poster_url": m["poster_url"],
                "director": m["director"],
                "actors": m["actors"],
                "description": m["description"]
            })

        return jsonify({
            "cinema_id": cinema["cinema_id"],
            "cinema_name": cinema["cinema_name"],
            "address": cinema["address"],
            "type": cinema["type"],
            "movies": movies_list,
            "dates": dates,
            "schedules": schedules
        })
    finally:
        conn.close()


@app.route('/api/movie/all', methods=['GET'])
def get_all_movies():
    conn, cur = get_db_connection()
    try:
        cur.execute("""
            SELECT m.movie_id, m.movie_name, m.director, m.actors, m.genre,
                   m.duration, m.poster_url, m.release_date, m.description,
                   COALESCE(AVG(r.rating), 0) AS avg_rating,
                   COUNT(r.review_id) AS review_count
            FROM movie m
            LEFT JOIN review r ON m.movie_id = r.movie_id
            GROUP BY m.movie_id
            ORDER BY m.movie_id
        """)
        movies = cur.fetchall()
        result = []
        for m in movies:
            result.append({
                "movie_id": m["movie_id"],
                "movie_name": m["movie_name"],
                "director": m["director"],
                "actors": m["actors"],
                "genre": m["genre"],
                "duration": m["duration"],
                "poster_url": m["poster_url"],
                "release_date": m["release_date"].strftime("%Y-%m-%d") if isinstance(m["release_date"], datetime) else str(m["release_date"]),
                "description": m["description"],
                "rating": round(float(m["avg_rating"]), 1),
                "review_count": m["review_count"]
            })
        return jsonify(result)
    finally:
        conn.close()


@app.route('/api/movie/boxoffice', methods=['GET'])
def get_movie_boxoffice():
    conn, cur = get_db_connection()
    try:
        cur.execute("""
            SELECT m.movie_id, m.movie_name,
                   COALESCE(SUM(t.price), 0) AS total_revenue,
                   COUNT(t.ticket_id) AS ticket_count
            FROM movie m
            LEFT JOIN ticket t ON m.movie_id = t.movie_id
            GROUP BY m.movie_id, m.movie_name
            ORDER BY total_revenue DESC
        """)
        result = [{
            "movie_id": row["movie_id"],
            "movie_name": row["movie_name"],
            "total_revenue": float(row["total_revenue"]),
            "ticket_count": row["ticket_count"]
        } for row in cur.fetchall()]
        return jsonify(result)
    finally:
        conn.close()


@app.route('/api/movie/showtimes', methods=['GET'])
def get_movie_showtimes():
    movie_id = request.args.get("movie_id", "")
    date = request.args.get("date", "")
    if not movie_id or not date:
        return jsonify({"error": "movie_id 和 date 参数必填"}), 400

    conn, cur = get_db_connection()
    try:
        cur.execute("""
            SELECT s.schedule_id, s.show_time, s.price, s.available_seats,
                   c.cinema_id, c.cinema_name, c.type AS cinema_type
            FROM schedule s
            JOIN cinema c ON s.cinema_id = c.cinema_id
            WHERE s.movie_id = %s AND s.show_date = %s
            ORDER BY s.show_time
        """, (movie_id, date))
        rows = cur.fetchall()

        cur.execute("SELECT duration FROM movie WHERE movie_id = %s", (movie_id,))
        movie_row = cur.fetchone()
        duration = movie_row["duration"] if movie_row else 120

        result = []
        for s in rows:
            time_str = str(s["show_time"])
            # TIME 类型返回 timedelta，格式化 HH:MM
            if isinstance(s["show_time"], datetime):
                time_str = s["show_time"].strftime("%H:%M")
            else:
                time_str = str(s["show_time"])
                if ':' in time_str:
                    parts = time_str.split(':')
                    time_str = parts[0].zfill(2) + ':' + parts[1].zfill(2)
                else:
                    time_str = time_str[:5]

            # 计算散场时间
            parts = time_str.split(':')
            start_min = int(parts[0]) * 60 + int(parts[1])
            end_min = start_min + duration
            end_h = (end_min // 60) % 24
            end_m = end_min % 60
            end_time = str(end_h).zfill(2) + ':' + str(end_m).zfill(2)

            result.append({
                "schedule_id": s["schedule_id"],
                "time": time_str,
                "end_time": end_time,
                "price": float(s["price"]),
                "available_seats": s["available_seats"],
                "cinema_id": s["cinema_id"],
                "cinema_name": s["cinema_name"],
                "cinema_type": s["cinema_type"]
            })
        return jsonify(result)
    finally:
        conn.close()


@app.route('/api/movie/dates_all', methods=['GET'])
def get_movie_dates_all():
    conn, cur = get_db_connection()
    try:
        cur.execute("""
            SELECT DISTINCT show_date FROM schedule
            WHERE show_date >= CURDATE() + INTERVAL 1 DAY
            ORDER BY show_date LIMIT 5
        """)
        dates = []
        for row in cur.fetchall():
            d = row["show_date"]
            if isinstance(d, datetime):
                d = d.date()
            dates.append(d.strftime("%Y-%m-%d"))
        return jsonify(dates)
    finally:
        conn.close()


@app.route('/api/user/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get("username", "")
    password = data.get("password", "")
    phone = data.get("phone", "")
    email = data.get("email", "")

    if not username or not password:
        return jsonify({"error": "用户名和密码不能为空"}), 400
    if len(password) < 6:
        return jsonify({"error": "密码至少6位"}), 400

    conn, cur = get_db_connection()
    try:
        cur.execute("SELECT user_id FROM user WHERE user_name = %s", (username,))
        if cur.fetchone():
            return jsonify({"error": "用户名已存在"}), 400

        # user_id 无 AUTO_INCREMENT，手动计算
        cur.execute("SELECT COALESCE(MAX(user_id), 1000) + 1 AS next_id FROM user")
        new_id = cur.fetchone()["next_id"]

        hashed = generate_password_hash(password)
        cur.execute(
            "INSERT INTO user (user_id, user_name, password, phone, email, register_time, status) VALUES (%s, %s, %s, %s, %s, NOW(), '1')",
            (new_id, username, hashed, phone, email)
        )
        conn.commit()

        return jsonify({
            "user_id": new_id,
            "user_name": username,
            "phone": phone,
            "email": email,
            "message": "注册成功"
        })
    finally:
        conn.close()


@app.route('/api/ticket/create', methods=['POST'])
def create_ticket():
    data = request.get_json()
    user_id = data.get("user_id", "")
    schedule_id = data.get("schedule_id", "")
    seat_number = data.get("seat_number", "")

    if not user_id or not schedule_id or not seat_number:
        return jsonify({"error": "参数不完整"}), 400

    conn, cur = get_db_connection()
    try:
        cur.execute("""SELECT s.*, m.movie_name, c.cinema_name
                FROM schedule s
                JOIN movie m ON s.movie_id = m.movie_id
                JOIN cinema c ON s.cinema_id = c.cinema_id
                WHERE s.schedule_id = %s""", (schedule_id,))
        schedule = cur.fetchone()
        if not schedule:
            return jsonify({"error": "场次不存在"}), 404
        if schedule["available_seats"] <= 0:
            return jsonify({"error": "座位已满"}), 400

        # 检查是否已购此座位（ticket表无schedule_id，通过movie+cinema+time匹配）
        show_time_raw = schedule["show_time"]
        if isinstance(show_time_raw, timedelta):
            show_time_dt = datetime.combine(schedule["show_date"], (datetime.min + show_time_raw).time())
        else:
            show_time_dt = datetime.datetime.combine(schedule["show_date"], show_time_raw)
        cur.execute("""SELECT ticket_id FROM ticket
                WHERE movie_id = %s AND cinema_id = %s
                AND show_time = %s AND seat_number = %s
                AND status IN ('已支付','已出票')""",
                    (schedule["movie_id"], schedule["cinema_id"], show_time_dt, seat_number))
        if cur.fetchone():
            return jsonify({"error": "该座位已被购买"}), 400

        # 创建票务
        cur.execute("SELECT COALESCE(MAX(ticket_id), 0) + 1 AS next_id FROM ticket")
        ticket_next_id = cur.fetchone()["next_id"]
        cur.execute("""INSERT INTO ticket (ticket_id, user_id, movie_id, cinema_id, seat_number, price, show_time, buy_time, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), '已支付')""",
                    (ticket_next_id, user_id, schedule["movie_id"], schedule["cinema_id"],
                     seat_number, float(schedule["price"]), show_time_dt))
        # 扣减座位
        cur.execute("UPDATE schedule SET available_seats = available_seats - 1 WHERE schedule_id = %s", (schedule_id,))
        conn.commit()

        return jsonify({
            "ticket_id": ticket_next_id,
            "message": "购票成功",
            "seat_number": seat_number,
            "price": float(schedule["price"]),
            "movie_name": schedule["movie_name"],
            "cinema_name": schedule["cinema_name"],
            "show_time": show_time_dt.strftime("%Y-%m-%d %H:%M")
        })
    finally:
        conn.close()


@app.route('/api/ticket/refund', methods=['POST'])
def refund_ticket():
    data = request.get_json()
    ticket_id = data.get("ticket_id", "")
    if not ticket_id:
        return jsonify({"error": "ticket_id 参数必填"}), 400

    conn, cur = get_db_connection()
    try:
        cur.execute("SELECT * FROM ticket WHERE ticket_id = %s", (ticket_id,))
        ticket = cur.fetchone()
        if not ticket:
            return jsonify({"error": "票务不存在"}), 404
        if ticket["status"] != "已支付":
            return jsonify({"error": "该票务状态不允许退票"}), 400

        # 更新 ticket 状态
        cur.execute("UPDATE ticket SET status = '已退款' WHERE ticket_id = %s", (ticket_id,))

        # 插入 refund 记录
        cur.execute("SELECT COALESCE(MAX(refund_id), 0) + 1 AS next_id FROM refund")
        refund_id = cur.fetchone()["next_id"]
        cur.execute("""
            INSERT INTO refund (refund_id, movie_id, user_id, cinema_id, amount, show_time, refund_time, status)
            VALUES (%s, %s, %s, %s, %s, %s, NOW(), '已通过')
        """, (refund_id, ticket["movie_id"], ticket["user_id"], ticket["cinema_id"],
              float(ticket["price"]), ticket["show_time"]))
        conn.commit()
        return jsonify({"message": "退票成功"})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


@app.route('/api/favorite/add', methods=['POST'])
def add_favorite():
    data = request.get_json()
    user_id = data.get("user_id", "")
    movie_id = data.get("movie_id", "")
    if not user_id or not movie_id:
        return jsonify({"error": "参数不完整"}), 400

    conn, cur = get_db_connection()
    try:
        cur.execute("SELECT favorite_id FROM favorite WHERE user_id = %s AND movie_id = %s", (user_id, movie_id))
        if cur.fetchone():
            return jsonify({"error": "已收藏"}), 400
        cur.execute("INSERT INTO favorite (user_id, movie_id, create_time) VALUES (%s, %s, NOW())", (user_id, movie_id))
        conn.commit()
        return jsonify({"message": "收藏成功", "favorite_id": cur.lastrowid})
    finally:
        conn.close()


@app.route('/api/favorite/remove', methods=['POST'])
def remove_favorite():
    data = request.get_json()
    user_id = data.get("user_id", "")
    movie_id = data.get("movie_id", "")
    if not user_id or not movie_id:
        return jsonify({"error": "参数不完整"}), 400

    conn, cur = get_db_connection()
    try:
        cur.execute("DELETE FROM favorite WHERE user_id = %s AND movie_id = %s", (user_id, movie_id))
        conn.commit()
        if cur.rowcount > 0:
            return jsonify({"message": "取消收藏成功"})
        return jsonify({"error": "未收藏该电影"}), 404
    finally:
        conn.close()


@app.route('/api/review/create', methods=['POST'])
def create_review():
    data = request.get_json()
    user_id = data.get("user_id", "")
    movie_id = data.get("movie_id", "")
    rating = data.get("rating", 0)
    content = data.get("content", "")

    if not user_id or not movie_id:
        return jsonify({"error": "参数不完整"}), 400
    if not content:
        return jsonify({"error": "评论内容不能为空"}), 400
    if not isinstance(rating, int) or rating < 1 or rating > 5:
        return jsonify({"error": "评分需在1-5之间"}), 400

    conn, cur = get_db_connection()
    try:
        cur.execute("SELECT COALESCE(MAX(review_id), 0) + 1 AS next_id FROM review")
        next_id = cur.fetchone()["next_id"]
        cur.execute("""INSERT INTO review (review_id, movie_id, cinema_id, user_id, content, rating, create_time, status)
                VALUES (%s, %s, NULL, %s, %s, %s, NOW(), '1')""",
                    (next_id, movie_id, user_id, content, rating))
        conn.commit()
        return jsonify({"message": "评论成功", "review_id": next_id})
    finally:
        conn.close()


@app.route('/api/review/list', methods=['GET'])
def get_reviews():
    movie_id = request.args.get("movie_id", "")
    if not movie_id:
        return jsonify({"error": "movie_id 参数必填"}), 400

    conn, cur = get_db_connection()
    try:
        cur.execute("""SELECT r.*, u.user_name
                FROM review r
                LEFT JOIN user u ON r.user_id = u.user_id
                WHERE r.movie_id = %s AND r.status = '1'
                ORDER BY r.create_time DESC""", (movie_id,))
        rows = cur.fetchall()
        result = []
        for r in rows:
            result.append({
                "review_id": r["review_id"],
                "user_id": r["user_id"],
                "user_name": r.get("user_name", ""),
                "movie_id": r["movie_id"],
                "rating": r["rating"],
                "content": r["content"],
                "create_time": r["create_time"].strftime("%Y-%m-%d %H:%M")
                if isinstance(r["create_time"], datetime)
                else str(r["create_time"])
            })
        return jsonify(result)
    finally:
        conn.close()


@app.route('/api/movie/search', methods=['GET'])
def search_movie():
    keyword = request.args.get("keyword", "")
    if not keyword:
        return jsonify({"error": "keyword 参数必填"}), 400

    conn, cur = get_db_connection()
    try:
        cur.execute("""
            SELECT m.movie_id, m.movie_name, m.director, m.actors, m.genre,
                   m.duration, m.poster_url, m.release_date, m.description,
                   COALESCE(AVG(r.rating), 0) AS avg_rating,
                   COUNT(r.review_id) AS review_count
            FROM movie m
            LEFT JOIN review r ON m.movie_id = r.movie_id
            WHERE m.movie_name LIKE %s
            GROUP BY m.movie_id
            ORDER BY m.movie_id
        """, ('%' + keyword + '%',))
        movies = cur.fetchall()
        result = []
        for m in movies:
            result.append({
                "movie_id": m["movie_id"],
                "movie_name": m["movie_name"],
                "director": m["director"],
                "actors": m["actors"],
                "genre": m["genre"],
                "duration": m["duration"],
                "poster_url": m["poster_url"],
                "release_date": m["release_date"].strftime("%Y-%m-%d") if isinstance(m["release_date"], datetime) else str(m["release_date"]),
                "description": m["description"],
                "rating": round(float(m["avg_rating"]), 1),
                "review_count": m["review_count"]
            })
        return jsonify(result)
    finally:
        conn.close()


@app.route('/api/schedule/seats', methods=['GET'])
def get_schedule_seats():
    schedule_id = request.args.get("schedule_id", "")
    if not schedule_id:
        return jsonify({"error": "schedule_id 参数必填"}), 400

    conn, cur = get_db_connection()
    try:
        cur.execute("""SELECT s.*, m.movie_name, m.duration, m.genre, m.poster_url,
                       c.cinema_name, c.address, c.type AS cinema_type
                FROM schedule s
                JOIN movie m ON s.movie_id = m.movie_id
                JOIN cinema c ON s.cinema_id = c.cinema_id
                WHERE s.schedule_id = %s""", (schedule_id,))
        schedule = cur.fetchone()
        if not schedule:
            return jsonify({"error": "场次不存在"}), 404

        # 获取已被占用的座位（ticket 表无 schedule_id，通过 movie+cinema+time 匹配）
        show_time_raw = schedule["show_time"]
        if isinstance(show_time_raw, timedelta):
            show_time_dt = datetime.combine(schedule["show_date"], (datetime.min + show_time_raw).time())
        else:
            show_time_dt = datetime.datetime.combine(schedule["show_date"], show_time_raw)
        cur.execute("""SELECT seat_number FROM ticket
                WHERE movie_id = %s AND cinema_id = %s
                AND show_time = %s AND status IN ('已支付','已出票')""",
                    (schedule["movie_id"], schedule["cinema_id"], show_time_dt))
        taken_seats = [row["seat_number"] for row in cur.fetchall()]

        # 总座位数（假设 8行×10列 = 80座）
        total_seats = 80
        rows_config = 8
        cols_config = 10

        time_str = str(schedule["show_time"])
        if isinstance(schedule["show_time"], datetime):
            time_str = schedule["show_time"].strftime("%H:%M")
        elif ':' in time_str:
            parts = time_str.split(':')
            time_str = parts[0].zfill(2) + ':' + parts[1].zfill(2)

        return jsonify({
            "schedule_id": schedule["schedule_id"],
            "movie_name": schedule["movie_name"],
            "cinema_name": schedule["cinema_name"],
            "cinema_address": schedule["address"],
            "cinema_type": schedule["cinema_type"],
            "genre": schedule["genre"],
            "duration": schedule["duration"],
            "poster_url": schedule["poster_url"],
            "show_date": schedule["show_date"].strftime("%Y-%m-%d") if isinstance(schedule["show_date"], datetime) else str(schedule["show_date"]),
            "show_time": time_str,
            "price": float(schedule["price"]),
            "available_seats": schedule["available_seats"],
            "total_seats": total_seats,
            "rows": rows_config,
            "cols": cols_config,
            "taken_seats": taken_seats
        })
    finally:
        conn.close()


if __name__ == '__main__':
    init_db()
    port = int(os.environ.get('PORT', 5000))
    print(f"[app] Using {'MySQL' if not using_sqlite() else 'SQLite'} database, port={port}")
    app.run(host='0.0.0.0', port=port, debug=False)
