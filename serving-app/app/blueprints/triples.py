from flask import Blueprint, request
from app.services.triples import fetch_postgres, fetch_dbsql

triples_bp = Blueprint("triples", __name__)

@triples_bp.get("/latest")
def latest_triples():
    result = fetch_postgres()
    return result, 200, {'Content-Type': 'text/turtle; charset=utf-8'}

@triples_bp.get("/pit")
def point_in_time():
    ts = request.args.get('timestamp')
    if not ts:
        return "Missing required 'ts' (timestamp) query parameter", 400
    result = fetch_dbsql(ts)
    return result, 200, {'Content-Type': 'text/turtle; charset=utf-8'}
