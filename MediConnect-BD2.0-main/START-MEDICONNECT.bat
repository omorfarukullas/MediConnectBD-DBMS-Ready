@echo off
echo ========================================
echo   MediConnect BD - System Startup
echo ========================================
echo.

REM Kill any existing Node processes
echo [1/4] Stopping any running servers...
taskkill /F /IM node.exe /T >nul 2>&1
timeout /t 2 /nobreak >nul

REM Start Backend Server
echo [2/4] Starting Backend Server on port 5000...
cd /d "%~dp0backend"
start "MediConnect Backend" powershell -NoExit -Command "npm run dev"
timeout /t 5 /nobreak >nul

REM Start Frontend Server
echo [3/4] Starting Frontend Server on port 5173...
cd /d "%~dp0"
start "MediConnect Frontend" powershell -NoExit -Command "npm run dev"
timeout /t 5 /nobreak >nul

REM Verify System
echo [4/4] Verifying system status...
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo   System Status Check
echo ========================================
powershell -Command "netstat -ano | findstr ':5000 :5173 :3307' | findstr 'LISTENING'"

echo.
echo ========================================
echo   ✅ SYSTEM READY!
echo ========================================
echo.
echo   Backend:  http://localhost:5000/api/health
echo   Frontend: http://localhost:5173
echo   MySQL:    localhost:3307
echo.
echo   Press any key to open the application...
pause >nul

start http://localhost:5173

echo.
echo ========================================
echo   Servers are running in separate windows
echo   Close those windows to stop the servers
echo ========================================
echo.
pause
