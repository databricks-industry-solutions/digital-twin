from flask import Blueprint, request, jsonify
from databricks import sql as dbsql
from databricks.sdk.core import Config
from functools import lru_cache
import os

telemetry_bp = Blueprint("telemetry", __name__)

@lru_cache(maxsize=1)
def get_dbsql_connection():
    """Get a cached Databricks SQL connection"""
    from app.config import Config as AppConfig
    cfg = Config()  # Databricks config for authentication

    return dbsql.connect(
        server_hostname=cfg.host,
        http_path=AppConfig.WAREHOUSE_HTTP,
        credentials_provider=lambda: cfg.authenticate,
    )

@telemetry_bp.get("/telemetry/test")
def test_connection():
    """Test the Databricks connection from backend"""
    try:
        conn = get_dbsql_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT 1 as test")
            result = cursor.fetchone()
            if result and result[0] == 1:
                return jsonify({
                    "status": "connected", 
                    "message": "Databricks connection successful",
                    "backend": "available"
                }), 200
            else:
                return jsonify({
                    "status": "error", 
                    "message": "Unexpected response from Databricks"
                }), 500
    except Exception as e:
        return jsonify({
            "status": "error", 
            "message": str(e),
            "backend": "available"
        }), 500

@telemetry_bp.get("/telemetry/latest")
def get_latest_telemetry():
    """Get latest telemetry data through backend proxy"""
    try:
        # Get table configuration from environment or use defaults
        from app.config import Config as AppConfig
        catalog = AppConfig.DATABRICKS_CATALOG
        schema = AppConfig.DATABRICKS_SCHEMA
        table = AppConfig.DATABRICKS_TABLE
        table_full_name = f"{catalog}.{schema}.{table}"
        
        conn = get_dbsql_connection()
        with conn.cursor() as cursor:
            query = f"""
                SELECT 
                    component_id,
                    sensor_temperature as sensorAReading,
                    sensor_pressure as sensorBReading, 
                    sensor_vibration as sensorCReading,
                    sensor_speed as sensorDReading,
                    timestamp
                FROM (
                    SELECT *,
                           ROW_NUMBER() OVER (PARTITION BY component_id ORDER BY timestamp DESC) as rn
                    FROM {table_full_name}
                    WHERE timestamp >= current_timestamp() - INTERVAL 30 DAYS
                ) t
                WHERE rn = 1
                LIMIT 50
            """
            
            cursor.execute(query)
            rows = cursor.fetchall()
            
            result = []
            for row in rows:
                result.append({
                    "componentID": row[0],
                    "sensorAReading": float(row[1]) if row[1] is not None else 0.0,
                    "sensorBReading": float(row[2]) if row[2] is not None else 0.0,
                    "sensorCReading": float(row[3]) if row[3] is not None else 0.0,
                    "sensorDReading": float(row[4]) if row[4] is not None else 0.0,
                    "timestamp": row[5]
                })
            
            return jsonify({
                "data": result,
                "count": len(result),
                "table": table_full_name,
                "status": "success"
            }), 200
            
    except Exception as e:
        return jsonify({
            "error": str(e),
            "status": "error",
            "backend": "available"
        }), 500

@telemetry_bp.get("/telemetry/debug")
def debug_table_data():
    """Debug endpoint to check table structure and sample data"""
    try:
        from app.config import Config as AppConfig
        catalog = AppConfig.DATABRICKS_CATALOG
        schema = AppConfig.DATABRICKS_SCHEMA
        table = AppConfig.DATABRICKS_TABLE
        table_full_name = f"{catalog}.{schema}.{table}"

        conn = get_dbsql_connection()
        with conn.cursor() as cursor:
            # First, check table schema
            cursor.execute(f"DESCRIBE {table_full_name}")
            schema_info = cursor.fetchall()

            # Check total row count
            cursor.execute(f"SELECT COUNT(*) FROM {table_full_name}")
            total_rows = cursor.fetchone()[0]

            # Get sample data without time filter
            sample_query = f"""
                SELECT *
                FROM {table_full_name}
                ORDER BY timestamp DESC
                LIMIT 5
            """
            cursor.execute(sample_query)
            sample_data = cursor.fetchall()

            # Check timestamp range
            cursor.execute(f"""
                SELECT
                    MIN(timestamp) as oldest,
                    MAX(timestamp) as newest,
                    COUNT(*) as total_records
                FROM {table_full_name}
            """)
            timestamp_info = cursor.fetchone()

            return jsonify({
                "table": table_full_name,
                "total_rows": total_rows,
                "schema": [{"column": row[0], "type": row[1]} for row in schema_info],
                "sample_data": [list(row) for row in sample_data],
                "timestamp_range": {
                    "oldest": timestamp_info[0],
                    "newest": timestamp_info[1],
                    "total_records": timestamp_info[2]
                },
                "status": "success"
            }), 200

    except Exception as e:
        return jsonify({
            "error": str(e),
            "status": "error",
            "table": f"{AppConfig.DATABRICKS_CATALOG}.{AppConfig.DATABRICKS_SCHEMA}.{AppConfig.DATABRICKS_TABLE}"
        }), 500

