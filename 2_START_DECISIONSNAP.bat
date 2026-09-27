@echo off
setlocal
cd /d "%~dp0"
title DecisionSnap
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install Node.js 22 or newer, then try again.
  pause
  exit /b 1
)
if not exist ".env" (
  echo.
  echo Gemini is not configured yet.
  echo Run 1_SETUP_GEMINI_KEY.bat first if you want live AI.
  echo The demo still works without a key.
  echo.
)
start "" /b cmd /c "timeout /t 2 /nobreak ^>nul ^& start \"\" http://localhost:3000"
node server.js
echo.
echo DecisionSnap stopped.
pause
