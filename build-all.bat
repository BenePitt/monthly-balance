@echo off
echo === Monatliche Bilanz - Alle Windows-Builds ===
echo Baut: Installer (NSIS) + Portable EXE + Direkt-EXE (unpacked)
echo Vite-Build laeuft nur einmal.
echo.

cd /d "%~dp0"

echo [1/2] Vite Frontend-Build...
call node node_modules/vite/bin/vite.js build --outDir dist
if %errorlevel% neq 0 (
    echo.
    echo VITE-BUILD FEHLGESCHLAGEN
    pause
    exit /b %errorlevel%
)

echo.
echo [2/2] Electron-Builder (nsis + portable + dir)...
call node_modules\.bin\electron-builder --win nsis portable dir --x64
if %errorlevel% neq 0 (
    echo.
    echo ELECTRON-BUILDER FEHLGESCHLAGEN
    pause
    exit /b %errorlevel%
)

echo.
echo ============================================
echo Fertig! Ausgabe in: dist-desktop\
echo   Installer:   dist-desktop\Monatliche Bilanz Setup*.exe
echo   Portable:    dist-desktop\Monatliche Bilanz*.exe
echo   Direkt-EXE:  dist-desktop\win-unpacked\Monatliche Bilanz.exe
echo ============================================
pause
