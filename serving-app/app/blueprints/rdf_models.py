from flask import Blueprint, request, jsonify
from app.services.rdf_models import (
    create_rdf_model, list_rdf_models, get_rdf_model, update_rdf_model, 
    delete_rdf_model, duplicate_rdf_model, get_model_statistics, search_rdf_models
)
import logging

rdf_models_bp = Blueprint("rdf_models", __name__)

def _validate_model_data(data: dict, required_fields: list = None) -> tuple:
    """Validate model data and return (is_valid, error_message)"""
    if not required_fields:
        required_fields = ['name', 'content']
    
    for field in required_fields:
        if field not in data or not data[field]:
            return False, f"Missing required field: {field}"
    
    # Validate name length
    if len(data.get('name', '')) > 255:
        return False, "Model name must be 255 characters or less"
    
    # Validate category
    valid_categories = ['user', 'template', 'system', 'automotive', 'manufacturing', 'energy', 'oil-gas']
    if 'category' in data and data['category'] not in valid_categories:
        return False, f"Invalid category. Must be one of: {', '.join(valid_categories)}"
    
    return True, None

@rdf_models_bp.post("/rdf-models")
def create_model():
    """Create a new RDF model"""
    try:
        data = request.get_json() or {}
        
        # Validate required fields
        is_valid, error_msg = _validate_model_data(data)
        if not is_valid:
            return jsonify({"error": error_msg}), 400
        
        # Extract creator from headers (if using OAuth)
        creator = request.headers.get("X-Forwarded-Email") or data.get('creator', 'anonymous')
        
        # Create the model
        model = create_rdf_model(
            name=data['name'],
            content=data['content'],
            description=data.get('description', ''),
            category=data.get('category', 'user'),
            is_template=data.get('is_template', False),
            creator=creator,
            metadata=data.get('metadata', {}),
            tags=data.get('tags', [])
        )
        
        if not model:
            return jsonify({
                "error": "Database unavailable - RDF models require Lakebase to be enabled in your Databricks workspace",
                "message": "The model library is currently running with local files only. Database model storage requires Lakebase integration."
            }), 503

        return jsonify(model), 201
        
    except Exception as e:
        logging.error(f"Error creating RDF model: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@rdf_models_bp.get("/rdf-models")
def list_models():
    """List RDF models with optional filtering and pagination"""
    try:
        # Extract query parameters
        limit = min(int(request.args.get('limit', 50)), 100)  # Max 100 items
        offset = int(request.args.get('offset', 0))
        category = request.args.get('category')
        is_template = request.args.get('is_template')
        creator = request.args.get('creator')
        search = request.args.get('search')

        # Convert is_template to boolean if provided
        if is_template is not None:
            is_template = is_template.lower() in ('true', '1', 'yes')

        models = list_rdf_models(
            limit=limit,
            offset=offset,
            category=category,
            is_template=is_template,
            creator=creator,
            search=search
        )

        # Get total count for pagination
        stats = get_model_statistics()

        return jsonify({
            "models": models,
            "pagination": {
                "limit": limit,
                "offset": offset,
                "total": stats['total_models']
            },
            "statistics": stats
        }), 200

    except Exception as e:
        error_msg = str(e)
        logging.error(f"Error listing RDF models: {error_msg}")

        # Check if this is a PostgreSQL unavailability error
        if "PostgreSQL not available" in error_msg:
            return jsonify({
                "error": f"Failed to list RDF models: {error_msg}",
                "service_unavailable": True,
                "fallback_available": True
            }), 503

        return jsonify({"error": "Internal server error"}), 500

@rdf_models_bp.get("/rdf-models/<int:model_id>")
def get_model(model_id: int):
    """Get a specific RDF model by ID"""
    try:
        model = get_rdf_model(model_id=model_id)
        
        if not model:
            return jsonify({"error": "Model not found"}), 404
        
        return jsonify(model), 200
        
    except Exception as e:
        logging.error(f"Error getting RDF model {model_id}: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@rdf_models_bp.get("/rdf-models/by-name/<name>")
def get_model_by_name(name: str):
    """Get a specific RDF model by name"""
    try:
        model = get_rdf_model(name=name)
        
        if not model:
            return jsonify({"error": "Model not found"}), 404
        
        return jsonify(model), 200
        
    except Exception as e:
        logging.error(f"Error getting RDF model '{name}': {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@rdf_models_bp.put("/rdf-models/<int:model_id>")
def update_model(model_id: int):
    """Update an existing RDF model"""
    try:
        data = request.get_json() or {}
        
        # Check if model exists
        existing_model = get_rdf_model(model_id=model_id)
        if not existing_model:
            return jsonify({"error": "Model not found"}), 404
        
        # Extract updatable fields
        update_fields = {}
        for field in ['name', 'description', 'category', 'is_template', 'content', 'metadata', 'tags']:
            if field in data:
                update_fields[field] = data[field]
        
        if not update_fields:
            return jsonify({"error": "No updatable fields provided"}), 400
        
        # Validate if name is being updated
        if 'name' in update_fields:
            if len(update_fields['name']) > 255:
                return jsonify({"error": "Model name must be 255 characters or less"}), 400
        
        # Update the model
        updated_model = update_rdf_model(model_id, **update_fields)
        
        if not updated_model:
            return jsonify({"error": "Update failed"}), 400
        
        return jsonify(updated_model), 200
        
    except Exception as e:
        logging.error(f"Error updating RDF model {model_id}: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@rdf_models_bp.delete("/rdf-models/<int:model_id>")
def delete_model(model_id: int):
    """Delete an RDF model"""
    try:
        success = delete_rdf_model(model_id)
        
        if not success:
            return jsonify({"error": "Model not found"}), 404
        
        return jsonify({"message": "Model deleted successfully"}), 200
        
    except Exception as e:
        logging.error(f"Error deleting RDF model {model_id}: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@rdf_models_bp.post("/rdf-models/<int:model_id>/duplicate")
def duplicate_model(model_id: int):
    """Create a duplicate of an existing RDF model"""
    try:
        data = request.get_json() or {}
        new_name = data.get('name')
        creator = request.headers.get("X-Forwarded-Email") or data.get('creator')
        
        duplicate = duplicate_rdf_model(model_id, new_name, creator)
        
        if not duplicate:
            return jsonify({"error": "Model not found or duplication failed"}), 404
        
        return jsonify(duplicate), 201
        
    except Exception as e:
        logging.error(f"Error duplicating RDF model {model_id}: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@rdf_models_bp.get("/rdf-models/search")
def search_models():
    """Search RDF models"""
    try:
        query = request.args.get('q', '').strip()
        if not query:
            return jsonify({"error": "Search query is required"}), 400
        
        limit = min(int(request.args.get('limit', 20)), 50)
        
        results = search_rdf_models(query, limit)
        
        return jsonify({
            "query": query,
            "results": results,
            "count": len(results)
        }), 200
        
    except Exception as e:
        logging.error(f"Error searching RDF models: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@rdf_models_bp.get("/rdf-models/statistics")
def get_statistics():
    """Get RDF model statistics"""
    try:
        stats = get_model_statistics()
        return jsonify(stats), 200

    except Exception as e:
        error_msg = str(e)
        logging.error(f"Error getting RDF model statistics: {error_msg}")

        # Check if this is a PostgreSQL unavailability error
        if "PostgreSQL not available" in error_msg:
            return jsonify({
                "error": f"Failed to get RDF model statistics: {error_msg}",
                "service_unavailable": True,
                "fallback_available": True
            }), 503

        return jsonify({"error": "Internal server error"}), 500

@rdf_models_bp.post("/rdf-models/bulk-import")
def bulk_import_models():
    """Import multiple RDF models at once (for migration)"""
    try:
        data = request.get_json() or {}
        models_data = data.get('models', [])
        
        if not models_data:
            return jsonify({"error": "No models provided"}), 400
        
        created_models = []
        errors = []
        
        for model_data in models_data:
            try:
                # Validate each model
                is_valid, error_msg = _validate_model_data(model_data)
                if not is_valid:
                    errors.append({"model": model_data.get('name', 'unknown'), "error": error_msg})
                    continue
                
                # Create the model
                creator = request.headers.get("X-Forwarded-Email") or model_data.get('creator', 'system')
                
                model = create_rdf_model(
                    name=model_data['name'],
                    content=model_data['content'],
                    description=model_data.get('description', ''),
                    category=model_data.get('category', 'template'),
                    is_template=model_data.get('is_template', True),
                    creator=creator,
                    metadata=model_data.get('metadata', {}),
                    tags=model_data.get('tags', [])
                )
                
                if model:
                    created_models.append(model)
                else:
                    errors.append({"model": model_data['name'], "error": "Model with this name already exists"})
                    
            except Exception as e:
                errors.append({"model": model_data.get('name', 'unknown'), "error": str(e)})
        
        return jsonify({
            "created": len(created_models),
            "errors": len(errors),
            "models": created_models,
            "error_details": errors
        }), 200 if not errors else 207  # 207 Multi-Status
        
    except Exception as e:
        logging.error(f"Error in bulk import: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@rdf_models_bp.get("/rdf-models/local-templates")
def get_local_templates():
    """Get RDF model templates from local example-ttls directory"""
    import os
    import glob

    try:
        # Get the project root directory (three levels up from this file)
        current_dir = os.path.dirname(os.path.abspath(__file__))
        serving_app_dir = os.path.dirname(os.path.dirname(current_dir))
        project_root = os.path.dirname(serving_app_dir)
        ttl_dir = os.path.join(project_root, 'example-ttls')

        templates = []

        # Find all .ttl files in the example-ttls directory
        ttl_files = glob.glob(os.path.join(ttl_dir, '*.ttl'))

        for ttl_file in ttl_files:
            try:
                filename = os.path.basename(ttl_file)
                name = filename.replace('.ttl', '').replace('_', ' ').title()

                # Read file content
                with open(ttl_file, 'r', encoding='utf-8') as f:
                    content = f.read()

                # Extract description from comments (look for first # comment after prefixes)
                description = "Local TTL file template"
                lines = content.split('\n')
                for line in lines:
                    if line.strip().startswith('# ') and not line.strip().startswith('# This prefix'):
                        description = line.strip()[2:]  # Remove '# '
                        break

                # Determine category based on filename
                category = 'template'
                if 'oil' in filename.lower() or 'rig' in filename.lower():
                    category = 'oil-gas'
                elif 'factory' in filename.lower() or 'manufacturing' in filename.lower():
                    category = 'manufacturing'
                elif 'automotive' in filename.lower():
                    category = 'automotive'

                templates.append({
                    'id': f"local_{filename}",
                    'name': name,
                    'description': description,
                    'category': category,
                    'is_template': True,
                    'content': content,
                    'source': 'local-file',
                    'filename': filename,
                    'file_path': ttl_file,
                    'created_at': os.path.getmtime(ttl_file)
                })

            except Exception as file_error:
                logging.warning(f"Error reading TTL file {ttl_file}: {str(file_error)}")
                continue

        return jsonify({
            "templates": templates,
            "count": len(templates),
            "source": "local-files",
            "directory": ttl_dir
        }), 200

    except Exception as e:
        logging.error(f"Error reading local templates: {str(e)}")
        return jsonify({"error": f"Failed to read local templates: {str(e)}"}), 500