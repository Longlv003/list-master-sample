@echo off
setlocal
set "ROOT_DIR=%~dp0.."
set "RUNTIME_DIR=%ROOT_DIR%\runtime\node\node-v22.14.0-win-x64"
if not exist "%RUNTIME_DIR%\node.exe" (
    echo [ERROR] Bundled Node.js 22.14.0 runtime is missing.
    exit /b 1
)
set "PATH=%RUNTIME_DIR%;%PATH%"
cd /d "%ROOT_DIR%"
"%RUNTIME_DIR%\node.exe" scripts/check-runtime.cjs
if errorlevel 1 exit /b 1
call "%RUNTIME_DIR%\npm.cmd" run build
exit /b %ERRORLEVEL%
