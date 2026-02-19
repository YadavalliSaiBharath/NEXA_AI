# NEXA AI - Startup Guide

## ✅ Current Status

Both the frontend and backend are now **running successfully**!

### Services
- **Backend API**: http://localhost:8000 
  - API Docs: http://localhost:8000/docs
  - Health Check: http://localhost:8000/api/health
- **Frontend**: http://localhost:3000

## Issues Fixed

### 1. **Missing Chip Component Import** (Frontend)
- **File**: `modules/frontend/src/App.tsx`
- **Issue**: `Chip` component from Material-UI was used but not imported
- **Fix**: Added `Chip` to the imports from `@mui/material`

### 2. **AI Engine Module Export** (Backend)
- **File**: `modules/ai_engine/__init__.py`
- **Issue**: `run_detection_pipeline` function was not exported
- **Fix**: Added `run_detection_pipeline` to the module's `__all__` exports

### 3. **Incorrect Path to AI Engine** (Backend)
- **File**: `modules/backend/app/main.py`
- **Issue**: Path calculation was incorrect (missing one directory level up)
  - Was: `os.path.join(_backend_dir, '..', 'ai_engine')` (goes to `/backend/ai_engine`)
  - Should: `os.path.join(_backend_dir, '..', '..', 'ai_engine')` (goes to `/modules/ai_engine`)
- **Fix**: Updated path to use correct number of directory levels

## How to Run

### Option 1: Use the Batch Script (Recommended)
```batch
e:\rift_hackathon\run_nexa.bat
```
This script starts both services in separate windows.

### Option 2: Manual Terminal Commands

**Terminal 1 - Backend:**
```bash
cd e:\rift_hackathon\modules\backend\app
e:\rift_hackathon\venv\Scripts\uvicorn main:app --reload --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd e:\rift_hackathon\modules\frontend
npm start
```

### Option 3: Currently Running
Both applications are already running in the background:
- Backend: Terminal ID `1b076326-1813-4d93-aa13-c1a4c2ce2564`
- Frontend: Terminal ID `18ccd0f9-4ef9-401d-9952-bafe258b956c`

## How to Use the Application

1. Open http://localhost:3000 in your browser
2. Navigate to the "Upload" section
3. Upload a CSV file with transaction data or use the sample data
4. View analysis results:
   - **Dashboard**: Summary statistics and risk levels
   - **Network View**: Graph visualization of transaction networks
   - **Analytics**: Detailed charts and patterns
   - **Reports**: Download results as JSON

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Root endpoint |
| `/api/health` | GET | Health check |
| `/api/analyze/upload` | POST | Upload and analyze CSV |
| `/api/analyze/sample` | POST | Analyze sample data |
| `/api/analysis/{id}` | GET | Get analysis results |
| `/api/analysis/{id}/network-data` | GET | Get network graph data |
| `/api/analysis/{id}/download` | GET | Download analysis as JSON |
| `/api/stats` | GET | Get statistics |

## Documentation

- **API Documentation**: http://localhost:8000/docs
- **OpenAPI Schema**: http://localhost:8000/openapi.json

## Dependencies

### Backend
- FastAPI (Python web framework)
- Uvicorn (ASGI server)
- Pandas (data processing)
- NetworkX (graph algorithms)
- NumPy (numerical computing)

### Frontend
- React 18.2
- Material-UI (MUI)
- Recharts (charting)
- Axios (HTTP client)
- React Force Graph (network visualization)

## Environment

- Python: 3.11.9
- Node.js: v24.11.1
- npm: 11.6.2
- Virtual Environment: `e:\rift_hackathon\venv`

## Stopping the Applications

Once running:
- **Backend**: Press `CTRL+C` in the backend terminal
- **Frontend**: Press `CTRL+C` in the frontend terminal
- **Batch Script**: Close both windows or press `CTRL+C`

## Troubleshooting

### Port already in use
If you get "port already in use" errors:
```powershell
# Check what's using the port
netstat -ano | Select-String ":8000"
netstat -ano | Select-String ":3000"

# Kill the process (replace PID with process ID)
Stop-Process -Id <PID> -Force
```

### Module not found errors
Ensure the virtual environment is activated:
```bash
e:\rift_hackathon\venv\Scripts\Activate
```

### npm install issues
Clear npm cache and reinstall:
```bash
cd e:\rift_hackathon\modules\frontend
npm cache clean --force
npm install
```

## Build Production Version

```bash
cd e:\rift_hackathon\modules\frontend
npm run build
```
Output will be in `build/` directory.
