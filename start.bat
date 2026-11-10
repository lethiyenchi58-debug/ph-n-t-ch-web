@echo off
rem ============================================================
rem  Tiem banh Mitu - mo web tren may (co AI agent o trang admin)
rem    Nhay dup start.bat  -> trang khach
rem    Nhay dup admin.bat  -> trang admin
rem ============================================================
chcp 65001 >nul
title Tiem banh Mitu
cd /d "%~dp0"
set "PAGE=%~1"

where node >nul 2>nul
if errorlevel 1 goto nonode

if not exist ".env.local" (
  echo [!] Thieu file .env.local nen nut AI o trang admin se bao loi.
  echo     Web van chay binh thuong. Xem huong dan trong AI_AGENT.md.
  echo.
  timeout /t 6 >nul
)

rem Server chay trong cua so rieng (thu nho o thanh taskbar).
rem Neu web dang chay san thi dev.js chi mo them trang trong trinh duyet.
start "Tiem banh Mitu - DUNG TAT CUA SO NAY" /min cmd /c "node dev.js --open %PAGE% || pause"
exit /b

rem ------------------------------------------------------------
:nonode
echo ============================================================
echo  May chua cai Node.js - can de chay web co AI agent.
echo ============================================================
where winget >nul 2>nul
if errorlevel 1 goto manual

choice /c YN /m "Cai Node.js tu dong ngay bay gio (Y = co, N = khong)"
if errorlevel 2 goto nonai
echo.
echo Dang cai Node.js... (co the hien bang hoi quyen, bam Yes)
winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
echo.
echo Cai xong. Dong cua so nay roi nhay dup lai file vua mo.
pause
exit /b

:manual
echo Tai ban LTS tai trang vua mo, cai xong thi nhay dup lai file nay.
start "" "https://nodejs.org/"

:nonai
echo.
echo Tam thoi mo web KHONG co AI (http://localhost:8080/%PAGE%).
echo Dung tat cua so nay khi dang dung web.
start "" "http://localhost:8080/%PAGE%"
powershell -ExecutionPolicy Bypass -File "%~dp0server.ps1"
pause
