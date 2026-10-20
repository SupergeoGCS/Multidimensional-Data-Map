@echo off
setlocal
cd /d "%~dp0"
set "PYTHONUTF8=1"
set "MAP_PYTHON=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
if exist "%MAP_PYTHON%" (
  "%MAP_PYTHON%" tools\serve_map.py --open-browser
) else (
  py -3 tools\serve_map.py --open-browser
)
if errorlevel 1 pause
