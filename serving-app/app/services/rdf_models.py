from psycopg.rows import dict_row
from flask import current_app
from app.db.postgres import get_connection
import json
import os
from datetime import datetime
from typing import List, Dict, Optional

# Database schema constants - read from environment variables
RDF_MODELS_SCHEMA = os.getenv('RDF_MODELS_SCHEMA', 'digital_twin')
RDF_MODELS_TABLE = os.getenv('RDF_MODELS_TABLE', 'rdf_models')

def ensure_table_exists():
    """Create the RDF models table if it doesn't exist"""
    try:
        # Check if PostgreSQL is configured
        from flask import current_app
        if not all([current_app.config.get('PGDATABASE'),
                   current_app.config.get('PGUSER'),
                   current_app.config.get('PGHOST')]):
            print("Warning: PostgreSQL not configured, skipping table creation")
            return False
        sql = f"""
            CREATE SCHEMA IF NOT EXISTS {RDF_MODELS_SCHEMA};

            CREATE TABLE IF NOT EXISTS {RDF_MODELS_SCHEMA}.{RDF_MODELS_TABLE} (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                description TEXT,
                category VARCHAR(50) DEFAULT 'user',
                is_template BOOLEAN DEFAULT FALSE,
                content TEXT NOT NULL,
                creator VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                metadata JSONB DEFAULT '{{}}',
                tags TEXT[] DEFAULT ARRAY[]::TEXT[]
            );

            -- Create indexes for better performance
            CREATE INDEX IF NOT EXISTS idx_rdf_models_category ON {RDF_MODELS_SCHEMA}.{RDF_MODELS_TABLE} (category);
            CREATE INDEX IF NOT EXISTS idx_rdf_models_is_template ON {RDF_MODELS_SCHEMA}.{RDF_MODELS_TABLE} (is_template);
            CREATE INDEX IF NOT EXISTS idx_rdf_models_creator ON {RDF_MODELS_SCHEMA}.{RDF_MODELS_TABLE} (creator);
            CREATE INDEX IF NOT EXISTS idx_rdf_models_created_at ON {RDF_MODELS_SCHEMA}.{RDF_MODELS_TABLE} (created_at DESC);
        """

        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(sql)
            conn.commit()
        return True
    except Exception as e:
        print(f"Warning: Could not ensure table exists: {e}")
        return False

def create_rdf_model(name: str, content: str, description: str = None,
                     category: str = 'user', is_template: bool = False,
                     creator: str = None, metadata: dict = None, tags: list = None) -> dict:
    """Create a new RDF model"""
    try:
        if not ensure_table_exists():
            print("Warning: PostgreSQL not available, cannot create RDF model in database")
            return None

        sql = f"""
            INSERT INTO {RDF_MODELS_SCHEMA}.{RDF_MODELS_TABLE}
            (name, description, category, is_template, content, creator, metadata, tags)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (name) DO NOTHING
            RETURNING id, name, description, category, is_template, creator, created_at, updated_at, metadata, tags;
        """

        with get_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(sql, (
                    name, description, category, is_template, content, creator,
                    json.dumps(metadata or {}), tags or []
                ))
                row = cur.fetchone()
            conn.commit()

        return row
    except Exception as e:
        print(f"Error creating RDF model: {e}")
        return None

def list_rdf_models(limit: int = 50, offset: int = 0, category: str = None,
                    is_template: bool = None, creator: str = None,
                    search: str = None) -> List[dict]:
    """List RDF models with filtering and pagination"""
    try:
        if not ensure_table_exists():
            print("Warning: PostgreSQL not available, returning empty list")
            return []

        base = f"""
            SELECT id, name, description, category, is_template, creator,
                   created_at, updated_at, metadata, tags
            FROM {RDF_MODELS_SCHEMA}.{RDF_MODELS_TABLE}
        """

        params = []
        where_clauses = []

        if category:
            where_clauses.append("category = %s")
            params.append(category)

        if is_template is not None:
            where_clauses.append("is_template = %s")
            params.append(is_template)

        if creator:
            where_clauses.append("creator = %s")
            params.append(creator)

        if search:
            where_clauses.append("(name ILIKE %s OR description ILIKE %s OR content ILIKE %s)")
            search_pattern = f"%{search}%"
            params.extend([search_pattern, search_pattern, search_pattern])

        if where_clauses:
            base += " WHERE " + " AND ".join(where_clauses)

        base += " ORDER BY created_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])

        with get_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(base, params)
                rows = cur.fetchall()

        return rows
    except Exception as e:
        print(f"Error listing RDF models: {e}")
        return []

def get_rdf_model(model_id: int = None, name: str = None) -> Optional[dict]:
    """Get a specific RDF model by ID or name"""
    try:
        if not ensure_table_exists():
            print("Warning: PostgreSQL not available, cannot retrieve RDF model from database")
            return None

        if model_id:
            sql = f"""
                SELECT id, name, description, category, is_template, content, creator,
                       created_at, updated_at, metadata, tags
                FROM {RDF_MODELS_SCHEMA}.{RDF_MODELS_TABLE}
                WHERE id = %s
            """
            param = model_id
        elif name:
            sql = f"""
                SELECT id, name, description, category, is_template, content, creator,
                       created_at, updated_at, metadata, tags
                FROM {RDF_MODELS_SCHEMA}.{RDF_MODELS_TABLE}
                WHERE name = %s
            """
            param = name
        else:
            return None

        with get_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(sql, (param,))
                row = cur.fetchone()

        return row
    except Exception as e:
        print(f"Error getting RDF model: {e}")
        return None

