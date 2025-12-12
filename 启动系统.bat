@echo off
:: 解决中文乱码
chcp 65001 >nul

echo ==========================================
echo      正在启动广告工厂 ERP 系统 (强制版)...
echo ==========================================

echo.
echo [1/3] 请确保你已经手动打开了 Docker Desktop (看到右下角小鲸鱼)
echo       如果没有打开，请现在手动去双击桌面的 Docker Desktop 图标。
echo.
echo       按任意键继续启动服务...
pause >nul

echo.
echo [2/3] 正在构建并启动服务...
:: 强制重新构建并启动，显示详细日志
docker-compose up -d --build

echo.
echo [3/3] 正在打开浏览器...
start http://localhost:3000

echo.
echo ==========================================
echo      执行完毕！
echo      如果上面没有出现红色的 Error，
echo      浏览器应该已经打开了。
echo ==========================================
pause