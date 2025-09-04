import os
from flask import Flask
from flask_cors import CORS
from app.config import Config
from app.extensions import workspace_client
from app.db.postgres import init_pool_on_first_use
from app.blueprints.triples import triples_bp
from app.blueprints.digital_twins import twins_bp
from app.blueprints.spa import spa_bp

def create_app():
    app = Flask(__name__, static_folder='dist', static_url_path='')
    app.config.from_object(Config)

    # Secret key
    app.secret_key = os.getenv('SECRET_KEY', 'dev-secret-key')

    # Enable CORS - allow all origins for development; restrict for production!
    CORS(app)

    # Initialize components that require app context or env
    init_pool_on_first_use()  # lazy pool build on first DB use

    # Register blueprints
    app.register_blueprint(triples_bp, url_prefix="/api")
    app.register_blueprint(twins_bp, url_prefix="/api")
    app.register_blueprint(spa_bp)

    return app

app = create_app()



if __name__ == '__main__':
    # For local dev
    app.run(debug=True, host='0.0.0.0', port=os.getenv('DATABRICKS_APP_PORT'))


