@echo off
echo ========================================
echo   MediConnect BD - Troubleshooter
echo ========================================
echo.

echo [1] Checking MySQL Service...
powershell -Command "Get-Service -Name MySQL* | Select-Object Name, Status | Format-Table"

echo.
echo [2] Checking Port Usage...
echo MySQL (3307), Backend (5000), Frontend (5173):
powershell -Command "netstat -ano | findstr ':3307 :5000 :5173'"

echo.
echo [3] Checking Node Processes...
powershell -Command "Get-Process -Name node -ErrorAction SilentlyContinue | Select-Object Id, ProcessName, StartTime | Format-Table"

echo.
echo [4] Testing Backend Health...
powershell -Command "try { Invoke-RestMethod -Uri 'http://127.0.0.1:5000/api/health' -TimeoutSec 3 | ConvertTo-Json } catch { Write-Host 'Backend NOT responding' -ForegroundColor Red }"

echo.
echo [5] Testing Frontend...
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:5173' -UseBasicParsing -TimeoutSec 3; Write-Host 'Frontend: OK (Status' $r.StatusCode')' -ForegroundColor Green } catch { Write-Host 'Frontend NOT responding' -ForegroundColor Red }"

echo.
echo ========================================
echo   Quick Fixes
echo ========================================
echo.
echo   [F1] Kill all node processes and restart
echo   [F2] Kill process blocking port 5000
echo   [F3] Kill process blocking port 5173
echo   [X]  Exit
echo.
choice /C F123X /N /M "Select option: "

if errorlevel 5 goto :EOF
if errorlevel 4 goto killport5173
if errorlevel 3 goto killport5000
if errorlevel 2 goto restartall
if errorlevel 1 goto restartall

:restartall
echo.
echo Killing all node processes...
taskkill /F /IM node.exe /T >nul 2>&1
timeout /t 2 /nobreak >nul
echo.
echo Restarting servers...
cd /d "%~dp0backend"
start "MediConnect Backend" powershell -NoExit -Command "npm run dev"
timeout /t 3 /nobreak >nul
cd /d "%~dp0"
start "MediConnect Frontend" powershell -NoExit -Command "npm run dev"
timeout /t 3 /nobreak >nul
echo Done! Servers starting in separate windows.
pause
goto :EOF

:killport5000
powershell -Command "$pid = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -First 1; if ($pid) { Stop-Process -Id $pid -Force; Write-Host 'Killed process' $pid 'on port 5000' } else { Write-Host 'No process found on port 5000' }"
pause
goto :EOF

:killport5173
powershell -Command "$pid = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -First 1; if ($pid) { Stop-Process -Id $pid -Force; Write-Host 'Killed process' $pid 'on port 5173' } else { Write-Host 'No process found on port 5173' }"
pause
goto :EOF
