from flask import Flask, render_template, request
import rdflib
import os
import time
from databricks import sdk
from databricks import sql as dbsql
from databricks.sdk.core import Config
from psycopg_pool import ConnectionPool
from functools import lru_cache

# TODO move all these to env vars
# Postgres connection details
workspace_client = sdk.WorkspaceClient()
postgres_password = None
last_password_refresh = 0
connection_pool = None
PG_TRIPLE_TABLE = "joshua_green.sensor_bronze_triples_synced"

# DBSQL connection details
WAREHOUSE_ID = os.environ.get("WAREHOUSE_ID")
WAREHOUSE_HTTP = f"/sql/1.0/warehouses/{WAREHOUSE_ID}"
DBX_TRIPLE_TABLE = "users.joshua_green.dbdemos_matteo_dbdemos_iot_turbine_sensor_bronze_triples"
cfg = Config()

@lru_cache(maxsize=1)
def get_dbsql_connection():
    return dbsql.connect(
        server_hostname=cfg.host,
        http_path=WAREHOUSE_HTTP,
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
            cur.execute(f"SELECT s, p, o FROM {PG_TRIPLE_TABLE} WHERE p = 'rdf:type'")
            for row in cur:
                g.add((rdflib.URIRef(row[0]), rdflib.RDF.type, rdflib.URIRef(row[2]),))

            # everything else
            cur.execute(f"SELECT s, p, o FROM {PG_TRIPLE_TABLE} WHERE p <> 'rdf:type'")
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
        cur.execute(q.format(table=DBX_TRIPLE_TABLE, filter_expr="p = 'rdf:type'", timestamp=timestamp))
        for row in cur:
            g.add((rdflib.URIRef(row[0]), rdflib.RDF.type, rdflib.URIRef(row[2]),))

        # everything else
        cur.execute(q.format(table=DBX_TRIPLE_TABLE, filter_expr="p <> 'rdf:type'", timestamp=timestamp))
        for row in cur:
            g.add((rdflib.URIRef(row[0]), rdflib.URIRef(row[1]), rdflib.Literal(row[2]),))
    return g.serialize()

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'dev-secret-key')

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

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=int(os.getenv('PORT', 8080)))