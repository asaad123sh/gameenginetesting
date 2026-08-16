@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title Blocksmith Studio - Local Editor
color 0A

cls
echo.
echo  ==============================================================
echo                 BLOCKSMITH STUDIO LOCAL LAUNCHER
echo  ==============================================================
echo.

if not exist "package.json" (
  color 0C
  echo [ERROR] package.json was not found.
  echo Keep this BAT file inside the Blocksmith Studio project folder.
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  color 0E
  echo [SETUP REQUIRED] Node.js is not installed or is not in PATH.
  echo.
  echo Install the current Node.js LTS release from:
  echo https://nodejs.org/
  echo.
  echo After installation, close this window and run this BAT again.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  color 0C
  echo [ERROR] npm was not found. Repair your Node.js installation.
  pause
  exit /b 1
)

for /f "tokens=*" %%v in ('node --version') do set NODE_VERSION=%%v
echo [OK] Node.js %NODE_VERSION%
echo [1/3] Checking editor dependencies...
if exist "node_modules\.bin\vite.cmd" goto dependencies_ready

echo First launch detected. Installing packages now...
call npm install --no-audit --no-fund
if errorlevel 1 (
  color 0C
  echo.
  echo [ERROR] npm could not install the required packages.
  echo Check your internet connection and the error shown above.
  pause
  exit /b 1
)

:dependencies_ready
echo [OK] Editor dependencies are ready.
echo [2/3] Starting the Blocksmith development server...
echo [3/3] Your browser will open at http://localhost:5173
 echo.
echo Keep this window open while using the editor.
echo Press Ctrl+C here when you want to stop Blocksmith Studio.
echo.

start "Blocksmith Browser" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 3; Start-Process 'http://localhost:5173'"
call npm run dev -- --host 127.0.0.1 --port 5173 --strictPort

if errorlevel 1 (
  color 0E
  echo.
  echo Blocksmith could not use port 5173.
  echo Close any other app using that port, then run this launcher again.
  pause
)

endlocal
