from psycopg.rows import dict_row
from flask import current_app
from app.db.postgres import get_connection
from typing import Optional

DIGITAL_TWIN_SCHEMA = 'digitaL_twin'
DIGITAL_TWIN_TABLE = "digital_twins"


def create_twin(name: str, creator: str, body: str):
    sql = f"""
        INSERT INTO {DIGITAL_TWIN_SCHEMA}.{DIGITAL_TWIN_TABLE} (name, creator, body)
        VALUES (%s, %s, %s)
        ON CONFLICT (name) DO NOTHING
        RETURNING name, creator, created_at, body;
    """
    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(sql, (name, creator, body))
            row = cur.fetchone()
        conn.commit()
    return row

def list_twins(limit: int = 50, offset: int = 0, creator: Optional[str] = None):
    base = f"SELECT name, creator, created_at, body FROM {DIGITAL_TWIN_SCHEMA}.{DIGITAL_TWIN_TABLE}"
    params = []
    where = []
    if creator:
        where.append("creator = %s")
        params.append(creator)
    if where:
        base += " WHERE " + " AND ".join(where)
    base += " ORDER BY created_at DESC LIMIT %s OFFSET %s"
    params.extend([limit, offset])
    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(base, params)
            rows = cur.fetchall()
    return rows

def get_twin(name: str):
    sql = f"SELECT name, creator, created_at, body FROM {DIGITAL_TWIN_SCHEMA}.{DIGITAL_TWIN_TABLE} WHERE name = %s"
    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(sql, (name,))
            row = cur.fetchone()
    return row

def update_twin(name: str, creator: Optional[str] = None, body: Optional[str] = None):
    sets = []
    params = []
    if body is not None:
        sets.append("body = %s")
        params.append(body)
    if creator is not None:
        sets.append("creator = %s")
        params.append(creator)
    if not sets:
        return None
    sql = f"""
        UPDATE {DIGITAL_TWIN_SCHEMA}.{DIGITAL_TWIN_TABLE}
        SET {", ".join(sets)}
        WHERE name = %s
        RETURNING name, creator, created_at, body;
    """
    params.append(name)
    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(sql, params)
            row = cur.fetchone()
        conn.commit()
    return row

def delete_twin(name: str) -> bool:
    sql = f"DELETE FROM {DIGITAL_TWIN_SCHEMA}.{DIGITAL_TWIN_TABLE} WHERE name = %s RETURNING name"
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (name,))
            deleted = cur.fetchone()
        conn.commit()
    return bool(deleted)
