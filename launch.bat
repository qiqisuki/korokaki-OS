@echo off
set ELECTRON_RUN_AS_NODE=
set DEEPSEEK_API_KEY=sk-1af807d0e34746ea94aafe3cd90d9180
cd /d "%~dp0"
start "" "%~dp0node_modules\electron\dist\electron.exe" .
