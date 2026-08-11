@echo off
title Barra Lateral Windows - Build Release
echo ===================================================
echo  Gerando Executável Final (Release)
echo ===================================================
taskkill /F /IM "barra_lateral_windows.exe" /T 2>nul
taskkill /F /IM "BarraLateral.exe" /T 2>nul
taskkill /F /IM "barra-lateral-windows.exe" /T 2>nul
taskkill /F /IM "cargo.exe" /T 2>nul
taskkill /F /IM "rustc.exe" /T 2>nul

set CARGO_TARGET_DIR=%TEMP%\barra_lateral_target_build
if exist "%CARGO_TARGET_DIR%" rmdir /s /q "%CARGO_TARGET_DIR%"
npm run build
pause
