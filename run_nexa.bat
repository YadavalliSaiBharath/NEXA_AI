@echo off
echo Starting NEXA AI...

:: Start Backend in new window
start "NEXA Backend" cmd /k "cd /d E:\rift_hackathon\modules\backend && E:\rift_hackathon\venv\Scripts\activate && uvicorn main:app --reload --port 8000"

:: Wait 3 seconds for backend to boot
timeout /t 3 /nobreak

:: Start Frontend in new window
start "NEXA Frontend" cmd /k "cd /d E:\rift_hackathon\modules\frontend && npm start"

echo.
echo ✅ Backend  → http://localhost:8000
echo ✅ Frontend → http://localhost:3000
echo ✅ API Docs → http://localhost:8000/docs
pause