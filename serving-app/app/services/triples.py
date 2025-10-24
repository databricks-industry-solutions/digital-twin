import rdflib
from flask import current_app
from app.db.postgres import get_connection
from app.extensions import get_dbsql_connection
import html
import urllib.parse


def clean_uri(value: str) -> str:
    """Cleans and validates URIs before feeding them to rdflib."""
    if not value:
        return value
    v = html.unescape(value).strip("<>").strip()
    # Ensure valid URL encoding for any unsafe characters
    return urllib.parse.quote(v, safe=':/#?&=%@+')


def fetch_postgres() -> str:
    cfg = current_app.config
    table = cfg["PG_TRIPLE_TABLE"]
    g = rdflib.Graph()
    with get_connection() as conn:
        with conn.cursor() as cur:
            # Handle rdf:type triples
            cur.execute(f"SELECT s, p, o FROM {table} WHERE p = 'rdf:type'")
            for s, p, o in cur:
                g.add((
                    rdflib.URIRef(clean_uri(s)),
                    rdflib.RDF.type,
                    rdflib.URIRef(clean_uri(o))
                ))
            # Handle all other predicates
            cur.execute(f"SELECT s, p, o FROM {table} WHERE p <> 'rdf:type'")
            for s, p, o in cur:
                g.add((
                    rdflib.URIRef(clean_uri(s)),
                    rdflib.URIRef(clean_uri(p)),
                    rdflib.Literal(html.unescape(o))
                ))
    return g.serialize(format="turtle")


def fetch_dbsql(timestamp: str) -> str:
    cfg = current_app.config
    http_path = cfg["WAREHOUSE_HTTP"]
    table = cfg["DBX_TRIPLE_TABLE"]

    q = """
        SELECT s, p, o
        FROM (
          SELECT *,
                 ROW_NUMBER() OVER (PARTITION BY s, p ORDER BY timestamp DESC) AS rn
          FROM {table}
          WHERE {filter_expr}
          AND timestamp < %(ts)s
        ) t
        WHERE rn = 1
    """

    g = rdflib.Graph()
    conn = get_dbsql_connection(http_path)
    with conn.cursor() as cur:
        # rdf:type first
        cur.execute(q.format(table=table, filter_expr="p = 'rdf:type'"), {"ts": timestamp})
        for s, p, o in cur:
            g.add((
                rdflib.URIRef(clean_uri(s)),
                rdflib.RDF.type,
                rdflib.URIRef(clean_uri(o))
            ))

        # other predicates
        cur.execute(q.format(table=table, filter_expr="p <> 'rdf:type'"), {"ts": timestamp})
        for s, p, o in cur:
            g.add((
                rdflib.URIRef(clean_uri(s)),
                rdflib.URIRef(clean_uri(p)),
                rdflib.Literal(html.unescape(o))
            ))

    return g.serialize(format="turtle")