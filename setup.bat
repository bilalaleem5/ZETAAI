@echo off
title ZETA AI — Setup
echo.
echo  ╔═══════════════════════════════════════╗
echo  ║        ZETA AI — Setup Script         ║
echo  ║    Voice AI OS Assistant v2.0         ║
echo  ╚═══════════════════════════════════════╝
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Download from https://nodejs.org
    pause & exit /b 1
)
for /f "tokens=1,2,3 delims=." %%a in ('node -v') do (
    set NODE_MAJOR=%%a
    set NODE_MAJOR=!NODE_MAJOR:~1!
)

echo [1/4] Installing dependencies...
call npm install
if %errorlevel% neq 0 ( echo [ERROR] npm install failed & pause & exit /b 1 )

if not exist ".env" (
    echo [2/4] Creating .env from template...
    copy .env.example .env
    echo.
    echo  ┌─────────────────────────────────────────┐
    echo  │  ACTION REQUIRED: Add your API keys     │
    echo  │                                         │
    echo  │  1. Open .env in any text editor        │
    echo  │  2. Add GEMINI_API_KEY (free):          │
    echo  │     https://aistudio.google.com/app/apikey
    echo  │                                         │
    echo  │  OR add GROQ_API_KEY (free):            │
    echo  │     https://console.groq.com            │
    echo  │                                         │
    echo  │  Weather + News work WITHOUT any key    │
    echo  └─────────────────────────────────────────┘
    echo.
    echo Press any key to open .env for editing...
    pause >nul
    notepad .env
) else (
    echo [2/4] .env already exists — skipping
)

echo [3/4] Setup complete!
echo.
echo [4/4] Starting ZETA AI...
echo.
npm run dev
