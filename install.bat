@echo off
title ChatterBox - Install
echo ================================
echo   ChatterBox - Installing...
echo ================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js found
node -v
echo.

echo Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
)

echo.
echo Pushing database schema...
call npm run db:push
if %errorlevel% neq 0 (
    echo [WARNING] Database push failed. You may need to run this manually.
)

echo.
echo ================================
echo   Installation complete!
echo   Run "run.bat" to start.
echo ================================
pause
