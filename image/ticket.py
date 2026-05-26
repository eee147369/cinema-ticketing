from flask import Flask, jsonify, request
from flask_cors import CORS
import pymysql

app = Flask(__name__)
CORS(app)  

# 数据库连接配置
db_config = {
    "host": "localhost",
    "user": "root",      
    "password": "zwq123123",     
    "database": "cinema2"
}

# 数据库连接工具函数
def get_db_connection():
    conn = pymysql.connect(**db_config)
    return conn, conn.cursor(cursor=pymysql.cursors.DictCursor)

# ------------------- 接口1：获取用户信息 -------------------
@app.route('/api/user/info', methods=['GET'])
def get_user_info():
    # 这里你可以根据session获取当前登录用户，我先用固定user_id演示
    user_id = 1  # 实际项目中改成从session或token获取当前用户ID

    conn, cur = get_db_connection()
    sql = "SELECT user_id, user_name, phone, email, register_time FROM user WHERE user_id = %s"
    cur.execute(sql, (user_id,))
    user = cur.fetchone()
    conn.close()

    if user:
        return jsonify({
            "user_id": user["user_id"],
            "user_name": user["user_name"],
            "phone": user["phone"],
            "email": user["email"],
            "register_time": user["register_time"].strftime("%Y-%m-%d %H:%M:%S")
        })
    else:
        return jsonify({"error": "用户不存在"}), 404

# ------------------- 接口2：获取当前用户的所有购票记录 -------------------
@app.route('/api/ticket/all', methods=['GET'])
def get_all_tickets():
    # 实际项目中改成从session或token获取当前用户ID
    user_id = 1

    conn, cur = get_db_connection()
    # 从ticket表查询当前用户的所有票
    sql = """
        SELECT price, status, buy_time, seat_number, show_time
        FROM ticket
        WHERE user_id = %s
    """
    cur.execute(sql, (user_id,))
    tickets = cur.fetchall()
    conn.close()

    # 格式化时间字段
    result = []
    for t in tickets:
        result.append({
            "price": float(t["price"]),
            "status": t["status"],
            "buy_time": t["buy_time"].strftime("%Y-%m-%d %H:%M:%S"),
            "seat_number": t["seat_number"],
            "show_time": t["show_time"].strftime("%Y-%m-%d %H:%M:%S")
        })

    return jsonify(result)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)