def update_rdf_model(model_id: int, name: str = None, description: str = None,
                     category: str = None, is_template: bool = None, 
                     content: str = None, creator: str = None, 
                     metadata: dict = None, tags: list = None) -> Optional[dict]:
    """Update an existing RDF model"""
    ensure_table_exists()
    
    sets = ["updated_at = CURRENT_TIMESTAMP"]
    params = []
    
    if name is not None:
        sets.append("name = %s")
        params.append(name)
    
    if description is not None:
        sets.append("description = %s")
        params.append(description)
    
    if category is not None:
        sets.append("category = %s")
        params.append(category)
    
    if is_template is not None:
        sets.append("is_template = %s")
        params.append(is_template)
    
    if content is not None:
        sets.append("content = %s")
        params.append(content)
    
    if creator is not None:
        sets.append("creator = %s")
        params.append(creator)
    
    if metadata is not None:
        sets.append("metadata = %s")
        params.append(json.dumps(metadata))
    
    if tags is not None:
        sets.append("tags = %s")
        params.append(tags)
    
    if len(sets) == 1:  # Only updated_at was added
        return None
    
    sql = f"""
        UPDATE {RDF_MODELS_SCHEMA}.{RDF_MODELS_TABLE}
        SET {", ".join(sets)}
        WHERE id = %s
        RETURNING id, name, description, category, is_template, creator, 
                  created_at, updated_at, metadata, tags;
    """
    params.append(model_id)
    
    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(sql, params)
            row = cur.fetchone()
        conn.commit()
    
    return row

def delete_rdf_model(model_id: int) -> bool:
    """Delete an RDF model"""
    ensure_table_exists()
    
    sql = f"DELETE FROM {RDF_MODELS_SCHEMA}.{RDF_MODELS_TABLE} WHERE id = %s RETURNING id"
    
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (model_id,))
            deleted = cur.fetchone()
        conn.commit()
    
    return bool(deleted)

def duplicate_rdf_model(model_id: int, new_name: str = None, creator: str = None) -> Optional[dict]:
    """Create a copy of an existing RDF model"""
    ensure_table_exists()
    
    # Get the original model
    original = get_rdf_model(model_id=model_id)
    if not original:
        return None
    
    # Generate new name if not provided
    if not new_name:
        new_name = f"{original['name']} (Copy)"
        counter = 1
        while get_rdf_model(name=new_name):
            new_name = f"{original['name']} (Copy {counter})"
            counter += 1
    
    # Create the duplicate
    return create_rdf_model(
        name=new_name,
        content=original['content'],
        description=original['description'],
        category=original['category'],
        is_template=False,  # Copies are always user models
        creator=creator or original['creator'],
        metadata=original['metadata'],
        tags=original['tags']
    )

def get_model_statistics() -> dict:
    """Get statistics about RDF models"""
    try:
        if not ensure_table_exists():
            # Return mock statistics if database is unavailable
            return {
                "total_models": 0,
                "template_count": 0,
                "user_model_count": 0,
                "category_count": 0,
                "creator_count": 0,
                "database_available": False
            }

        sql = f"""
            SELECT
                COUNT(*) as total_models,
                COUNT(*) FILTER (WHERE is_template = true) as template_count,
                COUNT(*) FILTER (WHERE is_template = false) as user_model_count,
                COUNT(DISTINCT category) as category_count,
                COUNT(DISTINCT creator) as creator_count
            FROM {RDF_MODELS_SCHEMA}.{RDF_MODELS_TABLE}
        """

        with get_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(sql)
                stats = cur.fetchone()

        stats['database_available'] = True
        return stats
    except Exception as e:
        print(f"Error getting model statistics: {e}")
        return {
            "total_models": 0,
            "template_count": 0,
            "user_model_count": 0,
            "category_count": 0,
            "creator_count": 0,
            "database_available": False,
            "error": str(e)
        }

def search_rdf_models(query: str, limit: int = 20) -> List[dict]:
    """Full-text search across RDF models"""
    ensure_table_exists()
    
    sql = f"""
        SELECT id, name, description, category, is_template, creator, 
               created_at, updated_at, metadata, tags
        FROM {RDF_MODELS_SCHEMA}.{RDF_MODELS_TABLE}
        WHERE name ILIKE %s 
           OR description ILIKE %s 
           OR content ILIKE %s
           OR %s = ANY(tags)
        ORDER BY 
            CASE 
                WHEN name ILIKE %s THEN 1
                WHEN description ILIKE %s THEN 2
                WHEN %s = ANY(tags) THEN 3
                ELSE 4
            END,
            created_at DESC
        LIMIT %s
    """
    
    search_pattern = f"%{query}%"
    params = [search_pattern, search_pattern, search_pattern, query, 
              search_pattern, search_pattern, query, limit]
    
    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()
    
    return rows