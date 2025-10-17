from databricks import sdk
from databricks import sql as dbsql
from databricks.sdk.core import Config as DBXConfig

# Global Databricks workspace client and SQL config (created once)
workspace_client = sdk.WorkspaceClient()
dbx_cfg = DBXConfig()

def get_dbsql_connection(server_http_path: str):
    # Lazily build dbsql connection using credentials provider
    return dbsql.connect(
        server_hostname=dbx_cfg.host,
        http_path=server_http_path,
        credentials_provider=lambda: dbx_cfg.authenticate,
    )
