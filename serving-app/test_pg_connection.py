#!/usr/bin/env python3
"""Test PostgreSQL/Lakebase connection and table creation"""

import os
import sys
import load_env  # Load environment variables

print("=" * 80)
print("PostgreSQL/Lakebase Connection Test")
print("=" * 80)

# Check environment variables
print("\n1. Checking Environment Variables:")
required_vars = ['PGDATABASE', 'PGUSER', 'PGHOST', 'PGPORT', 'RDF_MODELS_FULL_TABLE_NAME']
for var in required_vars:
    value = os.getenv(var)
    if value:
        print(f"   ✓ {var}: {value}")
    else:
        print(f"   ✗ {var}: NOT SET")

# Test Databricks SDK and generate database credential
print("\n2. Testing Databricks Database Credential Generation:")
auth_token = None
try:
    from databricks import sdk
    import uuid
    workspace_client = sdk.WorkspaceClient()

    instance_name = os.getenv('LAKEBASE_INSTANCE_NAME')
    if instance_name:
        print(f"   Generating database credential for instance: {instance_name}")
        credential = workspace_client.database.generate_database_credential(
            request_id=str(uuid.uuid4()),
            instance_names=[instance_name]
        )
        auth_token = credential.token
        print(f"   ✓ Database credential generated successfully (length: {len(auth_token)})")
        print(f"   Token type: Databricks database-specific credential")
    else:
        print(f"   ⚠ LAKEBASE_INSTANCE_NAME not set, falling back to PAT authentication")
        # Fallback to PAT token
        if hasattr(workspace_client.config, 'token') and workspace_client.config.token:
            auth_token = workspace_client.config.token
            print(f"   ✓ PAT token obtained from SDK config (length: {len(auth_token)})")
        else:
            # Last resort: use environment variable
            auth_token = os.getenv('DATABRICKS_TOKEN')
            if auth_token:
                print(f"   ✓ Using DATABRICKS_TOKEN from environment (length: {len(auth_token)})")
            else:
                raise ValueError("No authentication token available")

except Exception as e:
    print(f"   ✗ Failed to get authentication token: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test PostgreSQL connection
print("\n3. Testing PostgreSQL Connection:")
try:
    import psycopg
    from psycopg.rows import dict_row

    conn_string = (
        f"dbname={os.getenv('PGDATABASE')} "
        f"user={os.getenv('PGUSER')} "
        f"password={auth_token} "
        f"host={os.getenv('PGHOST')} "
        f"port={os.getenv('PGPORT')} "
        f"sslmode={os.getenv('PGSSLMODE', 'require')} "
        f"application_name={os.getenv('PGAPPNAME', 'test-connection')}"
    )

    print(f"   Connecting to {os.getenv('PGHOST')}...")
    with psycopg.connect(conn_string) as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            # Test basic query
            cur.execute('SELECT version()')
            result = cur.fetchone()
            print(f"   ✓ Connection successful!")
            print(f"   Server version: {result['version'][:80]}...")

            # Check if rdf_models table exists
            print("\n4. Checking RDF Models Table:")
            table_name = os.getenv('RDF_MODELS_FULL_TABLE_NAME', 'main.deba.rdf_models')

            # Try to query the table
            try:
                cur.execute(f"SELECT COUNT(*) as count FROM {table_name}")
                result = cur.fetchone()
                print(f"   ✓ Table {table_name} exists!")
                print(f"   Current row count: {result['count']}")

                # Get table schema
                parts = table_name.split('.')
                if len(parts) == 3:
                    catalog, schema, table = parts
                    cur.execute(f"""
                        SELECT column_name, data_type, is_nullable
                        FROM information_schema.columns
                        WHERE table_schema = '{catalog}.{schema}'
                        AND table_name = '{table}'
                        ORDER BY ordinal_position
                    """)
                    columns = cur.fetchall()
                    if columns:
                        print(f"\n   Table Schema:")
                        for col in columns:
                            print(f"      - {col['column_name']}: {col['data_type']} "
                                  f"({'NULL' if col['is_nullable'] == 'YES' else 'NOT NULL'})")

            except psycopg.errors.UndefinedTable as e:
                print(f"   ✗ Table {table_name} does NOT exist")
                print(f"   Error: {e}")

                # Rollback the failed transaction
                conn.rollback()

                # Try to create the table
                print(f"\n5. Attempting to Create Table:")
                try:
                    create_sql = f"""
                        CREATE TABLE IF NOT EXISTS {table_name} (
                            id SERIAL PRIMARY KEY,
                            name VARCHAR(255) NOT NULL UNIQUE,
                            description TEXT,
                            category VARCHAR(50) DEFAULT 'user',
                            is_template BOOLEAN DEFAULT FALSE,
                            content TEXT NOT NULL,
                            creator VARCHAR(255),
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            metadata JSONB DEFAULT '{{}}'::jsonb,
                            tags TEXT[] DEFAULT ARRAY[]::TEXT[]
                        )
                    """
                    cur.execute(create_sql)
                    conn.commit()
                    print(f"   ✓ Table {table_name} created successfully!")

                    # Create indexes
                    print(f"\n6. Creating Indexes:")
                    indexes = [
                        f"CREATE INDEX IF NOT EXISTS idx_rdf_models_category ON {table_name} (category)",
                        f"CREATE INDEX IF NOT EXISTS idx_rdf_models_is_template ON {table_name} (is_template)",
                        f"CREATE INDEX IF NOT EXISTS idx_rdf_models_creator ON {table_name} (creator)",
                        f"CREATE INDEX IF NOT EXISTS idx_rdf_models_created_at ON {table_name} (created_at DESC)"
                    ]
                    for idx_sql in indexes:
                        cur.execute(idx_sql)
                        print(f"   ✓ Index created")
                    conn.commit()
                    print(f"   ✓ All indexes created successfully!")

                except Exception as create_error:
                    print(f"   ✗ Failed to create table: {create_error}")
                    import traceback
                    traceback.print_exc()

except psycopg.OperationalError as e:
    print(f"   ✗ Connection failed: {e}")
    print("\n   Possible issues:")
    print("   - Lakebase instance might be stopped")
    print("   - Network connectivity issues")
    print("   - OAuth token expired or invalid")
    print("   - Incorrect connection parameters")
except Exception as e:
    print(f"   ✗ Unexpected error: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 80)
print("Test Complete")
print("=" * 80)
