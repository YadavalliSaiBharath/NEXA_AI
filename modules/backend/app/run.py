"""
run.py — Start NEXA AI backend from project root.
Usage:
    python run.py
"""

import os
import sys
import subprocess

ROOT = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT, 'modules', 'backend')
AI_ENGINE_DIR = os.path.join(ROOT, 'modules', 'ai_engine')


def start_backend():
    print("🚀 Starting NEXA AI Backend → http://localhost:8000")
    print("📖 API Docs           → http://localhost:8000/docs")
    env = os.environ.copy()
    env['PYTHONPATH'] = AI_ENGINE_DIR + os.pathsep + env.get('PYTHONPATH', '')
    subprocess.run(
        [sys.executable, '-m', 'uvicorn', 'main:app', '--reload', '--port', '8000'],
        cwd=BACKEND_DIR,
        env=env,
    )


if __name__ == '__main__':
    start_backend()