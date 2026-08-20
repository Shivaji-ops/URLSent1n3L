"""
ip_analysis.py

IP address classification using live ip-api.com lookup + rule-based scoring.

Why not ML for IPs?
The features needed for ML-based IP classification (request volume, failed
login attempts, port activity, traffic volume) are server/network log data —
only available if you own the network. There's no public API that provides
this for arbitrary IPs. Rule-based scoring on what IS available (proxy status,
hosting reputation, ASN, geo) is the realistic, honest alternative.

Upgrade path: add AbuseIPDB integration (free tier: 1000/day) for a
community-sourced abuse confidence score to complement this rule-based approach.
"""

import logging
import requests

logger = logging.getLogger(__name__)

IP_API_URL     = 'http://ip-api.com/json/{ip}'
IP_API_FIELDS  = 'status,message,country,countryCode,isp,org,as,proxy,hosting,query'
TIMEOUT        = 5  # seconds


def analyze_ip(ip: str) -> dict:
    """
    Classifies an IP address using ip-api.com + rule-based risk scoring.
    Fails safe: if the API is unreachable, returns 50% confidence / Benign
    rather than crashing the /analyze endpoint.
    """
    try:
        resp = requests.get(
            IP_API_URL.format(ip=ip),
            params={'fields': IP_API_FIELDS},
            timeout=TIMEOUT,
        )
        data = resp.json()
    except Exception as e:
        logger.warning(f'IP lookup failed for {ip}: {e}')
        data = None

    if not data or data.get('status') != 'success':
        return _unavailable_response()

    is_proxy   = bool(data.get('proxy'))
    is_hosting = bool(data.get('hosting'))

    # Rule-based risk scoring
    score   = 20  # baseline — most IPs are unremarkable
    flagged = []

    if is_proxy:
        score += 45
        flagged.append('is_proxy_or_hosting')
    elif is_hosting:
        score += 20
        flagged.append('is_proxy_or_hosting')

    confidence = min(95, max(50, score))
    is_malicious = score >= 50

    features = {
        'country':           data.get('country', 'Unknown'),
        'isp':               data.get('isp', 'Unknown'),
        'asn':               data.get('as', 'Unknown'),
        'is_proxy_or_hosting': is_proxy or is_hosting,
        'lookup_status':     'ok',
    }

    return {
        'verdict':          'Malicious' if is_malicious else 'Benign',
        'confidence':       round(confidence, 1),
        'attack_type':      'Botnet C2' if is_malicious else None,
        'features':         features,
        'flagged_features': flagged,
        'method':           'ip_lookup',
    }


def _unavailable_response() -> dict:
    return {
        'verdict':          'Benign',
        'confidence':       50.0,
        'attack_type':      None,
        'features': {
            'country':             'Unknown',
            'isp':                 'Unknown',
            'asn':                 'Unknown',
            'is_proxy_or_hosting': False,
            'lookup_status':       'unavailable',
        },
        'flagged_features': [],
        'method':           'ip_lookup_failed',
    }
