@echo off
rem Launcher compatibile con il collegamento desktop delle versioni precedenti.
rem Nessun terminale persistente: il server Node viene gestito da FlowCV-Manager.vbs.
cd /d "%~dp0"
start "" wscript.exe //nologo "%~dp0FlowCV-Manager.vbs"
exit /b 0
