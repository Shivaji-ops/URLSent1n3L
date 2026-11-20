"""
ip_analysis.py

IP intelligence, used two ways:
  - directly, when the analyst submits an IP       -> analyze_ip()
  - for URLs, on the IP the hostname resolves to   -> resolve_host() + lookup_ip()

Sources:
  - ip-api.com   — geo / ISP / ASN / proxy / hosting (free, no key)
  - Tor Project  — official list of Tor exit nodes (free, cached for an hour)
  - AbuseIPDB    — community abuse reports, 0..100 confidence
                   (optional: set ABUSEIPDB_API_KEY in .env, free tier is enough)

Fails soft throughout: an unreachable source just means less evidence.
"""

import os
import time
import socket
import logging
import ipaddress
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeout

import requests

logger = logging.getLogger(__name__)

IP_API_URL    = 'http://ip-api.com/json/{ip}'
IP_API_FIELDS = 'status,message,country,city,isp,org,as,proxy,hosting,query'
ABUSEIPDB_URL = 'https://api.abuseipdb.com/api/v2/check'
TOR_EXITS_URL = 'https://check.torproject.org/torbulkexitlist'
TOR_CACHE_TTL = 3600
TIMEOUT       = 5
DNS_TIMEOUT   = 3

# IP risk is "malicious" from this score up
IP_MALICIOUS_AT = 50

_dns_pool = ThreadPoolExecutor(max_workers=4)
_tor_exits: set[str] = set()
_tor_fetched_at = 0.0


# ── Resolution ────────────────────────────────────────────────────────────────

def resolve_host(hostname: str) -> list[str]:
    """
    Resolves a hostname to its IP addresses, IPv4 first.
    Returns [] if it does not resolve (dead / unregistered / taken down).
    """
    if not hostname:
        return []
    try:
        ipaddress.ip_address(hostname)
        return [hostname]                       # already an IP literal
    except ValueError:
        pass

    try:
        infos = _dns_pool.submit(socket.getaddrinfo, hostname, None).result(timeout=DNS_TIMEOUT)
    except (FutureTimeout, socket.gaierror, UnicodeError, OSError) as e:
        logger.info(f'DNS resolution failed for {hostname}: {e}')
        return []

    ips = []
    for family, *_, sockaddr in infos:
        ip = sockaddr[0]
        if ip not in ips:
            ips.append(ip)
    return sorted(ips, key=lambda ip: ':' in ip)  # IPv4 before IPv6


def is_public(ip: str) -> bool:
    try:
        return ipaddress.ip_address(ip).is_global
    except ValueError:
        return False


# ── Lookups ───────────────────────────────────────────────────────────────────

def _ip_api(ip: str) -> dict | None:
    try:
        resp = requests.get(IP_API_URL.format(ip=ip), params={'fields': IP_API_FIELDS}, timeout=TIMEOUT)
        data = resp.json()
    except Exception as e:
        logger.warning(f'ip-api lookup failed for {ip}: {e}')
        return None
    return data if data.get('status') == 'success' else None


def _abuseipdb(ip: str) -> dict | None:
    key = os.environ.get('ABUSEIPDB_API_KEY')
    if not key:
        return None
    try:
        resp = requests.get(
            ABUSEIPDB_URL,
            params={'ipAddress': ip, 'maxAgeInDays': 90},
            headers={'Key': key, 'Accept': 'application/json'},
            timeout=TIMEOUT,
        )
        resp.raise_for_status()
        return resp.json().get('data')
    except Exception as e:
        logger.warning(f'AbuseIPDB lookup failed for {ip}: {e}')
        return None


def _is_tor_exit(ip: str) -> bool:
    """Checks the Tor Project's exit list; refreshes it at most once an hour."""
    global _tor_exits, _tor_fetched_at
    if time.time() - _tor_fetched_at > TOR_CACHE_TTL:
        _tor_fetched_at = time.time()          # set first: a failed fetch is not retried per request
        try:
            resp = requests.get(TOR_EXITS_URL, timeout=TIMEOUT)
            resp.raise_for_status()
            _tor_exits = {line.strip() for line in resp.text.splitlines() if line.strip()}
        except Exception as e:
            logger.warning(f'Tor exit list fetch failed: {e}')
    return ip in _tor_exits


