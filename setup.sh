#!/usr/bin/env bash
set -e

echo ""
echo " ╔═══════════════════════════════════════╗"
echo " ║        ZETA AI — Setup Script         ║"
echo " ║    Voice AI OS Assistant v2.0         ║"
echo " ╚═══════════════════════════════════════╝"
echo ""

# Check Node.js
if ! command -v node &>/dev/null; then
  echo "[ERROR] Node.js not found. Install from https://nodejs.org"
  exit 1
fi

NODE_VER=$(node -e "process.stdout.write(process.versions.node.split('.')[0])")
if [ "$NODE_VER" -lt 18 ]; then
  echo "[ERROR] Node.js 18+ required (you have v$NODE_VER)"
  exit 1
fi

echo "[1/4] Node.js $(node -v) ✓"

# Install deps
echo "[2/4] Installing dependencies..."
npm install

# Create .env
if [ ! -f ".env" ]; then
  echo "[3/4] Creating .env from template..."
  cp .env.example .env
  echo ""
  echo " ┌─────────────────────────────────────────┐"
  echo " │  ACTION REQUIRED: Add your API keys     │"
  echo " │                                         │"
  echo " │  Open .env and add either:              │"
  echo " │                                         │"
  echo " │  GEMINI_API_KEY (free, recommended):    │"
  echo " │  https://aistudio.google.com/app/apikey │"
  echo " │                                         │"
  echo " │  OR GROQ_API_KEY (free, ultra-fast):    │"
  echo " │  https://console.groq.com               │"
  echo " │                                         │"
  echo " │  Weather + News work WITHOUT any key ✓  │"
  echo " └─────────────────────────────────────────┘"
  echo ""

  # Try to open .env in editor
  if command -v code &>/dev/null; then
    code .env
  elif command -v nano &>/dev/null; then
    read -p "Press Enter to edit .env in nano..."
    nano .env
  else
    echo "Edit .env manually before running: npm run dev"
    exit 0
  fi
else
  echo "[3/4] .env already exists — skipping"
fi

echo "[4/4] Starting ZETA AI..."
echo ""
npm run dev
