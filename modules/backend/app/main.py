"""
NEXA AI - Backend API Server
"""

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import pandas as pd
import io
import json
import os
import sys
import uuid
from datetime import datetime

# ── Path setup ────────────────────────────────────────────────────────────────
_backend_dir  = os.path.dirname(os.path.abspath(__file__))
_project_root = os.path.abspath(os.path.join(_backend_dir, '..'))
_ai_engine_dir = os.path.join(_project_root, 'ai_engine')

# Try both possible locations
for _p in [_ai_engine_dir, os.path.join(_project_root, '..', 'ai_engine')]:
    _p = os.path.abspath(_p)
    if os.path.isdir(_p) and _p not in sys.path:
        sys.path.insert(0, _p)

# Also add project root so 'modules.ai_engine' import works if needed
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

try:
    from ai_engine import run_detection_pipeline
    print("✅ Imported from ai_engine directly")
except ImportError:
    try:
        from modules.ai_engine.ai_engine import run_detection_pipeline
        print("✅ Imported from modules.ai_engine")
    except ImportError as e:
        print(f"❌ Import failed: {e}")
        print(f"   sys.path: {sys.path}")
        raise

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="NEXA AI - Money Mule Detection API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # allow all origins for deployment
    allow_credentials=False,      # must be False when allow_origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)

_analyses = {}

# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {"service": "NEXA AI Backend", "status": "online", "version": "1.0.0"}


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


@app.post("/api/analyze/upload")
async def analyze_upload(file: UploadFile = File(...)):
    try:
        contents = await file.read()

        # Validate CSV
        try:
            pd.read_csv(io.BytesIO(contents))
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Invalid CSV: {exc}")

        # Write temp file
        tmp_dir = os.path.join(_backend_dir, '_tmp')
        os.makedirs(tmp_dir, exist_ok=True)
        tmp_path = os.path.join(tmp_dir, f"{uuid.uuid4()}.csv")
        with open(tmp_path, 'wb') as f:
            f.write(contents)

        try:
            result = run_detection_pipeline(tmp_path)
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

        # Add metadata
        analysis_id = str(uuid.uuid4())
        result['analysis_id'] = analysis_id
        result['timestamp']   = datetime.now().isoformat()

        # Adapter: frontend risk_scores expects 'account' and 'total_score'
        for s in result.get('risk_scores', []):
            s.setdefault('account',      s.get('account_id'))
            s.setdefault('total_score',  s.get('risk_score'))
            s.setdefault('transactions', 0)
            s.setdefault('volume',       0)

        _analyses[analysis_id] = result
        return JSONResponse(content=_safe_json(result))

    except HTTPException:
        raise
    except Exception as exc:
        import traceback
        print(f"❌ Analysis failed:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {exc}")


@app.post("/api/analyze/sample")
async def analyze_sample():
    # Look for sample data in multiple locations
    candidates = [
        os.path.join(_ai_engine_dir,  'sample_data', 'transactions.csv'),
        os.path.join(_backend_dir,    'sample_data', 'transactions.csv'),
        os.path.join(_project_root,   'sample_data', 'transactions.csv'),
    ]
    sample_path = next((p for p in candidates if os.path.exists(p)), None)
    if not sample_path:
        raise HTTPException(status_code=404, detail="Sample data not found")

    result = run_detection_pipeline(sample_path)
    analysis_id = str(uuid.uuid4())
    result['analysis_id'] = analysis_id
    result['timestamp']   = datetime.now().isoformat()
    _analyses[analysis_id] = result
    return JSONResponse(content=_safe_json(result))


@app.get("/api/analysis/{analysis_id}")
async def get_analysis(analysis_id: str):
    if analysis_id not in _analyses:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return JSONResponse(content=_safe_json(_analyses[analysis_id]))


@app.get("/api/analysis/{analysis_id}/network-data")
async def get_network_data(analysis_id: str):
    if analysis_id not in _analyses:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return JSONResponse(content=_safe_json(
        _analyses[analysis_id].get('graph_data', {})
    ))


@app.get("/api/analysis/{analysis_id}/download")
async def download_json(analysis_id: str):
    if analysis_id not in _analyses:
        raise HTTPException(status_code=404, detail="Analysis not found")

    data = _analyses[analysis_id]

    ps_output = {
        'suspicious_accounts': [
            {
                'account_id':       acc['account_id'],
                'suspicion_score':  float(acc['suspicion_score']),
                'detected_patterns': acc.get('detected_patterns', []),
                'ring_id':          acc.get('ring_id'),
            }
            for acc in data.get('suspicious_accounts', [])
        ],
        'fraud_rings': [
            {
                'ring_id':         ring['ring_id'],
                'member_accounts': ring.get('member_accounts', []),
                'pattern_type':    ring.get('pattern_type', 'unknown'),
                'risk_score':      float(ring.get('risk_score', 0)),
            }
            for ring in data.get('fraud_rings', [])
        ],
        'summary': {
            'total_accounts_analyzed':    int(data['summary'].get('total_accounts_analyzed', 0)),
            'suspicious_accounts_flagged': int(data['summary'].get('suspicious_accounts_flagged', 0)),
            'fraud_rings_detected':        int(data['summary'].get('fraud_rings_detected', 0)),
            'processing_time_seconds':     float(data['summary'].get('processing_time_seconds', 0)),
        },
    }

    return JSONResponse(
        content=_safe_json(ps_output),
        headers={
            "Content-Disposition": f'attachment; filename="nexa_{analysis_id[:8]}.json"'
        },
    )


@app.get("/api/stats")
async def get_stats():
    return {"total_analyses": len(_analyses), "version": "1.0.0"}


# ── Helper ────────────────────────────────────────────────────────────────────

def _safe_json(obj):
    """Serialize Timestamps, numpy types etc. to plain Python."""
    return json.loads(json.dumps(obj, default=str))


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)