@echo off
setlocal
cd /d "%~dp0"
title DecisionSnap - Gemini Test
node scripts\doctor.mjs
echo.
pause
