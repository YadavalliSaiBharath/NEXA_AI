"""
NEXA AI - Railway Entry Point
"""

import sys
import os

# Add all necessary paths
_root = os.path.dirname(os.path.abspath(__file__))
_backend  = os.path.join(_root, 'modules', 'backend')
_ai_engine = os.path.join(_root, 'modules', 'ai_engine')

sys.path.insert(0, _root)
sys.path.insert(0, _backend)
sys.path.insert(0, _ai_engine)

print(f"Root:      {_root}")
print(f"Backend:   {_backend} exists={os.path.isdir(_backend)}")
print(f"AI Engine: {_ai_engine} exists={os.path.isdir(_ai_engine)}")
print(f"sys.path:  {sys.path[:4]}")

# Now import the actual app
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import pandas as pd
import io
import json
import uuid
from datetime import datetime

try:
    from ai_engine import run_detection_pipeline
    print("✅ Imported ai_engine directly")
except ImportError as e1:
    print(f"⚠️  Direct import failed: {e1}")
    try:
        from modules.ai_engine.ai_engine import run_detection_pipeline
        print("✅ Imported from modules.ai_engine")
    except ImportError as e2:
        print(f"❌ Both imports failed: {e2}")
        raise

app = FastAPI(title="NEXA AI", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

_analyses = {}


@app.get("/")
async def root():
    return {"service": "NEXA AI Backend", "status": "online"}


@app.get("/api/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


@app.post("/api/analyze/upload")
async def analyze_upload(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        try:
            pd.read_csv(io.BytesIO(contents))
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Invalid CSV: {exc}")

        tmp_dir  = os.path.join(_root, '_tmp')
        os.makedirs(tmp_dir, exist_ok=True)
        tmp_path = os.path.join(tmp_dir, f"{uuid.uuid4()}.csv")
        with open(tmp_path, 'wb') as f:
            f.write(contents)

        try:
            result = run_detection_pipeline(tmp_path)
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

        analysis_id = str(uuid.uuid4())
        result['analysis_id'] = analysis_id
        result['timestamp']   = datetime.now().isoformat()

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
    candidates = [
        os.path.join(_ai_engine, 'sample_data', 'transactions.csv'),
        os.path.join(_root,      'sample_data', 'transactions.csv'),
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
    return JSONResponse(content=_safe_json(_analyses[analysis_id].get('graph_data', {})))


@app.get("/api/analysis/{analysis_id}/download")
async def download_json(analysis_id: str):
    if analysis_id not in _analyses:
        raise HTTPException(status_code=404, detail="Analysis not found")

    data = _analyses[analysis_id]
    ps_output = {
        'suspicious_accounts': [
            {
                'account_id':        acc['account_id'],
                'suspicion_score':   float(acc['suspicion_score']),
                'detected_patterns': acc.get('detected_patterns', []),
                'ring_id':           acc.get('ring_id'),
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
            'total_accounts_analyzed':     int(data['summary'].get('total_accounts_analyzed', 0)),
            'suspicious_accounts_flagged': int(data['summary'].get('suspicious_accounts_flagged', 0)),
            'fraud_rings_detected':        int(data['summary'].get('fraud_rings_detected', 0)),
            'processing_time_seconds':     float(data['summary'].get('processing_time_seconds', 0)),
        },
    }

    return JSONResponse(
        content=_safe_json(ps_output),
        headers={"Content-Disposition": f'attachment; filename="nexa_{analysis_id[:8]}.json"'},
    )


@app.get("/api/stats")
async def get_stats():
    return {"total_analyses": len(_analyses), "version": "1.0.0"}


def _safe_json(obj):
    return json.loads(json.dumps(obj, default=str))


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)