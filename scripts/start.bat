@echo off
setlocal
chcp 65001 >nul
title ListMaster LAN Server

set "ROOT_DIR=%~dp0.."
cd /d "%ROOT_DIR%"

echo ==============================================================
echo              HE THONG QUAN LY MAU THU LISTMASTER
echo ==============================================================
echo.

rem Kiem tra Node.js tren he thong hoac runtime portable
set "NODE_CMD="

if exist "%ROOT_DIR%\runtime\node\node-v22.14.0-win-x64\node.exe" (
    set "NODE_CMD=%ROOT_DIR%\runtime\node\node-v22.14.0-win-x64\node.exe"
) else (
    where node >nul 2>&1
    if not errorlevel 1 set "NODE_CMD=node"
)

if "%NODE_CMD%"=="" (
    echo.
    echo ==============================================================
    echo [LOI] Khong tim thay Node.js tren he thong va trong thu muc runtime!
    echo Vui long cai dat Node.js hoac giai nen Node.js vao:
    echo   %ROOT_DIR%\runtime\node\
    echo ==============================================================
    echo.
    pause
    exit /b 1
)

"%NODE_CMD%" "%ROOT_DIR%\scripts\check-runtime.cjs"
if errorlevel 1 (
    pause
    exit /b 1
)

cd /d "%ROOT_DIR%\backend"

if not exist "dist\main.js" (
    echo [LOI] Chua co backend build. Vui long build du an truoc khi chay.
    pause
    exit /b 1
)

if not exist "..\frontend\dist\index.html" (
    echo [LOI] Chua co frontend build. Vui long build du an truoc khi chay.
    pause
    exit /b 1
)

rem Doc cong tu cung cau hinh ma backend su dung
set "SERVER_PORT="
for /f "delims=" %%P in ('call "%NODE_CMD%" -p "require('./dist/config/config').config.server.port"') do set "SERVER_PORT=%%P"
if not defined SERVER_PORT (
    echo [LOI] Khong doc duoc cau hinh server. Kiem tra file cau hinh va dependencies.
    pause
    exit /b 1
)

echo Danh sach dia chi IP cua may nay trong mang:
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    for /f "tokens=1" %%b in ("%%a") do (
        echo   -^> http://%%b:%SERVER_PORT%
    )
)
echo.
echo --------------------------------------------------------------
echo Dang khoi dong ListMaster Server (Port %SERVER_PORT%)...
echo De tat server: Chi can tat cua so CMD nay.
echo --------------------------------------------------------------
echo.

"%NODE_CMD%" dist/main.js

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [LOI] Server bi dung dot ngot voi ma loi: %ERRORLEVEL%
    pause
)
