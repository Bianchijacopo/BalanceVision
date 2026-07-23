@echo off
title BalanceVision
cd /d "%~dp0"

color 0b
echo ========================================
echo   BalanceVision - Avvio
echo ========================================
echo.

where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERRORE] Node.js non trovato.
    echo Scaricalo da: https://nodejs.org
    pause
    exit /b 1
)

echo [1/5] Installazione dipendenze server...
cd /d "%~dp0server"
echo       - Pulizia moduli vecchi...
powershell -Command "Remove-Item -Path 'node_modules' -Recurse -Force -ErrorAction SilentlyContinue; Remove-Item -Path 'package-lock.json' -Force -ErrorAction SilentlyContinue"
call npm install

echo [2/5] Installazione dipendenze client...
cd /d "%~dp0client"
if not exist "node_modules" (
    call npm install
) else (
    echo       - node_modules gia presente
)

echo [3/5] Creazione account admin (admin@gmail.com / admin)...
cd /d "%~dp0server"
call npm run seed

echo [4/5] Avvio del server (porta 3001)...
cd /d "%~dp0server"
start "BalanceVision Server" /MIN cmd /c "title Server && npm run dev"

timeout /t 2 /nobreak >nul

echo [5/5] Avvio del client (porta 5173)...
cd /d "%~dp0client"
start "BalanceVision Client" /MIN cmd /c "title Client && npm run dev"

timeout /t 4 /nobreak >nul

echo.
echo Apertura del browser...
start http://localhost:5173

echo.
echo ========================================
echo   Server: http://localhost:3001
echo   Client: http://localhost:5173
echo ========================================
echo.
echo Chiudi le finestre Server e Client per fermare.
echo Premi un tasto per chiudere questo messaggio.
pause >nul