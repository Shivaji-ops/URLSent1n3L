"""
idn_detector.py

IDN (Internationalized Domain Name) Homograph Attack Detection.

STATUS: Stub — full implementation planned for Week 9.

The detection pipeline will:
  1. Check if the domain contains any non-ASCII Unicode characters
  2. Convert to Punycode (the actual DNS representation)
  3. Map each Unicode character to its ASCII lookalike using the
     Unicode Consortium's official confusables dataset
  4. Reconstruct the ASCII lookalike domain
  5. Check the lookalike against known brand domains
  6. Return verdict with detected characters and lookalike domain

Example attack this will catch:
  pаypal.com (Cyrillic а, U+0430) → looks identical to paypal.com
  heⅼlo-demo.com (U+2113 ℓ) → looks identical to hello-demo.com

Why existing detectors miss this:
  - Standard string matching fails because the characters are different
    at the byte level even though they look identical on screen
  - OCR-based approaches (the common academic approach) fail against
    Unicode characters that OCR can't visually distinguish
  - Our approach uses the Unicode confusables dataset directly,
    which is the authoritative source for visual character similarity
"""

import unicodedata


def is_idn_domain(hostname: str) -> bool:
    """Returns True if the hostname contains any non-ASCII characters."""
    try:
        hostname.encode('ascii')
        return False
    except UnicodeEncodeError:
        return True


def detect(hostname: str) -> dict:
    """
    Runs IDN homograph detection on a hostname.

    Returns:
        {
            'homograph_detected': bool,
            'unicode_chars_found': list,
            'lookalike_domain': str | None,
            'attack_type': str | None,
        }

    Currently returns a safe default (no attack detected) until
    the full implementation is built in Week 9 using the Unicode
    confusables dataset.
    """
    if not is_idn_domain(hostname):
        return {
            'homograph_detected': False,
            'unicode_chars_found': [],
            'lookalike_domain': None,
            'attack_type': None,
        }

    # Collect non-ASCII characters for reporting
    unicode_chars = []
    for char in hostname:
        try:
            char.encode('ascii')
        except UnicodeEncodeError:
            codepoint = f'U+{ord(char):04X}'
            name = unicodedata.name(char, 'UNKNOWN')
            unicode_chars.append({'char': char, 'codepoint': codepoint, 'name': name})

    # TODO (Week 9): Load confusables dataset, map each Unicode char
    # to its ASCII equivalent, reconstruct lookalike domain, check
    # against known brands

    return {
        'homograph_detected': len(unicode_chars) > 0,
        'unicode_chars_found': unicode_chars,
        'lookalike_domain': None,   # populated in Week 9
        'attack_type': 'IDN Homograph' if unicode_chars else None,
    }
