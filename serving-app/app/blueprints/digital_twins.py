from flask import Blueprint, request, jsonify
from app.services.digital_twins import (
    create_twin, list_twins, get_twin, update_twin, delete_twin
)

twins_bp = Blueprint("digital_twins", __name__)

def _validate_name(name: str) -> bool:
    return isinstance(name, str) and 1 <= len(name) <= 255

def _validate_body(body: str) -> bool:
    return isinstance(body, str) and len(body) > 0

@twins_bp.post("/digital-twins")
def create_digital_twin():
    payload = request.get_json(silent=True) or {}
    name = payload.get('name')
    creator = request.headers.get("X-Forwarded-Email") or "unknown"
    body = payload.get('body')
    if not (_validate_name(name) and isinstance(creator, str) and _validate_body(body)):
        return jsonify(error="Invalid payload: require non-empty name, creator, body"), 400
    row = create_twin(name, creator, body)
    if not row:
        return jsonify(error="Digital twin with this name already exists"), 409
    return jsonify(row), 201

@twins_bp.get("/digital-twins")
def list_digital_twin():
    try:
        limit = int(request.args.get('limit', '50'))
        offset = int(request.args.get('offset', '0'))
    except ValueError:
        return jsonify(error="limit and offset must be integers"), 400
    creator = request.args.get('creator')
    rows = list_twins(limit=limit, offset=offset, creator=creator)
    return jsonify(rows), 200

@twins_bp.get("/digital-twins/<name>")
def get_digital_twin(name):
    if not _validate_name(name):
        return jsonify(error="Invalid name"), 400
    row = get_twin(name)
    if not row:
        return jsonify(error="Not found"), 404
    return jsonify(row), 200

@twins_bp.put("/digital-twins/<name>")
def update_digital_twin(name):
    if not _validate_name(name):
        return jsonify(error="Invalid name"), 400
    payload = request.get_json(silent=True) or {}
    body = payload.get('body')
    creator = payload.get('creator')
    # Reject empty update
    if body is None and creator is None:
        return jsonify(error="No updatable fields provided"), 400
    if body is not None and not _validate_body(body):
        return jsonify(error="Invalid body"), 400
    if creator is not None and (not isinstance(creator, str) or not creator):
        return jsonify(error="Invalid creator"), 400
    row = update_twin(name, creator=creator, body=body)
    if not row:
        return jsonify(error="Not found"), 404
    return jsonify(row), 200

@twins_bp.delete("/digital-twins/<name>")
def delete_digital_twin(name):
    if not _validate_name(name):
        return jsonify(error="Invalid name"), 400
    ok = delete_twin(name)
    if not ok:
        return jsonify(error="Not found"), 404
    return jsonify(status="deleted", name=name), 200
