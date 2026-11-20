"""
features.py

Extracts 19 lexical features from a URL string.
This file must match exactly what was used during model training.
Any change here requires retraining the model.
"""

import re
import math
from collections import Counter
from urllib.parse import urlparse

# ── Constants ────────────────────────────────────────────────────────────────

SUSPICIOUS_KEYWORDS = [
    'login', 'verify', 'bank', 'update', 'free', 'secure',
    'account', 'confirm', 'signin', 'password', 'paypal', 'wallet',
    'ebayisapi', 'webscr',
]

SHORTENING_SERVICES = [
    'bit.ly', 'tinyurl.com', 'goo.gl', 't.co', 'ow.ly',
    'is.gd', 'buff.ly', 'adf.ly', 'bitly.com', 'rebrand.ly',
]

SUSPICIOUS_TLDS = {
    'xyz', 'top', 'club', 'work', 'click', 'live', 'online', 'site', 'icu',
    'vip', 'men', 'loan', 'win', 'review', 'stream', 'gq', 'tk', 'ml', 'cf',
    'ga', 'info', 'biz', 'cc', 'pw', 'rest', 'fit', 'mom', 'lol',
}

KNOWN_BRANDS = [
    'google', 'youtube', 'facebook', 'amazon', 'wikipedia', 'twitter',
    'instagram', 'linkedin', 'github', 'microsoft', 'apple', 'netflix',
    'paypal', 'ebay', 'bankofamerica', 'chase', 'wellsfargo', 'hdfcbank',
    'icicibank', 'whatsapp', 'outlook', 'adobe', 'dropbox', 'flipkart',
    'irctc', 'sbi', 'citibank', 'americanexpress',
]

LEGITIMATE_BRAND_DOMAINS = {
    'google.com', 'google.co.in', 'youtube.com', 'facebook.com',
    'amazon.com', 'amazon.in', 'wikipedia.org', 'twitter.com', 'x.com',
    'instagram.com', 'linkedin.com', 'github.com', 'microsoft.com',
    'apple.com', 'netflix.com', 'paypal.com', 'ebay.com',
    'hdfcbank.com', 'icicibank.com', 'whatsapp.com', 'outlook.com',
    'adobe.com', 'dropbox.com', 'flipkart.com', 'irctc.co.in',
    'sbi.co.in', 'onlinesbi.sbi', 'citibank.com', 'americanexpress.com',
}

IP_REGEX     = re.compile(r'^(\d{1,3}\.){3}\d{1,3}$')
SCHEME_REGEX = re.compile(r'^[a-z][a-z0-9+.\-]*://', re.IGNORECASE)

# Exact order the model was trained on — do not change
FEATURE_ORDER = [
    'url_length', 'hostname_length', 'path_length',
    'count_dots', 'count_hyphens', 'count_underscores', 'count_slashes',
    'count_question_marks', 'count_equals', 'count_at',
    'count_digits', 'digit_ratio',
    'is_ip_host', 'subdomain_count', 'suspicious_tld', 'brand_impersonation',
    'has_suspicious_keyword', 'is_shortened', 'url_entropy',
]

# ── Helpers ──────────────────────────────────────────────────────────────────

def shannon_entropy(s: str) -> float:
    if not s:
        return 0.0
    counts = Counter(s)
    n = len(s)
    return -sum((c / n) * math.log2(c / n) for c in counts.values())


def normalize_url(raw: str) -> str:
    raw = raw.strip()
    return raw if '://' in raw else 'http://' + raw


def is_brand_impersonation(hostname: str) -> bool:
    if not hostname:
        return False
    parts = hostname.split('.')
    sld = parts[-2] if len(parts) >= 2 else hostname
    for brand in KNOWN_BRANDS:
        if brand in sld and sld != brand:
            registrable = '.'.join(parts[-2:]) if len(parts) >= 2 else hostname
            if hostname in LEGITIMATE_BRAND_DOMAINS or registrable in LEGITIMATE_BRAND_DOMAINS:
                continue
            return True
    return False

# ── Main extraction ──────────────────────────────────────────────────────────

def extract_features(raw_url: str) -> dict:
    """
    Returns a human-readable feature dict.
    Used for both model input (via features_to_vector)
    and the Evidence Log displayed on the frontend.
    """
    raw_url   = str(raw_url).strip()
    normalized = normalize_url(raw_url)

    try:
        parsed = urlparse(normalized)
    except Exception:
        parsed = None

    hostname = (parsed.hostname or '') if parsed else ''
    path     = (parsed.path or '') if parsed else ''
    scheme   = (parsed.scheme or '') if parsed else ''
    is_ip    = bool(IP_REGEX.match(hostname))

    # Scheme-stripped content for all string-based counts
    # (avoids data leakage from scheme-presence artifact in training data)
    content    = SCHEME_REGEX.sub('', raw_url)
    full_lower = content.lower()
    digits     = sum(c.isdigit() for c in content)
    tld        = hostname.rsplit('.', 1)[-1].lower() if '.' in hostname else ''

    return {
        'url_length':            len(content),
        'hostname_length':       len(hostname),
        'path_length':           len(path),
        'count_dots':            hostname.count('.'),
        'count_hyphens':         content.count('-'),
        'count_underscores':     content.count('_'),
        'count_slashes':         content.count('/'),
        'count_question_marks':  content.count('?'),
        'count_equals':          content.count('='),
        'count_at':              content.count('@'),
        'count_digits':          digits,
        'digit_ratio':           round(digits / len(content), 4) if content else 0.0,
        'is_ip_host':            is_ip,
        'uses_https':            scheme == 'https',   # display only, not a model feature
        'subdomain_count':       max(hostname.count('.') - 1, 0) if hostname and not is_ip else 0,
        'suspicious_tld':        tld in SUSPICIOUS_TLDS,
        'brand_impersonation':   is_brand_impersonation(hostname),
        'suspicious_keyword_hit': next((k for k in SUSPICIOUS_KEYWORDS if k in full_lower), None),
        'is_shortened':          any(s in hostname for s in SHORTENING_SERVICES),
        'url_entropy':           round(shannon_entropy(content), 3),
    }


def features_to_vector(features: dict) -> list:
    """
    Converts the feature dict into the exact numeric vector the model expects.
    uses_https excluded (dataset artifact).
    suspicious_keyword_hit collapsed to binary 0/1.
    """
    return [
        features['url_length'],
        features['hostname_length'],
        features['path_length'],
        features['count_dots'],
        features['count_hyphens'],
        features['count_underscores'],
        features['count_slashes'],
        features['count_question_marks'],
        features['count_equals'],
        features['count_at'],
        features['count_digits'],
        features['digit_ratio'],
        int(features['is_ip_host']),
        features['subdomain_count'],
        int(features['suspicious_tld']),
        int(features['brand_impersonation']),
        int(features['suspicious_keyword_hit'] is not None),
        int(features['is_shortened']),
        features['url_entropy'],
    ]
