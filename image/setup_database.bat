@echo off
chcp 65001 >nul
title 电影购票管理系统 - 数据库初始化

echo ========================================
echo   电影购票管理系统 - 数据库初始化
echo ========================================
echo.
echo 此脚本将创建 cinema2 数据库并导入初始数据。
echo.
echo 前置条件：
echo   1. 已安装 MySQL Server
echo   2. 有 MySQL root 账号密码
echo.
echo 如果 MySQL 安装路径不是默认路径，请先修改下方 PATH 变量。
echo ========================================
echo.

:: ===== 配置区 =====
:: 如果 MySQL 安装在不同路径，修改这里
set MYSQL_PATH=C:\Program Files\MySQL\MySQL Server 8.0\bin
:: ==================

set SQL_FILE=%~dp0cinema2_backup_20260524.sql

if not exist "%SQL_FILE%" (
    echo [错误] 找不到 %SQL_FILE%
    echo 请确保 cinema2_backup_20260524.sql 与此脚本在同一目录下。
    pause
    exit /b 1
)

echo 正在导入数据库，请输入 MySQL root 密码...
"%MYSQL_PATH%\mysql.exe" -u root -p < "%SQL_FILE%"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [失败] 导入出错，请检查：
    echo   1. MySQL 服务是否已启动
    echo   2. root 密码是否正确
    echo   3. MySQL 安装路径是否与上方 ^"配置区^" 一致
    pause
    exit /b 1
)

echo.
echo [成功] 数据库初始化完成！
echo.
echo 接下来请：
echo   1. 打开 config.py，确认数据库密码已修改为你的密码
echo   2. 运行 python app.py 启动服务器
echo   3. 访问 http://localhost:5000
echo.
pause
