from flask import Blueprint, request, jsonify
from app.services.digital_twins import (
    create_twin, list_twins, get_twin, update_twin, delete_twin
)
from app.services.rdf_models import (
    create_rdf_model, list_rdf_models, get_rdf_model, update_rdf_model,
    delete_rdf_model, duplicate_rdf_model, get_model_statistics, search_rdf_models
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

# RDF Models endpoints
@twins_bp.post("/rdf-models")
def create_rdf_model_endpoint():
    payload = request.get_json(silent=True) or {}
    name = payload.get('name')
    content = payload.get('content')
    description = payload.get('description', '')
    category = payload.get('category', 'user')
    is_template = payload.get('is_template', False)
    creator = request.headers.get("X-Forwarded-Email") or payload.get('creator', "unknown")
    metadata = payload.get('metadata', {})
    tags = payload.get('tags', [])

    if not name or not content:
        return jsonify(error="Invalid payload: name and content are required"), 400

    try:
        row = create_rdf_model(
            name=name, content=content, description=description,
            category=category, is_template=is_template, creator=creator,
            metadata=metadata, tags=tags
        )
        if not row:
            return jsonify(error="RDF model with this name already exists"), 409
        return jsonify(row), 201
    except Exception as e:
        return jsonify(error=f"Failed to create RDF model: {str(e)}"), 500

@twins_bp.get("/rdf-models")
def list_rdf_models_endpoint():
    try:
        limit = int(request.args.get('limit', '50'))
        offset = int(request.args.get('offset', '0'))
    except ValueError:
        return jsonify(error="limit and offset must be integers"), 400

    category = request.args.get('category')
    is_template = request.args.get('is_template')
    if is_template is not None:
        is_template = is_template.lower() == 'true'
    creator = request.args.get('creator')
    search = request.args.get('search')

    try:
        models = list_rdf_models(
            limit=limit, offset=offset, category=category,
            is_template=is_template, creator=creator, search=search
        )
        statistics = get_model_statistics()
        return jsonify({"models": models, "statistics": statistics}), 200
    except Exception as e:
        return jsonify(error=f"Failed to list RDF models: {str(e)}"), 500

@twins_bp.get("/rdf-models/<int:model_id>")
def get_rdf_model_endpoint(model_id):
    try:
        model = get_rdf_model(model_id=model_id)
        if not model:
            return jsonify(error="RDF model not found"), 404
        return jsonify(model), 200
    except Exception as e:
        return jsonify(error=f"Failed to get RDF model: {str(e)}"), 500

@twins_bp.get("/rdf-models/by-name/<name>")
def get_rdf_model_by_name_endpoint(name):
    try:
        model = get_rdf_model(name=name)
        if not model:
            return jsonify(error="RDF model not found"), 404
        return jsonify(model), 200
    except Exception as e:
        return jsonify(error=f"Failed to get RDF model: {str(e)}"), 500

@twins_bp.put("/rdf-models/<int:model_id>")
def update_rdf_model_endpoint(model_id):
    payload = request.get_json(silent=True) or {}

    if not payload:
        return jsonify(error="No update data provided"), 400

    try:
        row = update_rdf_model(
            model_id=model_id,
            name=payload.get('name'),
            content=payload.get('content'),
            description=payload.get('description'),
            category=payload.get('category'),
            is_template=payload.get('is_template'),
            creator=payload.get('creator'),
            metadata=payload.get('metadata'),
            tags=payload.get('tags')
        )
        if not row:
            return jsonify(error="RDF model not found or no changes made"), 404
        return jsonify(row), 200
    except Exception as e:
        return jsonify(error=f"Failed to update RDF model: {str(e)}"), 500

@twins_bp.delete("/rdf-models/<int:model_id>")
def delete_rdf_model_endpoint(model_id):
    try:
        ok = delete_rdf_model(model_id)
        if not ok:
            return jsonify(error="RDF model not found"), 404
        return jsonify(status="deleted", id=model_id), 200
    except Exception as e:
        return jsonify(error=f"Failed to delete RDF model: {str(e)}"), 500

@twins_bp.post("/rdf-models/<int:model_id>/duplicate")
def duplicate_rdf_model_endpoint(model_id):
    payload = request.get_json(silent=True) or {}
    new_name = payload.get('name')
    creator = request.headers.get("X-Forwarded-Email") or payload.get('creator')

    try:
        duplicated_model = duplicate_rdf_model(model_id, new_name, creator)
        if not duplicated_model:
            return jsonify(error="Original RDF model not found"), 404
        return jsonify(duplicated_model), 201
    except Exception as e:
        return jsonify(error=f"Failed to duplicate RDF model: {str(e)}"), 500

@twins_bp.get("/rdf-models/search")
def search_rdf_models_endpoint():
    query = request.args.get('q')
    if not query:
        return jsonify(error="Search query is required"), 400

    try:
        limit = int(request.args.get('limit', '20'))
    except ValueError:
        return jsonify(error="limit must be an integer"), 400

    try:
        results = search_rdf_models(query, limit)
        return jsonify(results), 200
    except Exception as e:
        return jsonify(error=f"Failed to search RDF models: {str(e)}"), 500

@twins_bp.get("/rdf-models/statistics")
def get_rdf_model_statistics_endpoint():
    try:
        stats = get_model_statistics()
        return jsonify(stats), 200
    except Exception as e:
        return jsonify(error=f"Failed to get RDF model statistics: {str(e)}"), 500

@twins_bp.post("/rdf-models/bulk-import")
def bulk_import_rdf_models_endpoint():
    payload = request.get_json(silent=True) or {}
    models = payload.get('models', [])

    if not models or not isinstance(models, list):
        return jsonify(error="Invalid payload: models array is required"), 400

    try:
        creator = request.headers.get("X-Forwarded-Email") or "bulk-import-user"

        # Process models with creator
        processed_models = []
        for model in models:
            processed_model = {**model}
            if not processed_model.get('creator'):
                processed_model['creator'] = creator
            processed_models.append(processed_model)

        results = []
        for model_data in processed_models:
            try:
                result = create_rdf_model(
                    name=model_data.get('name'),
                    content=model_data.get('content'),
                    description=model_data.get('description', ''),
                    category=model_data.get('category', 'user'),
                    is_template=model_data.get('is_template', False),
                    creator=model_data.get('creator', creator),
                    metadata=model_data.get('metadata', {}),
                    tags=model_data.get('tags', [])
                )

                if result:
                    results.append({"status": "created", "model": result})
                else:
                    results.append({"status": "exists", "name": model_data.get('name')})

            except Exception as e:
                results.append({"status": "error", "name": model_data.get('name'), "error": str(e)})

        created_count = sum(1 for r in results if r['status'] == 'created')
        error_count = sum(1 for r in results if r['status'] == 'error')
        exists_count = sum(1 for r in results if r['status'] == 'exists')

        return jsonify({
            "created": created_count,
            "errors": error_count,
            "already_exists": exists_count,
            "details": results,
            "total_attempted": len(processed_models)
        }), 200

    except Exception as e:
        return jsonify(error=f"Failed to bulk import RDF models: {str(e)}"), 500
