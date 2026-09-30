@echo off
setlocal EnableExtensions
title PIB Penilaian
rem Launcher Windows, padanan mulai-pib.sh. Port tetap 3000.
cd /d "%~dp0"
set "PIB_HOST=127.0.0.1"
set "PIB_PORT=3000"
set "PIB_URL=http://localhost:%PIB_PORT%"

where node >nul 2>&1 || (echo [PIB] Error: Node.js belum terpasang. & pause & exit /b 1)

rem Jika aplikasi sudah berjalan, cukup buka browser.
curl.exe --silent --fail --max-time 2 "%PIB_URL%/" >nul 2>&1 && (
  echo [PIB] Aplikasi sudah berjalan: %PIB_URL%
  if not "%PIB_NO_BROWSER%"=="1" start "" "%PIB_URL%"
  exit /b 0
)

if not exist "node_modules\.bin\next.cmd" (
  echo [PIB] Dependency belum tersedia, memasang package...
  call npm ci || (pause & exit /b 1)
)

if not exist ".env.local" if not exist ".env" (
  echo [PIB] Membuat konfigurasi lokal...
  node -e "const fs=require('node:fs'),c=require('node:crypto'),q=String.fromCharCode(34);fs.writeFileSync('.env.local','SESSION_SECRET='+q+c.randomBytes(32).toString('hex')+q+'\n')"
)

echo [PIB] Memeriksa database...
call node_modules\.bin\tsx.cmd scripts\setup-db.ts || (pause & exit /b 1)

if not exist ".next-prod\BUILD_ID" (
  echo [PIB] Menyiapkan versi production...
  call node_modules\.bin\next.cmd build || (pause & exit /b 1)
)

echo [PIB] Menjalankan PIB Penilaian di %PIB_URL%
echo [PIB] Tutup jendela ini atau tekan Ctrl+C untuk menghentikan aplikasi.
if not "%PIB_NO_BROWSER%"=="1" (
  start "" /b powershell -NoProfile -WindowStyle Hidden -Command "for($i=0;$i -lt 30;$i++){try{Invoke-WebRequest -UseBasicParsing -TimeoutSec 1 '%PIB_URL%/' | Out-Null; Start-Process '%PIB_URL%'; break}catch{Start-Sleep 1}}"
)
call node_modules\.bin\next.cmd start -H %PIB_HOST% -p %PIB_PORT%
