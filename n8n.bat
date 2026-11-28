@echo off
rem ============================================================
rem  Tiem banh Mitu - mo n8n (3 workflow AI tu dong) tren may
rem    Nhay dup n8n.bat          -> mo n8n o http://localhost:5678
rem    n8n.bat --nap-lai         -> nap lai 3 workflow tu thu muc n8n\workflows
rem                                 (GHI DE cac sua doi tren giao dien n8n)
rem  Khoa API va ID doc tu .env.local (xem WORKFLOW_N8N.md).
rem  Sua .env.local xong: tat cua so "Mitu n8n" duoi taskbar roi mo lai file nay.
rem ============================================================
chcp 65001 >nul
title Tiem banh Mitu - n8n
cd /d "%~dp0"

rem Phien ban n8n da chay thu voi 3 workflow. Doi phien ban thi phai thu lai.
set "N8N_VERSION=2.49.8"
set "NO_BROWSER="
set "RELOAD="
if /i "%~1"=="--an" set "NO_BROWSER=1"
if /i "%~1"=="--nap-lai" set "RELOAD=1"

where node >nul 2>nul
if errorlevel 1 (
  echo [!] May chua co Node.js. Nhay dup start.bat mot lan de cai Node.js, roi mo lai file nay.
  pause
  exit /b
)

rem n8n dang chay san thi chi mo trinh duyet
if not defined RELOAD (
  powershell -NoProfile -Command "try{Invoke-WebRequest http://localhost:5678/healthz -UseBasicParsing -TimeoutSec 2 | Out-Null; exit 0}catch{exit 1}"
  if not errorlevel 1 goto openbrowser
)

rem ---- Nap khoa / ID tu .env.local vao bien moi truong ----
if not exist ".env.local" (
  echo [!] Chua co file .env.local - workflow se bao thieu khoa. Xem WORKFLOW_N8N.md, muc "Buoc 2".
  timeout /t 8 >nul
) else (
  for /f "usebackq eol=# tokens=1,* delims==" %%A in (".env.local") do set "%%A=%%B"
)

rem ---- Cau hinh n8n ----
set "N8N_USER_FOLDER=%~dp0n8n-data"
set "MITU_DIR=%~dp0"
set "GENERIC_TIMEZONE=Asia/Ho_Chi_Minh"
set "TZ=Asia/Ho_Chi_Minh"
set "N8N_LISTEN_ADDRESS=127.0.0.1"
set "N8N_BLOCK_ENV_ACCESS_IN_NODE=false"
set "NODE_FUNCTION_ALLOW_BUILTIN=fs,path"
set "N8N_DIAGNOSTICS_ENABLED=false"
set "N8N_VERSION_NOTIFICATIONS_ENABLED=false"
set "N8N_RUNNERS_TASK_TIMEOUT=300"

rem ---- Lan dau (hoac --nap-lai): nap 3 workflow va bat chung ----
if not exist "n8n-data\.mitu-da-nap" set "RELOAD=1"
if defined RELOAD (
  echo Dang nap 3 workflow Mitu vao n8n... Lan dau phai tai n8n, co the mat 5-15 phut.
  call npx -y n8n@%N8N_VERSION% import:workflow --separate --input="%~dp0n8n\workflows"
  if errorlevel 1 (
    echo [!] Nap workflow loi. Kiem tra mang Internet roi chay lai n8n.bat.
    pause
    exit /b
  )
  for %%W in (MituWf2DoiThu001 MituWf3DangBai01 MituWf1TraLoi001) do call npx -y n8n@%N8N_VERSION% publish:workflow --id=%%W >nul 2>nul
  echo ok> "n8n-data\.mitu-da-nap"
)

rem ---- Duong ham ngrok (chi can cho WF1 nhan tin Facebook / chat web) ----
if defined NGROK_DOMAIN (
  where ngrok >nul 2>nul
  if errorlevel 1 (
    echo [!] Co NGROK_DOMAIN nhung may chua cai ngrok - WF1 chua nhan duoc tin tu ngoai.
    echo     Xem muc "WF1 - Buoc 3: ngrok" trong WORKFLOW_N8N.md.
    timeout /t 8 >nul
  ) else (
    start "Mitu n8n - ngrok - DUNG TAT" /min ngrok http --url=%NGROK_DOMAIN% 5678
  )
)
if defined NGROK_DOMAIN set "WEBHOOK_URL=https://%NGROK_DOMAIN%/"

echo Dang mo n8n...
start "Mitu n8n - DUNG TAT CUA SO NAY" /min cmd /c "npx -y n8n@%N8N_VERSION% start || pause"

rem Doi n8n san sang (toi da ~10 phut cho lan dau)
powershell -NoProfile -Command "for($i=0;$i -lt 300;$i++){try{Invoke-WebRequest http://localhost:5678/healthz -UseBasicParsing -TimeoutSec 2 | Out-Null; exit 0}catch{Start-Sleep 2}}; exit 1"
if errorlevel 1 (
  echo [!] n8n chua len. Mo cua so "Mitu n8n - DUNG TAT CUA SO NAY" duoi taskbar de xem loi.
  pause
  exit /b
)

:openbrowser
if not defined NO_BROWSER start "" "http://localhost:5678"
exit /b
