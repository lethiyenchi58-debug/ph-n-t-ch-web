@echo off
title Tiem banh Mitu - Local Server
echo Dang khoi dong server Tiem banh Mitu tai http://localhost:8080 ...
start http://localhost:8080
powershell -ExecutionPolicy Bypass -File "%~dp0server.ps1"
pause
