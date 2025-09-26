# Load environment variables first
import load_env

from flask import Flask, render_template, request
import rdflib
import os
import time
from databricks import sdk
from databricks import sql as dbsql
from databricks.sdk.core import Config
from psycopg_pool import ConnectionPool
from functools import lru_cache

# Postgres connection details
workspace_client = sdk.WorkspaceClient()
postgres_password = None
last_password_refresh = 0
connection_pool = None
SYNCED_TABLE_FULL_NAME = os.environ.get("SYNCED_TABLE_FULL_NAME")

# DBSQL connection details
WAREHOUSE_ID = os.environ.get("WAREHOUSE_ID")
WAREHOUSE_HTTP = f"/sql/1.0/warehouses/{WAREHOUSE_ID}"
TRIPLE_TABLE_FULL_NAME = os.environ.get("TRIPLE_TABLE_FULL_NAME")
cfg = Config()

@lru_cache(maxsize=1)
def get_dbsql_connection():
    from app.config import Config as AppConfig
    return dbsql.connect(
        server_hostname=AppConfig.DATABRICKS_HOST,
        http_path=AppConfig.WAREHOUSE_HTTP,
        credentials_provider=lambda: cfg.authenticate,
    )

def refresh_oauth_token():
    global postgres_password, last_password_refresh
    if postgres_password is None or time.time() - last_password_refresh > 900:
        print("Refreshing PostgreSQL OAuth token")
        try:
            postgres_password = workspace_client.config.oauth_token().access_token
            last_password_refresh = time.time()
        except Exception as e:
            print(f"❌ Failed to refresh OAuth token: {str(e)}")
            return False
    return True

def get_connection_pool():
    global connection_pool
    if connection_pool is None:
        refresh_oauth_token()
        conn_string = (
            f"dbname={os.getenv('PGDATABASE')} "
            f"user={os.getenv('PGUSER')} "
            f"password={postgres_password} "
            f"host={os.getenv('PGHOST')} "
            f"port={os.getenv('PGPORT')} "
            f"sslmode={os.getenv('PGSSLMODE', 'require')} "
            f"application_name={os.getenv('PGAPPNAME')}"
        )
        connection_pool = ConnectionPool(conn_string, min_size=2, max_size=10)
    return connection_pool

def get_postgres_connection():
    global connection_pool
    
    # Recreate pool if token expired
    if postgres_password is None or time.time() - last_password_refresh > 900:
        if connection_pool:
            connection_pool.close()
            connection_pool = None
    
    return get_connection_pool().connection()

def fetch_postgres() -> str:
    g = rdflib.Graph()
    with get_postgres_connection() as conn:
        with conn.cursor() as cur:
            # type statements
            cur.execute(f"SELECT s, p, o FROM {SYNCED_TABLE_FULL_NAME} WHERE p = 'rdf:type'")
            for row in cur:
                g.add((rdflib.URIRef(row[0]), rdflib.RDF.type, rdflib.URIRef(row[2]),))

            # everything else
            cur.execute(f"SELECT s, p, o FROM {SYNCED_TABLE_FULL_NAME} WHERE p <> 'rdf:type'")
            for row in cur:
                g.add((rdflib.URIRef(row[0]), rdflib.URIRef(row[1]), rdflib.Literal(row[2]),))
    return g.serialize()

def fetch_dbsql(timestamp) -> str:
    q = """
        SELECT s, p, o
        FROM (
        SELECT *,
               ROW_NUMBER() OVER (PARTITION BY s, p ORDER BY timestamp DESC) as rn
        FROM {table}
        WHERE {filter_expr}
        AND timestamp < '{timestamp}'
        ) t
        WHERE rn = 1
    """
    g = rdflib.Graph()
    conn = get_dbsql_connection()
    with conn.cursor() as cur:
        # type statements
        cur.execute(q.format(table=TRIPLE_TABLE_FULL_NAME, filter_expr="p = 'rdf:type'", timestamp=timestamp))
        for row in cur:
            g.add((rdflib.URIRef(row[0]), rdflib.RDF.type, rdflib.URIRef(row[2]),))

        # everything else
        cur.execute(q.format(table=TRIPLE_TABLE_FULL_NAME, filter_expr="p <> 'rdf:type'", timestamp=timestamp))
        for row in cur:
            g.add((rdflib.URIRef(row[0]), rdflib.URIRef(row[1]), rdflib.Literal(row[2]),))
    return g.serialize()

from app.config import Config
from flask_cors import CORS
from app.blueprints.digital_twins import twins_bp
from app.blueprints.telemetry import telemetry_bp
from app.blueprints.rdf_models import rdf_models_bp

app = Flask(__name__)

# Configure the app with Config class
app.config.from_object(Config)

# Enable CORS for frontend communication
CORS(app)

# Register blueprints
app.register_blueprint(twins_bp)
app.register_blueprint(telemetry_bp, url_prefix='/api')
app.register_blueprint(rdf_models_bp)

@app.route('/latest')
def latest_triples():
    result = fetch_postgres()
    return result, 200, {'Content-Type': 'text/turtle; charset=utf-8'}

@app.route('/pit')
def point_in_time():
    # TODO validate parameter
    timestamp = request.args.get('timestamp')
    if not timestamp:
        return "Missing required 'ts' (timestamp) query parameter", 400
    result = fetch_dbsql(timestamp)
    return result, 200, {'Content-Type': 'text/turtle; charset=utf-8'}

@app.route('/')
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "databricks-digital-twin-backend",
        "version": "1.0.0",
        "endpoints": {
            "latest_triples": "/latest",
            "point_in_time": "/pit?timestamp=YYYY-MM-DD HH:MM:SS",
            "digital_twins": "/digital-twins",
            "rdf_models": "/rdf-models",
            "telemetry": "/telemetry"
        }
    }

@app.route('/config')
def get_config():
    """Frontend configuration endpoint"""
    from app.config import Config as AppConfig
    return {
        "backend_url": request.host_url.rstrip('/'),
        "databricks_host": AppConfig.DATABRICKS_HOST or "Not configured",
        "warehouse_id": AppConfig.WAREHOUSE_ID or "Not configured",
        "target_table": f"{AppConfig.DATABRICKS_CATALOG}.{AppConfig.DATABRICKS_SCHEMA}.{AppConfig.DATABRICKS_TABLE}",
        "auth_token": "••••" + (AppConfig.DATABRICKS_TOKEN[-4:] if AppConfig.DATABRICKS_TOKEN and len(AppConfig.DATABRICKS_TOKEN) > 4 else "Not configured"),
        "status": "configured" if all([AppConfig.DATABRICKS_HOST, AppConfig.WAREHOUSE_ID, AppConfig.DATABRICKS_TOKEN]) else "incomplete"
    }

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=Config.PORT)