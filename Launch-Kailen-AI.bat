@echo off
title Launching Kailen AI Desktop...
rem Change to the script directory
cd /d "%~dp0"
rem Remove any existing encrypted vault so the user starts with a clean state
if exist "data\provider-vault.enc" (
  echo Deleting existing provider vault for a fresh setup...
  del /f /q "data\provider-vault.enc"
)
rem Start the Electron application
start "" npx electron .
exit
