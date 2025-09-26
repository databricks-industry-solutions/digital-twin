import os

class Config:
    # =============================================================================
    # APPLICATION CONFIGURATION
    # =============================================================================
    PORT = int(os.getenv("PORT", "8080"))
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")

    # =============================================================================
    # DATABRICKS CONFIGURATION
    # =============================================================================
    # Connection details
    DATABRICKS_HOST = os.getenv("DATABRICKS_HOST")
    DATABRICKS_TOKEN = os.getenv("DATABRICKS_TOKEN")
    DATABRICKS_HTTP_PATH = os.getenv("DATABRICKS_HTTP_PATH")
    WAREHOUSE_ID = os.getenv("WAREHOUSE_ID")

    # Derive HTTP path from warehouse ID if not provided
    WAREHOUSE_HTTP = DATABRICKS_HTTP_PATH or (f"/sql/1.0/warehouses/{WAREHOUSE_ID}" if WAREHOUSE_ID else None)

    # Database Schema
    DATABRICKS_CATALOG = os.getenv("DATABRICKS_CATALOG", "main")
    DATABRICKS_SCHEMA = os.getenv("DATABRICKS_SCHEMA", "default")
    DATABRICKS_TABLE = os.getenv("DATABRICKS_TABLE", "bronze")

    # =============================================================================
    # ADVANCED TABLE CONFIGURATIONS
    # =============================================================================
    # Full table names
    SYNCED_TABLE_FULL_NAME = os.getenv("SYNCED_TABLE_FULL_NAME", f"{DATABRICKS_CATALOG}.{DATABRICKS_SCHEMA}.synced_table")
    TRIPLE_TABLE_FULL_NAME = os.getenv("TRIPLE_TABLE_FULL_NAME", f"{DATABRICKS_CATALOG}.{DATABRICKS_SCHEMA}.sensor_triples")

    # Legacy aliases for backward compatibility
    PG_TRIPLE_TABLE = SYNCED_TABLE_FULL_NAME
    DBX_TRIPLE_TABLE = TRIPLE_TABLE_FULL_NAME

    # =============================================================================
    # POSTGRESQL CONFIGURATION
    # =============================================================================
    # Connection parameters
    PGDATABASE = os.getenv("PGDATABASE")
    PGUSER = os.getenv("PGUSER")
    PGPASSWORD = os.getenv("PGPASSWORD")
    PGHOST = os.getenv("PGHOST", "localhost")
    PGPORT = os.getenv("PGPORT", "5432")
    PGSSLMODE = os.getenv("PGSSLMODE", "require")
    PGAPPNAME = os.getenv("PGAPPNAME", "databricks-digital-twin")

    # Token refresh interval (seconds)
    PG_TOKEN_REFRESH_SECONDS = int(os.getenv("PG_TOKEN_REFRESH_SECONDS", "900"))

    # =============================================================================
    # DATABRICKS APPS DEPLOYMENT
    # =============================================================================
    DATABRICKS_APP_PORT = os.getenv("DATABRICKS_APP_PORT", PORT)

    # =============================================================================
    # VALIDATION HELPERS
    # =============================================================================
    @classmethod
    def validate_databricks_config(cls):
        """Validate that required Databricks configuration is present"""
        missing = []

        if not cls.DATABRICKS_HOST:
            missing.append("DATABRICKS_HOST")
        if not cls.DATABRICKS_TOKEN:
            missing.append("DATABRICKS_TOKEN")
        if not cls.WAREHOUSE_ID and not cls.DATABRICKS_HTTP_PATH:
            missing.append("WAREHOUSE_ID or DATABRICKS_HTTP_PATH")

        return missing

    @classmethod
    def validate_postgresql_config(cls):
        """Validate that required PostgreSQL configuration is present"""
        missing = []

        if not cls.PGDATABASE:
            missing.append("PGDATABASE")
        if not cls.PGUSER:
            missing.append("PGUSER")
        if not cls.PGHOST:
            missing.append("PGHOST")

        return missing



