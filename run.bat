@echo off
title ChatterBox
echo ================================
echo   ChatterBox - Starting...
echo ================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    pause
    exit /b 1
)

if not exist node_modules (
    echo [WARNING] node_modules not found. Running install first...
    call npm install
    echo.
)

echo Starting dev server...
echo Press Ctrl+C to stop.
echo.
call npm run dev
pause
