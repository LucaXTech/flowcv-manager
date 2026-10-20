@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Installa-FlowCV.ps1"
if errorlevel 1 (
 echo.
 echo Installazione non completata. Leggi l'errore qui sopra.
 pause
)
