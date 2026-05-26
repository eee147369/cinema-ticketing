from flask import Flask, jsonify
from flask_cors import CORS
import pymysql

app = Flask(__name__)
CORS(app)  

DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "zwq123123",
    "database": "cinema2",
}

def get_db_connection():
    conn = pymysql.connect(
        host=DB_CONFIG["host"],
        user=DB_CONFIG["user"],
        password=DB_CONFIG["password"],
        database=DB_CONFIG["database"],
        charset="utf8mb4"
    )
    return conn

@app.route('/api/user/info', methods=['GET'])
def get_user_info():
    conn = get_db_connection()
    cursor = conn.cursor(pymysql.cursors.DictCursor)

   
    sql = """
        SELECT user_id, user_name, phone, email, register_time
        FROM user
        WHERE user_id = %s
    """
    cursor.execute(sql,(1001))
    user = cursor.fetchone()

    cursor.close()
    conn.close()

    if not user:
        return jsonify({"error": "用户不存在"}), 404

    return jsonify({
        "user_id": user["user_id"],
        "user_name": user["user_name"],
        "phone": user["phone"],
        "email": user["email"],
        "register_time": str(user["register_time"])
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)