def lookup_ip(ip: str) -> dict:
    """
    Collects everything known about one IP, plus its risk score.
    `risk` is None when there was nothing to score (private IP or all lookups failed).
    """
    info = {
        'ip':            ip,
        'country':       None,
        'city':          None,
        'isp':           None,
        'asn':           None,
        'is_proxy':      False,
        'is_hosting':    False,
        'abuse_score':   None,   # 0..100 from AbuseIPDB, None if not configured
        'abuse_reports': None,
        'is_tor':        False,
        'status':        'ok',
    }

    if not is_public(ip):
        info['status'] = 'private'
        info.update(risk=None, flagged=[])
        return info

    geo   = _ip_api(ip)
    abuse = _abuseipdb(ip)

    if geo:
        info.update(
            country=geo.get('country'),
            city=geo.get('city'),
            isp=geo.get('isp'),
            asn=geo.get('as'),
            is_proxy=bool(geo.get('proxy')),
            is_hosting=bool(geo.get('hosting')),
        )
    if abuse:
        info.update(
            abuse_score=abuse.get('abuseConfidenceScore'),
            abuse_reports=abuse.get('totalReports'),
            is_tor=bool(abuse.get('isTor')),
        )
    if _is_tor_exit(ip):
        info['is_tor'] = True
    if not geo and not abuse:
        info['status'] = 'unavailable'
        info.update(risk=None, flagged=[])
        return info

    risk, flagged = score_ip(info)
    info.update(risk=risk, flagged=flagged)
    return info


def score_ip(info: dict) -> tuple[int, list[str]]:
    """
    IP risk, 0..100. Rule scores and the AbuseIPDB score are combined with max(),
    so a well-reported IP is never diluted by a clean geo lookup.

        Tor exit node          60   (verified against the Tor Project list)
        proxy / VPN            40   (ip-api's flag is noisy: it marks public
                                     DNS resolvers like 8.8.8.8, so alone it
                                     stays below the malicious line)
        hosting / datacenter   10   (most legitimate sites sit on a CDN/cloud)
        AbuseIPDB confidence   as reported
    """
    rule    = 0
    flagged = []

    if info['is_tor']:
        rule = 60
        flagged.append('ip_is_tor_exit')
    elif info['is_proxy']:
        rule = 40
        flagged.append('ip_is_proxy')
    elif info['is_hosting']:
        rule = 10
        flagged.append('ip_is_hosting')

    abuse = info['abuse_score'] or 0
    if abuse >= 25:
        flagged.append('ip_abuse_reported')

    return max(rule, abuse), flagged


# ── Direct IP input ───────────────────────────────────────────────────────────

def analyze_ip(ip: str) -> dict:
    info = lookup_ip(ip)
    risk = info['risk']

    if risk is None:
        verdict, confidence, attack = 'Benign', 50.0, None
    else:
        is_mal     = risk >= IP_MALICIOUS_AT
        verdict    = 'Malicious' if is_mal else 'Benign'
        confidence = float(min(99, max(50, risk if is_mal else 100 - risk)))
        attack     = _ip_attack_type(info) if is_mal else None

    return {
        'verdict':          verdict,
        'confidence':       confidence,
        'attack_type':      attack,
        'features': {
            'country':       info['country'] or 'Unknown',
            'isp':           info['isp'] or 'Unknown',
            'asn':           info['asn'] or 'Unknown',
            'is_proxy':      info['is_proxy'],
            'is_tor':        info['is_tor'],
            'is_hosting':    info['is_hosting'],
            'abuse_score':   info['abuse_score'],
            'lookup_status': info['status'],
        },
        'flagged_features': info['flagged'],
        'method':           'ip_lookup' if risk is not None else 'ip_lookup_failed',
        'ip_info':          info,
        'risk':             {'url_model': None, 'ip': risk, 'combined': risk},
    }


def _ip_attack_type(info: dict) -> str:
    if (info['abuse_score'] or 0) >= IP_MALICIOUS_AT:
        return 'Reported abusive IP'
    if info['is_tor']:
        return 'Tor exit node'
    return 'Suspicious infrastructure'
