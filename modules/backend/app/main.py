"""
NEXA AI - Backend API Server
"""

import sys
import os

# Add project root (rift_hackathon) to Python path
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
sys.path.append(BASE_DIR)



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
_backend_dir = os.path.dirname(os.path.abspath(__file__))
_modules_dir = os.path.abspath(os.path.join(_backend_dir, '..', '..'))
_ai_engine_dir = os.path.join(_modules_dir, 'ai_engine')
sys.path.insert(0, _ai_engine_dir)

from modules.ai_engine.ai_engine import run_detection_pipeline

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="NEXA AI - Money Mule Detection API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
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
        tmp_dir = os.path.join(_ai_engine_dir, '_tmp')
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
        result['timestamp'] = datetime.now().isoformat()

        # Adapter: frontend risk_scores expects 'account' and 'total_score'
        for s in result.get('risk_scores', []):
            s.setdefault('account', s.get('account_id'))
            s.setdefault('total_score', s.get('risk_score'))
            s.setdefault('transactions', 0)
            s.setdefault('volume', 0)

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
    sample_path = os.path.join(_ai_engine_dir, 'sample_data', 'transactions.csv')
    if not os.path.exists(sample_path):
        raise HTTPException(status_code=404, detail=f"Sample not found: {sample_path}")

    result = run_detection_pipeline(sample_path)
    analysis_id = str(uuid.uuid4())
    result['analysis_id'] = analysis_id
    result['timestamp'] = datetime.now().isoformat()
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
    """
    Download PS-format JSON - RIFT 2026 Specification Compliant
    
    Returns analysis results in the exact format specified by RIFT:
    {
      "suspicious_accounts": [
        {
          "account_id": string,
          "suspicion_score": float (0-100),
          "detected_patterns": [string],
          "ring_id": string
        }
      ],
      "fraud_rings": [
        {
          "ring_id": string,
          "member_accounts": [string],
          "pattern_type": string,
          "risk_score": float
        }
      ],
      "summary": {
        "total_accounts_analyzed": int,
        "suspicious_accounts_flagged": int,
        "fraud_rings_detected": int,
        "processing_time_seconds": float
      }
    }
    """
    if analysis_id not in _analyses:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    data = _analyses[analysis_id]
    
    # Extract only the required fields per RIFT spec
    ps_output = {
        'suspicious_accounts': [
            {
                'account_id': acc['account_id'],
                'suspicion_score': float(acc['suspicion_score']),
                'detected_patterns': acc.get('detected_patterns', []),
                'ring_id': acc.get('ring_id')
            }
            for acc in data.get('suspicious_accounts', [])
        ],
        'fraud_rings': [
            {
                'ring_id': ring['ring_id'],
                'member_accounts': ring.get('member_accounts', []),
                'pattern_type': ring.get('pattern_type', 'unknown'),
                'risk_score': float(ring.get('risk_score', 0))
            }
            for ring in data.get('fraud_rings', [])
        ],
        'summary': {
            'total_accounts_analyzed': int(data['summary'].get('total_accounts_analyzed', 0)),
            'suspicious_accounts_flagged': int(data['summary'].get('suspicious_accounts_flagged', 0)),
            'fraud_rings_detected': int(data['summary'].get('fraud_rings_detected', 0)),
            'processing_time_seconds': float(data['summary'].get('processing_time_seconds', 0))
        }
    }
    
    return JSONResponse(
        content=_safe_json(ps_output),
        headers={"Content-Disposition": f'attachment; filename="nexa_{analysis_id[:8]}.json"'},
    )


@app.get("/api/stats")
async def get_stats():
    return {"total_analyses": len(_analyses), "version": "1.0.0"}


# ── Helper ────────────────────────────────────────────────────────────────────

def _safe_json(obj):
    """Serialize Timestamps, numpy types etc. to plain Python."""
    return json.loads(json.dumps(obj, default=str))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)