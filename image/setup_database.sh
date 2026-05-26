#!/bin/bash
# 电影购票管理系统 - 数据库初始化脚本 (macOS/Linux)
# 使用: bash setup_database.sh

echo "========================================"
echo "  电影购票管理系统 - 数据库初始化"
echo "========================================"
echo ""

MYSQL=$(which mysql 2>/dev/null)
if [ -z "$MYSQL" ]; then
    echo "[错误] 未找到 mysql 命令，请先安装 MySQL Client"
    exit 1
fi

SQL_DIR="$(cd "$(dirname "$0")" && pwd)"
SQL_FILE="$SQL_DIR/cinema2_backup_20260524.sql"

if [ ! -f "$SQL_FILE" ]; then
    echo "[错误] 找不到 $SQL_FILE"
    exit 1
fi

echo "正在导入数据库，请输入 MySQL root 密码..."
"$MYSQL" -u root -p < "$SQL_FILE"

if [ $? -ne 0 ]; then
    echo ""
    echo "[失败] 导入出错，请检查 MySQL 服务是否已启动、root 密码是否正确"
    exit 1
fi

echo ""
echo "[成功] 数据库初始化完成！"
echo ""
echo "接下来请："
echo "  1. 打开 config.py，确认数据库密码已修改为你的密码"
echo "  2. 运行 python app.py 启动服务器"
echo "  3. 访问 http://localhost:5000"
echo ""
