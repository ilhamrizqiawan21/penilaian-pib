@echo off
setlocal EnableExtensions
title PIB Penilaian - Berhenti
rem Menghentikan server yang dijalankan mulai-pib.bat (port tetap 3000).
set "PIB_PORT=3000"
set "FOUND="

for /f "tokens=5" %%P in ('netstat -ano ^| findstr /r /c:"127.0.0.1:%PIB_PORT% .*LISTENING"') do (
  rem Hanya hentikan proses Node.js agar aplikasi lain di port ini tidak ikut tertutup.
  tasklist /FI "PID eq %%P" /FO CSV /NH | findstr /i "node.exe" >nul && (
    set "FOUND=1"
    taskkill /PID %%P /T /F >nul && echo [PIB] Server dihentikan.
  )
)

if not defined FOUND echo [PIB] Server tidak sedang berjalan.
if not "%PIB_NO_PAUSE%"=="1" timeout /t 3 >nul