@telemetry_bp.get("/telemetry/triples/debug")
def debug_triples_table():
    """Debug endpoint to explore RDF triples table schema and data"""
    try:
        # Use the triple table from environment configuration
        triple_table = os.getenv('TRIPLE_TABLE_FULL_NAME') or 'main.deba.latest_sensor_triples'

        conn = get_dbsql_connection()
        with conn.cursor() as cursor:
            # Check if table exists and get schema
            try:
                cursor.execute(f"DESCRIBE {triple_table}")
                schema_info = cursor.fetchall()

                # Get total row count
                cursor.execute(f"SELECT COUNT(*) FROM {triple_table}")
                total_rows = cursor.fetchone()[0]

                # Get sample triples to understand structure
                cursor.execute(f"""
                    SELECT s, p, o, timestamp
                    FROM {triple_table}
                    ORDER BY timestamp DESC
                    LIMIT 20
                """)
                sample_triples = cursor.fetchall()

                # Get unique predicates to understand what properties are available
                cursor.execute(f"""
                    SELECT DISTINCT p, COUNT(*) as count
                    FROM {triple_table}
                    GROUP BY p
                    ORDER BY count DESC
                """)
                predicates = cursor.fetchall()

                # Get unique subjects that look like components
                cursor.execute(f"""
                    SELECT DISTINCT s
                    FROM {triple_table}
                    WHERE s LIKE '%component%' OR s LIKE '%Component%'
                    LIMIT 20
                """)
                components = cursor.fetchall()

                # Get sensor-related triples (temperature, pressure, vibration, speed)
                cursor.execute(f"""
                    SELECT s, p, o, timestamp
                    FROM {triple_table}
                    WHERE p LIKE '%sensor%' OR p LIKE '%temperature%' OR p LIKE '%pressure%' OR p LIKE '%vibration%' OR p LIKE '%speed%'
                    ORDER BY timestamp DESC
                    LIMIT 10
                """)
                sensor_triples = cursor.fetchall()

                return jsonify({
                    "table": triple_table,
                    "total_rows": total_rows,
                    "schema": [{"column": row[0], "type": row[1]} for row in schema_info],
                    "sample_triples": [{
                        "subject": row[0],
                        "predicate": row[1],
                        "object": row[2],
                        "timestamp": str(row[3])
                    } for row in sample_triples],
                    "predicates": [{
                        "predicate": row[0],
                        "count": row[1]
                    } for row in predicates],
                    "components": [row[0] for row in components],
                    "sensor_triples": [{
                        "subject": row[0],
                        "predicate": row[1],
                        "object": row[2],
                        "timestamp": str(row[3])
                    } for row in sensor_triples],
                    "status": "success"
                }), 200

            except Exception as table_error:
                return jsonify({
                    "table": triple_table,
                    "error": f"Table access failed: {str(table_error)}",
                    "status": "table_not_found"
                }), 404

    except Exception as e:
        return jsonify({
            "error": str(e),
            "status": "error"
        }), 500

