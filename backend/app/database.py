"""
database.py

PostgreSQL layer using Neon serverless PostgreSQL.
Reads DATABASE_URL from environment (set in .env).

Fails soft throughout:
- If DATABASE_URL is not set, /analyze still classifies correctly
- /history and /feedback return clear 503s instead of crashing
- A failed save never breaks the classification response
"""

import os
import json
import logging
import psycopg2
from psycopg2.extras import RealDictCursor

logger = logging.getLogger(__name__)

DATABASE_URL = os.environ.get('DATABASE_URL')

CREATE_SCANS_TABLE = """
CREATE TABLE IF NOT EXISTS scans (
    id               SERIAL PRIMARY KEY,
    input            TEXT NOT NULL,
    type             TEXT NOT NULL,
    verdict          TEXT NOT NULL,
    confidence       NUMERIC NOT NULL,
    attack_type      TEXT,
    features         JSONB,
    flagged_features JSONB,
    method           TEXT,
    scanned_at       TIMESTAMPTZ NOT NULL
);
"""

# Added after the first release; ALTER keeps existing databases in step.
ADD_IP_INFO_COLUMN = "ALTER TABLE scans ADD COLUMN IF NOT EXISTS ip_info JSONB;"

CREATE_FEEDBACK_TABLE = """
CREATE TABLE IF NOT EXISTS feedback (
    id         SERIAL PRIMARY KEY,
    scan_id    INTEGER REFERENCES scans(id),
    action     TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
"""


def _conn():
    if not DATABASE_URL:
        raise RuntimeError(
            'DATABASE_URL not set. Copy .env.example to .env and add your Neon connection string.'
        )
    return psycopg2.connect(DATABASE_URL)


def init_db():
    """Creates tables on startup. Safe to call multiple times."""
    if not DATABASE_URL:
        logger.warning('DATABASE_URL not set — scan history will not be saved.')
        return
    try:
        conn = _conn()
        with conn, conn.cursor() as cur:
            cur.execute(CREATE_SCANS_TABLE)
            cur.execute(ADD_IP_INFO_COLUMN)
            cur.execute(CREATE_FEEDBACK_TABLE)
        conn.close()
        logger.info('Neon database ready.')
    except Exception as e:
        logger.warning(f'Database init failed: {e}')


def insert_scan(
    input_value, scan_type, verdict, confidence,
    attack_type, features, flagged_features, method, scanned_at, ip_info=None
) -> int | None:
    """Saves a scan and returns its database ID (used as the case number)."""
    if not DATABASE_URL:
        return None
    try:
        conn = _conn()
        with conn, conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO scans
                    (input, type, verdict, confidence, attack_type,
                     features, flagged_features, method, scanned_at, ip_info)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (
                    input_value, scan_type, verdict, float(confidence), attack_type,
                    json.dumps(features, default=str),
                    json.dumps(flagged_features),
                    method, scanned_at,
                    json.dumps(ip_info, default=str) if ip_info else None,
                ),
            )
            new_id = cur.fetchone()[0]
        conn.close()
        return new_id
    except Exception as e:
        logger.warning(f'Failed to save scan: {e}')
        return None


def get_recent_scans(limit: int = 20) -> list:
    """Returns the most recent scans from Neon, newest first."""
    conn = _conn()
    with conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT id, input, type, verdict, confidence, attack_type,
                   features, flagged_features, ip_info, scanned_at
            FROM scans
            ORDER BY scanned_at DESC
            LIMIT %s
            """,
            (limit,),
        )
        rows = cur.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def insert_feedback(scan_id: int, action: str) -> bool:
    """
    Saves an analyst decision (allow / block / escalate).
    These build the active learning dataset for future retraining.
    """
    if not DATABASE_URL:
        return False
    try:
        conn = _conn()
        with conn, conn.cursor() as cur:
            cur.execute(
                'INSERT INTO feedback (scan_id, action) VALUES (%s, %s)',
                (scan_id, action),
            )
        conn.close()
        return True
    except Exception as e:
        logger.warning(f'Failed to save feedback: {e}')
        return False


def get_latest_action(input_value: str) -> dict | None:
    """
    Returns the most recent analyst decision for this input, or None.
    Matches case-insensitively and ignores a trailing slash, so
    'Example.com/' and 'example.com' count as the same indicator.
    """
    if not DATABASE_URL:
        return None
    try:
        conn = _conn()
        with conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT f.action, f.scan_id, f.created_at
                FROM feedback f
                JOIN scans s ON s.id = f.scan_id
                WHERE lower(rtrim(s.input, '/')) = lower(rtrim(%s, '/'))
                ORDER BY f.created_at DESC, f.id DESC
                LIMIT 1
                """,
                (input_value,),
            )
            row = cur.fetchone()
        conn.close()
        return dict(row) if row else None
    except Exception as e:
        logger.warning(f'Failed to look up analyst action: {e}')
        return None
