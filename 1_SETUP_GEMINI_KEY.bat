@echo off
setlocal
cd /d "%~dp0"
title DecisionSnap - Gemini Setup
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install Node.js 22 or newer, then try again.
  pause
  exit /b 1
)
node scripts\setup-key.mjs
echo.
pause
