@echo off
rem ============================================================
rem  Bat / tat: n8n tu chay moi khi bat may (de lich dang bai,
rem  quet doi thu chay dung gio ma khong can nho mo n8n.bat).
rem ============================================================
chcp 65001 >nul
set "LINK=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Mitu n8n.lnk"

if exist "%LINK%" (
  choice /c YN /m "n8n DANG tu chay cung Windows. Tat tinh nang nay (Y = tat, N = giu nguyen)"
  if errorlevel 2 exit /b
  del "%LINK%"
  echo Da tat. Tu gio phai tu mo n8n.bat.
  pause
  exit /b
)

powershell -NoProfile -Command "$s=(New-Object -ComObject WScript.Shell).CreateShortcut($env:LINK); $s.TargetPath='%~dp0n8n.bat'; $s.Arguments='--an'; $s.WorkingDirectory='%~dp0'; $s.WindowStyle=7; $s.Save()"
echo Da bat. Moi lan bat may, n8n se tu chay ngam (khong mo trinh duyet).
echo Chay lai file nay neu muon tat.
pause
