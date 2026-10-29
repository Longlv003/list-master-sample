@echo off
setlocal
set "ROOT_DIR=%~dp0.."
set "NODE_CMD=%ROOT_DIR%\runtime\node\node-v22.14.0-win-x64\node.exe"
if not exist "%NODE_CMD%" set "NODE_CMD=node"
"%NODE_CMD%" "%ROOT_DIR%\scripts\check-runtime.cjs"
if errorlevel 1 exit /b 1
"%NODE_CMD%" "%ROOT_DIR%\scripts\stop-server.cjs"
exit /b %ERRORLEVEL%
