import os
import time
import uuid
from psycopg_pool import ConnectionPool
from flask import current_app
from functools import lru_cache
from app.extensions import workspace_client

# Global state for token and pool
postgres_password = None
last_password_refresh = 0
connection_pool = None



def refresh_oauth_token() -> bool:
    """
    Get database-specific authentication token for PostgreSQL/Lakebase connection.
    Uses Databricks generate_database_credential() API for Lakebase instances.
    """
    global postgres_password, last_password_refresh
    ttl = int(current_app.config["PG_TOKEN_REFRESH_SECONDS"])
    if postgres_password is None or time.time() - last_password_refresh > ttl:
        try:
            # Get Lakebase instance name from config
            instance_name = current_app.config.get('LAKEBASE_INSTANCE_NAME')

            if instance_name:
                # Use generate_database_credential API for Lakebase
                current_app.logger.info(f"Generating database credential for Lakebase instance: {instance_name}")
                postgres_password = workspace_client.config.oauth_token().access_token
                current_app.logger.info("Successfully generated database credential for Lakebase")
            else:
                # Fallback for non-Lakebase PostgreSQL connections
                current_app.logger.warning("LAKEBASE_INSTANCE_NAME not configured, trying fallback authentication")

                # Try OAuth token first
                try:
                    postgres_password = workspace_client.config.oauth_token().access_token
                    current_app.logger.info("Using OAuth token for PostgreSQL authentication")
                except (AttributeError, Exception):
                    # Fall back to PAT token
                    if hasattr(workspace_client.config, 'token') and workspace_client.config.token:
                        postgres_password = workspace_client.config.token
                        current_app.logger.info("Using PAT token for PostgreSQL authentication")
                    else:
                        # Last resort: environment variable
                        postgres_password = current_app.config.get('DATABRICKS_TOKEN')
                        if postgres_password:
                            current_app.logger.info("Using DATABRICKS_TOKEN from config")
                        else:
                            raise ValueError("No valid authentication method found")

            last_password_refresh = time.time()
            return True

        except Exception as e:
            current_app.logger.error(f"Failed to obtain PostgreSQL authentication token: {e}")
            return False
    return True

def _build_conn_string() -> str:
    cfg = current_app.config
    return (
        f"dbname={cfg['PGDATABASE']} "
        f"user={cfg['PGUSER']} "
        f"password={postgres_password} "
        f"host={cfg['PGHOST']} "
        f"port={cfg['PGPORT']} "
        f"sslmode={cfg['PGSSLMODE']} "
        f"application_name={cfg['PGAPPNAME']}"
    )

def init_pool_on_first_use():
    # No-op initializer: pool is created on first get_connection() call
    pass

def _get_or_create_pool() -> ConnectionPool:
    global connection_pool
    if connection_pool is None:
        if not refresh_oauth_token():
            raise RuntimeError("Cannot obtain PostgreSQL OAuth token")
        conn_string = _build_conn_string()
        connection_pool = ConnectionPool(conn_string, min_size=2, max_size=10)
    return connection_pool

def get_connection():
    global connection_pool
    # Recreate pool if token expired
    ttl = int(current_app.config["PG_TOKEN_REFRESH_SECONDS"])
    if postgres_password is None or time.time() - last_password_refresh > ttl:
        if connection_pool:
            connection_pool.close()
        connection_pool = None
    return _get_or_create_pool().connection()
