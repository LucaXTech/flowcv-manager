@echo off
cd /d "%~dp0"
set "NODE_EXE=%~dp0node.exe"
if not exist "%NODE_EXE%" set "NODE_EXE=node.exe"
"%NODE_EXE%" "%~dp0launcher.mjs" --stop
if errorlevel 1 (
  echo.
  echo Arresto non completato: consultare launcher.log e server.log in Documenti\FlowCV-Local-Manager.
  pause
)
