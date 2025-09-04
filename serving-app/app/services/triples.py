import rdflib
from flask import current_app
from app.db.postgres import get_connection
from app.extensions import get_dbsql_connection

def fetch_postgres() -> str:
    cfg = current_app.config
    table = cfg["PG_TRIPLE_TABLE"]
    g = rdflib.Graph()
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(f"SELECT s, p, o FROM {table} WHERE p = 'rdf:type'")
            for s, p, o in cur:
                g.add((rdflib.URIRef(s), rdflib.RDF.type, rdflib.URIRef(o)))
            cur.execute(f"SELECT s, p, o FROM {table} WHERE p <> 'rdf:type'")
            for s, p, o in cur:
                g.add((rdflib.URIRef(s), rdflib.URIRef(p), rdflib.Literal(o)))
    return g.serialize()

def fetch_dbsql(timestamp: str) -> str:
    cfg = current_app.config
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
    http_path = cfg["WAREHOUSE_HTTP"]
    table = cfg["DBX_TRIPLE_TABLE"]
    conn = get_dbsql_connection(http_path)
    with conn.cursor() as cur:
        cur.execute(q.format(table=table, filter_expr="p = 'rdf:type'", timestamp=timestamp))
        for s, p, o in cur:
            g.add((rdflib.URIRef(s), rdflib.RDF.type, rdflib.URIRef(o)))
        cur.execute(q.format(table=table, filter_expr="p <> 'rdf:type'", timestamp=timestamp))
        for s, p, o in cur:
            g.add((rdflib.URIRef(s), rdflib.URIRef(p), rdflib.Literal(o)))
    return g.serialize()
