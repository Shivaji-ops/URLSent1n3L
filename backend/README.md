# URLSentinel — Backend

FastAPI backend for URL and IP malicious indicator classification.
Uses Neon serverless PostgreSQL for scan history and analyst feedback.

## Project Structure

```
app/
  main.py           — FastAPI app, all endpoints
  database.py       — Neon PostgreSQL: scans + feedback tables
  ip_analysis.py    — IP reputation via ip-api.com
  ml/
    features.py     — 19 lexical feature extraction
    predict.py      — allowlist + Random Forest inference
    models/
      model.joblib   ← copy your trained model here
      scaler.joblib  ← copy your fitted scaler here
  idn/
    idn_detector.py — IDN homograph detection (Week 9)
```

## Setup

```bash
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
```

## Add model files

Copy `model.joblib` and `scaler.joblib` into:
```
app/ml/models/model.joblib
app/ml/models/scaler.joblib
```

## Connect Neon

```bash
copy .env.example .env
```

Edit `.env` and paste your Neon connection string from neon.tech.

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

On startup the backend will:
- Connect to Neon
- Auto-create `scans` and `feedback` tables
- Log `Neon database ready.`

## Test

Open `http://localhost:8000/docs` for interactive API docs.

## Endpoints

| Method | Path       | Description                        |
|--------|------------|------------------------------------|
| GET    | /health    | Liveness check                     |
| POST   | /analyze   | Classify a URL or IP               |
| GET    | /history   | Recent scans from Neon             |
| POST   | /feedback  | Save Allow / Block / Escalate      |

## Works without Neon

If `DATABASE_URL` is not set:
- `/analyze` still classifies correctly
- `/history` returns a clear 503 with an actionable message
- No scan is lost due to a database error
