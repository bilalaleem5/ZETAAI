@echo off
title ZETA AI — Setup
color 0D
echo.
echo  ========================================
echo   ZETA AI — Autonomous OS Intelligence
echo  ========================================
echo.

:: Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found!
    echo Please install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)

echo [OK] Node.js found: 
node --version

:: Check npm
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm not found!
    pause
    exit /b 1
)

echo [OK] npm found:
npm --version
echo.

:: Install dependencies
echo [*] Installing dependencies (this takes 2-3 minutes)...
echo.
npm install --legacy-peer-deps
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] npm install failed. Trying with --force...
    npm install --force
)

echo.
echo  ========================================
echo   Setup Complete! Starting ZETA AI...
echo  ========================================
echo.
echo  When the app opens:
echo    1. Click VAULT in the title bar
echo    2. Add your GEMINI_API_KEY
echo    3. Add your GROQ_API_KEY
echo    4. Start chatting!
echo.
pause
npm run dev
