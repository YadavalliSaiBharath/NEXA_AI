@echo off
cd /d E:\rift_hackathon\modules\backend
call ..\..\venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
pause