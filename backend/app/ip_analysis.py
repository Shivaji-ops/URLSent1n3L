"""
ip_analysis.py

IP address classification via ip-api.com (free, no API key needed).
Rule-based scoring on proxy/hosting status and ASN.
Fails soft if the API is unreachable.
"""

import logging
import requests

logger = logging.getLogger(__name__)

IP_API_URL    = 'http://ip-api.com/json/{ip}'
IP_API_FIELDS = 'status,message,country,isp,org,as,proxy,hosting,query'
TIMEOUT       = 5


def analyze_ip(ip: str) -> dict:
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
        return _unavailable()

    is_proxy   = bool(data.get('proxy'))
    is_hosting = bool(data.get('hosting'))
    score      = 20
    flagged    = []

    if is_proxy:
        score += 45
        flagged.append('is_proxy_or_hosting')
    elif is_hosting:
        score += 20
        flagged.append('is_proxy_or_hosting')

    is_mal = score >= 50

    return {
        'verdict':          'Malicious' if is_mal else 'Benign',
        'confidence':       round(min(95, max(50, score)), 1),
        'attack_type':      'Botnet C2' if is_mal else None,
        'features': {
            'country':             data.get('country', 'Unknown'),
            'isp':                 data.get('isp', 'Unknown'),
            'asn':                 data.get('as', 'Unknown'),
            'is_proxy_or_hosting': is_proxy or is_hosting,
            'lookup_status':       'ok',
        },
        'flagged_features': flagged,
        'method':           'ip_lookup',
    }


def _unavailable() -> dict:
    return {
        'verdict':    'Benign',
        'confidence': 50.0,
        'attack_type': None,
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
