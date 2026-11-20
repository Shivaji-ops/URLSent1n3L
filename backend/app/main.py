"""
main.py

URLSentinel — FastAPI Backend

Endpoints:
  GET  /health      — liveness check
  POST /analyze     — classify a URL or IP
  GET  /history     — recent scans from Neon PostgreSQL
  POST /feedback    — save analyst action (allow / block / escalate)

Run:
  uvicorn app.main:app --reload --port 8000
"""

import re
import logging
from datetime import datetime, timezone

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .ml.predict    import classify_url
from .ip_analysis   import analyze_ip
from .idn.idn_detector import detect as idn_detect
from .              import database

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title='URLSentinel API', version='1.0')

# CORS — allow the Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        'http://localhost:5173',
        'http://127.0.0.1:5173',
    ],
    allow_methods=['*'],
    allow_headers=['*'],
)

IP_REGEX = re.compile(r'^(\d{1,3}\.){3}\d{1,3}$')


# ── Startup ───────────────────────────────────────────────────────────────────

@app.on_event('startup')
def on_startup():
    database.init_db()


# ── Schemas ───────────────────────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    input: str

class FeedbackRequest(BaseModel):
    case_id: int | None = None
    action:  str        # allow | block | escalate


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get('/health')
def health():
    return {'status': 'ok', 'version': '1.0'}


@app.post('/analyze')
def analyze(req: AnalyzeRequest):
    raw = req.input.strip()
    if not raw:
        raise HTTPException(status_code=400, detail='Input cannot be empty.')

    is_ip = bool(IP_REGEX.match(raw))

    try:
        if is_ip:
            result     = analyze_ip(raw)
            input_type = 'ip'
        else:
            # IDN check before the ML model
            from urllib.parse import urlparse
            from .ml.features import normalize_url
            hostname   = urlparse(normalize_url(raw)).hostname or ''
            idn_result = idn_detect(hostname)
            result     = classify_url(raw)
            input_type = 'url'

            # Merge IDN findings if detected
            if idn_result['homograph_detected']:
                result['features'].update({
                    'homograph_detected':  True,
                    'unicode_chars_found': str(idn_result['unicode_chars_found']),
                    'lookalike_domain':    idn_result['lookalike_domain'],
                })
                result['flagged_features'].append('homograph_detected')
                result['attack_type'] = idn_result['attack_type']
                result['verdict']     = 'Malicious'

    except Exception as e:
        logger.error(f'Analysis error: {e}')
        raise HTTPException(status_code=500, detail=f'Analysis failed: {e}')

    scanned_at = datetime.now(timezone.utc)

    case_id = database.insert_scan(
        input_value=raw,
        scan_type=input_type,
        verdict=result['verdict'],
        confidence=result['confidence'],
        attack_type=result['attack_type'],
        features=result['features'],
        flagged_features=result['flagged_features'],
        method=result.get('method', 'model'),
        scanned_at=scanned_at,
    )

    return {
        'case_id':          case_id,
        'input':            raw,
        'type':             input_type,
        'verdict':          result['verdict'],
        'confidence':       result['confidence'],
        'attack_type':      result['attack_type'],
        'features':         result['features'],
        'flagged_features': result['flagged_features'],
        'scanned_at':       scanned_at.isoformat(),
    }


@app.get('/history')
def history(limit: int = 20):
    try:
        return database.get_recent_scans(limit)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f'History unavailable: {e}')


@app.post('/feedback')
def feedback(req: FeedbackRequest):
    if req.action not in {'allow', 'block', 'escalate'}:
        raise HTTPException(status_code=400, detail='Action must be: allow, block, or escalate.')

    if req.case_id is None:
        return {'saved': False, 'message': 'No case ID — feedback not persisted.'}

    saved = database.insert_feedback(req.case_id, req.action)
    return {'saved': saved, 'case_id': req.case_id, 'action': req.action}
