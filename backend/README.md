# Triage Desk — Backend v2

FastAPI backend for URL/IP malicious indicator classification.

## Project Structure

```
app/
  main.py           — FastAPI app, all endpoints
  database.py        — PostgreSQL: scans + feedback tables
  ip_analysis.py     — IP reputation lookup via ip-api.com
  ml/
    features.py      — 19 lexical feature extraction (must match training)
    predict.py       — allowlist check + Random Forest inference
    models/
      model.joblib   ← put your trained model here
      scaler.joblib  ← put your fitted scaler here
  idn/
    idn_detector.py  — IDN homograph detection (stub, Week 9)
```

## Setup

```bash
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

pip install -r requirements.txt
```

## Add your model files

Copy `model.joblib` and `scaler.joblib` from your training output into:
```
app/ml/models/model.joblib
app/ml/models/scaler.joblib
```

## Configure database (optional)

```bash
copy .env.example .env      # Windows
# cp .env.example .env      # Mac/Linux
```

Edit `.env` and fill in your `DATABASE_URL`.
The app works fine without a database — `/analyze` still classifies,
scans just won't be saved to history.

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

## Test

Open `http://localhost:8000/docs` for the interactive API documentation.

## Endpoints

| Method | Path        | Description                          |
|--------|-------------|--------------------------------------|
| GET    | /health     | Liveness check                       |
| POST   | /analyze    | Classify a URL or IP                 |
| GET    | /history    | Recent scan history from DB          |
| POST   | /feedback   | Save Allow / Block / Escalate action |

## Adding your model files

The model files are not included in this zip (too large).
They come from running `Triage_Desk_Model_Training.ipynb` in Google Colab.
After training, download `models/model.joblib` and `models/scaler.joblib`
and place them in `app/ml/models/`.
