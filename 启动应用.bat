@echo off
chcp 65001 >nul
setlocal

cd /d "%~dp0"

if not exist "node_modules" (
  echo node_modules not found.
  echo Please run this command in the project folder first: npm install
  echo.
  pause
  exit /b 1
)

npm run dev -- --host 127.0.0.1 --open