@telemetry_bp.get("/telemetry/triples/components")
def get_component_sensor_mappings():
    """Get component-to-sensor mappings from RDF triples"""
    try:
        triple_table = os.getenv('TRIPLE_TABLE_FULL_NAME') or 'main.deba.latest_sensor_triples'

        conn = get_dbsql_connection()
        with conn.cursor() as cursor:
            # Get latest sensor readings for components
            cursor.execute(f"""
                WITH latest_triples AS (
                    SELECT s, p, o, timestamp,
                           ROW_NUMBER() OVER (PARTITION BY s, p ORDER BY timestamp DESC) as rn
                    FROM {triple_table}
                    WHERE (p LIKE '%sensor%' OR p LIKE '%temperature%' OR p LIKE '%pressure%' OR p LIKE '%vibration%' OR p LIKE '%speed%')
                    AND (s LIKE '%component%' OR s LIKE '%Component%')
                )
                SELECT s as component_uri, p as sensor_property, o as sensor_value, timestamp
                FROM latest_triples
                WHERE rn = 1
                ORDER BY s, p
            """)

            sensor_data = cursor.fetchall()

            # Group by component
            components = {}
            for row in sensor_data:
                component_uri = row[0]
                sensor_property = row[1]
                sensor_value = row[2]
                timestamp = row[3]

                if component_uri not in components:
                    components[component_uri] = {
                        "uri": component_uri,
                        "sensors": {},
                        "last_updated": timestamp
                    }

                components[component_uri]["sensors"][sensor_property] = {
                    "value": sensor_value,
                    "timestamp": str(timestamp)
                }

            return jsonify({
                "table": triple_table,
                "components": list(components.values()),
                "component_count": len(components),
                "total_sensor_readings": len(sensor_data),
                "status": "success"
            }), 200

    except Exception as e:
        return jsonify({
            "error": str(e),
            "status": "error"
        }), 500
@telemetry_bp.get("/telemetry/triples")
def get_triples_based_telemetry():
    """Get telemetry data from RDF triples in format expected by frontend"""
    try:
        triple_table = os.getenv('TRIPLE_TABLE_FULL_NAME') or 'main.deba.latest_sensor_triples'

        conn = get_dbsql_connection()
        with conn.cursor() as cursor:
            # Get latest sensor readings for all components in standard format
            cursor.execute(f"""
                WITH latest_sensor_triples AS (
                    SELECT
                        s as component_uri,
                        p as sensor_property,
                        CAST(o AS DOUBLE) as sensor_value,
                        timestamp,
                        ROW_NUMBER() OVER (PARTITION BY s, p ORDER BY timestamp DESC) as rn
                    FROM {triple_table}
                    WHERE p IN (
                        'http://example.com/factory/pred/sensor_temperature',
                        'http://example.com/factory/pred/sensor_pressure',
                        'http://example.com/factory/pred/sensor_vibration',
                        'http://example.com/factory/pred/sensor_speed',
                        'http://example.com/factory/pred/sensor_rotation',
                        'http://example.com/factory/pred/sensor_flow'
                    )
                    AND s LIKE 'http://example.com/factory/component-%'
                    AND o != 'None'
                    AND o IS NOT NULL
                )
                SELECT component_uri, sensor_property, sensor_value, timestamp
                FROM latest_sensor_triples
                WHERE rn = 1
                ORDER BY component_uri, sensor_property
            """)

            sensor_data = cursor.fetchall()

            # Transform to expected frontend format
            components = {}
            for row in sensor_data:
                component_uri = row[0]
                sensor_property = row[1]
                sensor_value = row[2]
                timestamp = row[3]

                # Extract component ID from URI (e.g., component-111 -> 111)
                component_id = component_uri.split('component-')[-1]

                if component_id not in components:
                    components[component_id] = {
                        "componentID": component_id,
                        "sensorAReading": 0.0,  # Temperature
                        "sensorBReading": 0.0,  # Pressure
                        "sensorCReading": 0.0,  # Vibration
                        "sensorDReading": 0.0,  # Speed
                        "timestamp": str(timestamp)
                    }

                # Map sensor properties to frontend expected format
                if 'sensor_temperature' in sensor_property:
                    components[component_id]["sensorAReading"] = float(sensor_value)
                elif 'sensor_pressure' in sensor_property:
                    components[component_id]["sensorBReading"] = float(sensor_value)
                elif 'sensor_vibration' in sensor_property:
                    components[component_id]["sensorCReading"] = float(sensor_value)
                elif 'sensor_speed' in sensor_property:
                    components[component_id]["sensorDReading"] = float(sensor_value)

            telemetry_data = list(components.values())

            return jsonify({
                "data": telemetry_data,
                "count": len(telemetry_data),
                "table": triple_table,
                "source": "rdf_triples",
                "status": "success",
                "mapping": {
                    "sensorAReading": "sensor_temperature",
                    "sensorBReading": "sensor_pressure",
                    "sensorCReading": "sensor_vibration",
                    "sensorDReading": "sensor_speed"
                }
            }), 200

    except Exception as e:
        return jsonify({
            "error": str(e),
            "status": "error",
            "source": "rdf_triples"
        }), 500
