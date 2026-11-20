"""
url_ip_fusion.py

Ties a URL to the IP data behind it:
  1. Resolve the URL's hostname to its server IP(s)
  2. Look up the first public IP (geo / ASN / proxy / hosting / abuse reports)
  3. Combine URL-model risk and IP risk into one score

    combined = 0.75 * url_risk + 0.25 * ip_risk
    + floor of 80 if AbuseIPDB confidence >= 75 (a heavily reported server)
    + 10 if the hostname does not resolve at all (dead / taken-down / unregistered)

The URL model stays the main signal; IP data can push a borderline URL over
the line but cannot on its own flip a confident model verdict.
"""

from .ip_analysis import lookup_ip, resolve_host, is_public

URL_WEIGHT        = 0.75
IP_WEIGHT         = 0.25
ABUSE_FLOOR_AT    = 75
ABUSE_FLOOR       = 80
NO_DNS_PENALTY    = 10
MALICIOUS_AT      = 50


def enrich_url(result: dict, hostname: str) -> dict:
    """Adds `ip_info` and `risk` to a classify_url() result and re-decides the verdict."""
    url_risk = _malicious_risk(result)
    ips      = resolve_host(hostname)

    if not ips:
        info = {'ip': None, 'all_ips': [], 'status': 'unresolved', 'risk': None, 'flagged': []}
        result['flagged_features'].append('dns_unresolved')
        combined = min(100.0, url_risk + NO_DNS_PENALTY)
    else:
        target = next((ip for ip in ips if is_public(ip)), ips[0])
        info   = lookup_ip(target)
        info['all_ips'] = ips
        result['flagged_features'].extend(info['flagged'])

        if info['risk'] is None:
            combined = url_risk
        else:
            combined = URL_WEIGHT * url_risk + IP_WEIGHT * info['risk']
            if (info['abuse_score'] or 0) >= ABUSE_FLOOR_AT:
                combined = max(combined, ABUSE_FLOOR)

    combined = round(combined, 1)
    result['ip_info'] = info
    result['risk']    = {'url_model': url_risk, 'ip': info['risk'], 'combined': combined}

    # Allowlisted domains keep their verdict; the IP data is still shown.
    if result.get('method') == 'allowlist':
        return result

    is_mal = combined >= MALICIOUS_AT
    if is_mal and result['verdict'] != 'Malicious':
        result['attack_type'] = 'Malicious hosting (IP data)'
    elif not is_mal:
        result['attack_type'] = None
    result['verdict']    = 'Malicious' if is_mal else 'Benign'
    result['confidence'] = combined if is_mal else round(100 - combined, 1)
    return result


def _malicious_risk(result: dict) -> float:
    """Model confidence is in its own verdict; turn it into P(malicious) x 100."""
    conf = float(result['confidence'])
    return round(conf if result['verdict'] == 'Malicious' else 100 - conf, 1)
