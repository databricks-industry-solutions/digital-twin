import os

class Config:
    # Databricks
    WAREHOUSE_ID = os.environ.get("WAREHOUSE_ID")
    WAREHOUSE_HTTP = f"/sql/1.0/warehouses/{WAREHOUSE_ID}" if WAREHOUSE_ID else None

    # Postgres env passthrough; sslmode default require
    PGDATABASE = os.getenv("PGDATABASE")
    PGUSER = os.getenv("PGUSER")
    PGHOST = os.getenv("PGHOST")
    PGPORT = os.getenv("PGPORT")
    PGSSLMODE = os.getenv("PGSSLMODE", "require")
    PGAPPNAME = os.getenv("PGAPPNAME", "flask-app")

    # Tables
    PG_TRIPLE_TABLE = os.getenv("SYNCED_TABLE_FULL_NAME", "naim_achahboun.sensor_triples")
    DBX_TRIPLE_TABLE = os.getenv("TRIPLE_TABLE_FULL_NAME", "users.joshua_green.dbdemos_matteo_dbdemos_iot_turbine_sensor_bronze_triples")

    # Token refresh window (seconds)
    PG_TOKEN_REFRESH_SECONDS = int(os.getenv("PG_TOKEN_REFRESH_SECONDS", "900"))



