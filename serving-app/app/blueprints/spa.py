import os
from flask import Blueprint, send_from_directory, current_app

spa_bp = Blueprint("spa", __name__)

@spa_bp.route('/', defaults={'path': ''})
@spa_bp.route('/<path:path>')
def serve_spa(path):
    file_path = os.path.join(current_app.static_folder, path)
    if path != "" and os.path.exists(file_path):
        return send_from_directory(current_app.static_folder, path)
    else:
        return send_from_directory(current_app.static_folder, 'index.html')

@spa_bp.app_errorhandler(404)
def handle_404(e):
    return send_from_directory(current_app.static_folder, 'index.html')
