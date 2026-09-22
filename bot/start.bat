@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist ".env" (
  echo Нет файла bot\.env — запускаю в режиме проверки без бота.
  echo Откройте http://localhost:8443/admin?admin — там админ-панель.
  node server.js --dev
  pause
  exit /b
)
echo Madinah Group запускается. Не закрывайте это окно.
node server.js
pause
