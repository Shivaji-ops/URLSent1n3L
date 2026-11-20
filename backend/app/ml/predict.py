"""
predict.py

Two-stage URL classification:
  1. Allowlist  — verified popular domains bypass the model entirely
  2. ML model   — Random Forest classifies everything else
"""

import os
import logging
import joblib
from urllib.parse import urlparse

from .features import extract_features, features_to_vector, normalize_url

logger = logging.getLogger(__name__)

_DIR    = os.path.dirname(os.path.abspath(__file__))
_MODEL  = None
_SCALER = None


def _load():
    global _MODEL, _SCALER
    if _MODEL is None:
        _MODEL  = joblib.load(os.path.join(_DIR, 'models', 'model.joblib'))
        _SCALER = joblib.load(os.path.join(_DIR, 'models', 'scaler.joblib'))
        logger.info('ML model loaded.')


ALLOWLIST = {
    'google.com', 'youtube.com', 'facebook.com', 'wikipedia.org',
    'amazon.com', 'amazon.in', 'twitter.com', 'x.com', 'instagram.com',
    'linkedin.com', 'github.com', 'stackoverflow.com', 'microsoft.com',
    'apple.com', 'netflix.com', 'reddit.com', 'whatsapp.com', 'yahoo.com',
    'bing.com', 'office.com', 'zoom.us', 'dropbox.com', 'adobe.com',
    'salesforce.com', 'spotify.com', 'paypal.com', 'ebay.com',
    'irctc.co.in', 'sbi.co.in', 'hdfcbank.com', 'icicibank.com',
    'rbi.org.in', 'uidai.gov.in', 'india.gov.in', 'mygov.in',
    'nnrg.edu.in', 'iitb.ac.in', 'iitd.ac.in', 'jntuh.ac.in',
    'geeksforgeeks.org', 'leetcode.com', 'hackerrank.com', 'codechef.com',
    'w3schools.com', 'npmjs.com', 'python.org', 'reactjs.org',
    'vercel.com', 'render.com', 'cloudflare.com', 'wordpress.com',
    'medium.com', 'bbc.com', 'ndtv.com', 'thehindu.com',
    'zomato.com', 'swiggy.com', 'flipkart.com', 'myntra.com',
    'makemytrip.com', 'naukri.com', 'kaggle.com', 'anthropic.com',
    'openai.com', 'figma.com', 'notion.so', 'slack.com', 'docker.com',
    'tensorflow.org', 'pytorch.org',
}


def _registrable(hostname: str) -> str:
    parts = hostname.split('.')
    return '.'.join(parts[-2:]) if len(parts) >= 2 else hostname


def classify_url(raw_url: str) -> dict:
    _load()

    features     = extract_features(raw_url)
    parsed_host  = urlparse(normalize_url(raw_url)).hostname or ''
    reg_domain   = _registrable(parsed_host)

    # Stage 1 — allowlist
    if reg_domain in ALLOWLIST:
        return {
            'verdict':          'Benign',
            'confidence':       99,
            'attack_type':      None,
            'features':         features,
            'flagged_features': [],
            'method':           'allowlist',
        }

    # Stage 2 — ML model
    vector = features_to_vector(features)
    scaled = _SCALER.transform([vector])
    pred   = _MODEL.predict(scaled)[0]
    proba  = _MODEL.predict_proba(scaled)[0]
    is_mal = pred == 1
    conf   = round((proba[1] if is_mal else proba[0]) * 100, 1)

    flagged = []
    if features['is_ip_host']:           flagged.append('is_ip_host')
    if features['suspicious_tld']:       flagged.append('suspicious_tld')
    if features['brand_impersonation']:  flagged.append('brand_impersonation')
    if features['suspicious_keyword_hit']: flagged.append('suspicious_keyword_hit')
    if features['is_shortened']:         flagged.append('is_shortened')

    return {
        'verdict':          'Malicious' if is_mal else 'Benign',
        'confidence':       conf,
        'attack_type':      'Phishing' if is_mal else None,
        'features':         features,
        'flagged_features': flagged,
        'method':           'model',
    }
