@echo off
chcp 65001 > nul
echo ========================================================
echo  🚀 ISATS LOADOUT-BEAM BOM SYSTEM - LOCAL LAUNCHER
echo ========================================================
echo.
echo [1/3] Checking environment...
if not exist "bom.py" (
    echo [ERROR] bom.py not found! Please run this file in the '!!bom' directory.
    pause
    exit /b
)

echo [2/3] Starting Remark Service (Backend)...
echo    - Port: 8000
echo    - Log: remarks.json
start "ISATS Backend Service" python remark_service.py

echo [3/3] Launching Web Viewer (Frontend)...
timeout /t 2 >nul
start index.html

echo.
echo [SUCCESS] System deployed.
echo - The backend server is running in a separate window.
echo - The web viewer should open in your default browser.
echo.
echo Press any key to exit this launcher (Server will keep running)...
pause > nul
