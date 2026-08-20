"""
database.py

PostgreSQL layer for Triage Desk. All scan history, verdicts, and analyst
feedback (Allow / Block / Escalate) is stored here.

Fails soft throughout: if DATABASE_URL isn't set, the app still runs and
/analyze still classifies — scans just won't be persisted. The /history
and /feedback endpoints return clear 503s rather than crashing.
"""

import os
import json
import logging
import psycopg2
from psycopg2.extras import RealDictCursor

logger = logging.getLogger(__name__)

DATABASE_URL = os.environ.get('DATABASE_URL')

# ── Schema ───────────────────────────────────────────────────────────────────

CREATE_SCANS_TABLE = """
CREATE TABLE IF NOT EXISTS scans (
    id              SERIAL PRIMARY KEY,
    input           TEXT NOT NULL,
    type            TEXT NOT NULL,
    verdict         TEXT NOT NULL,
    confidence      NUMERIC NOT NULL,
    attack_type     TEXT,
    features        JSONB,
    flagged_features JSONB,
    method          TEXT,
    scanned_at      TIMESTAMPTZ NOT NULL
);
"""

CREATE_FEEDBACK_TABLE = """
CREATE TABLE IF NOT EXISTS feedback (
    id          SERIAL PRIMARY KEY,
    scan_id     INTEGER REFERENCES scans(id),
    action      TEXT NOT NULL,       -- allow / block / escalate
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
"""

# ── Connection ───────────────────────────────────────────────────────────────

def _get_conn():
    if not DATABASE_URL:
        raise RuntimeError(
            'DATABASE_URL is not set. Copy .env.example to .env and '
            'fill in your PostgreSQL connection string.'
        )
    return psycopg2.connect(DATABASE_URL)


def init_db():
    """Creates tables on startup. Safe to call multiple times."""
    if not DATABASE_URL:
        logger.warning('DATABASE_URL not set — scan history will not be saved.')
        return
    try:
        conn = _get_conn()
        with conn, conn.cursor() as cur:
            cur.execute(CREATE_SCANS_TABLE)
            cur.execute(CREATE_FEEDBACK_TABLE)
        conn.close()
        logger.info('Database ready.')
    except Exception as e:
        logger.warning(f'Database init failed: {e}')


# ── Scans ────────────────────────────────────────────────────────────────────

def insert_scan(
    input_value, scan_type, verdict, confidence,
    attack_type, features, flagged_features, method, scanned_at
) -> int | None:
    """
    Saves a scan and returns its database ID (used as the case number).
    Returns None silently if the DB is unavailable — /analyze still works.
    """
    if not DATABASE_URL:
        return None
    try:
        conn = _get_conn()
        with conn, conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO scans
                    (input, type, verdict, confidence, attack_type,
                     features, flagged_features, method, scanned_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (
                    input_value, scan_type, verdict, confidence, attack_type,
                    json.dumps(features, default=str),
                    json.dumps(flagged_features),
                    method, scanned_at,
                ),
            )
            new_id = cur.fetchone()[0]
        conn.close()
        return new_id
    except Exception as e:
        logger.warning(f'Failed to save scan: {e}')
        return None


def get_recent_scans(limit: int = 20) -> list:
    """Returns the most recent scans, newest first."""
    conn = _get_conn()
    with conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT id, input, type, verdict, confidence, attack_type,
                   features, flagged_features, scanned_at
            FROM scans
            ORDER BY scanned_at DESC
            LIMIT %s
            """,
            (limit,),
        )
        rows = cur.fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ── Feedback ─────────────────────────────────────────────────────────────────

def insert_feedback(scan_id: int, action: str) -> bool:
    """
    Saves an analyst feedback decision (allow / block / escalate).
    These decisions form the active learning dataset for future retraining.
    """
    if not DATABASE_URL:
        return False
    try:
        conn = _get_conn()
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
