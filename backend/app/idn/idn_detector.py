"""
idn_detector.py

IDN Homograph Attack Detection — stub for Week 9 full implementation.

Detection pipeline (to be completed):
  1. Check for non-ASCII Unicode characters
  2. Convert to Punycode (RFC 3492)
  3. Map each Unicode char to ASCII lookalike via Unicode confusables dataset
  4. Reconstruct ASCII skeleton domain
  5. Match against known brand domains
  6. Return verdict with detected chars and lookalike domain
"""

import unicodedata


def is_idn(hostname: str) -> bool:
    try:
        hostname.encode('ascii')
        return False
    except UnicodeEncodeError:
        return True


def detect(hostname: str) -> dict:
    """
    Runs IDN homograph detection on a hostname.
    Currently detects non-ASCII characters and reports them.
    Full confusable mapping implemented in Week 9.
    """
    if not is_idn(hostname):
        return {
            'homograph_detected':  False,
            'unicode_chars_found': [],
            'lookalike_domain':    None,
            'attack_type':         None,
        }

    unicode_chars = []
    for char in hostname:
        try:
            char.encode('ascii')
        except UnicodeEncodeError:
            unicode_chars.append({
                'char':      char,
                'codepoint': f'U+{ord(char):04X}',
                'name':      unicodedata.name(char, 'UNKNOWN'),
            })

    return {
        'homograph_detected':  len(unicode_chars) > 0,
        'unicode_chars_found': unicode_chars,
        'lookalike_domain':    None,  # populated in Week 9
        'attack_type':         'IDN Homograph' if unicode_chars else None,
    }
