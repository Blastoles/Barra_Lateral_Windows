@echo off
title Barra Lateral Windows - Dev Mode
echo ===================================================
echo  Iniciando Barra Lateral Flutuante (Rust + Tauri)
echo ===================================================
taskkill /F /IM "barra_lateral_windows.exe" /T 2>nul
taskkill /F /IM "BarraLateral.exe" /T 2>nul
taskkill /F /IM "barra-lateral-windows.exe" /T 2>nul
taskkill /F /IM "cargo.exe" /T 2>nul
taskkill /F /IM "rustc.exe" /T 2>nul

set CARGO_TARGET_DIR=%TEMP%\barra_lateral_target_dev
npm run dev
pause
