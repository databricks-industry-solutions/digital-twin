#!/usr/bin/env python3
"""
Migrate local TTL template files to the RDF models database table.

This script reads all .ttl files from the example-ttls directory and imports them
into the Lakebase rdf_models table using the bulk-import endpoint.
"""

import os
import sys
import glob
import requests
import json

# Load environment variables
sys.path.insert(0, '.')
import load_env

def read_ttl_file(file_path):
    """Read a TTL file and extract metadata"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    filename = os.path.basename(file_path)
    name = filename.replace('.ttl', '').replace('_', ' ').title()

    # Extract description from comments (first non-prefix comment)
    description = "Template imported from local TTL file"
    lines = content.split('\n')
    for line in lines:
        if line.strip().startswith('# ') and not line.strip().startswith('# @prefix'):
            description = line.strip()[2:]  # Remove '# '
            break

    # Determine category based on filename
    category = 'template'
    filename_lower = filename.lower()
    if 'oil' in filename_lower or 'rig' in filename_lower:
        category = 'oil-gas'
    elif 'factory' in filename_lower or 'manufacturing' in filename_lower:
        category = 'manufacturing'
    elif 'automotive' in filename_lower:
        category = 'automotive'

    return {
        'name': name,
        'description': description,
        'category': category,
        'is_template': True,
        'content': content,
        'creator': 'system',
        'metadata': {
            'source': 'local-file',
            'filename': filename,
            'migration_date': 'auto-import'
        },
        'tags': ['template', 'imported', category]
    }

def main():
    # Configuration
    backend_url = os.getenv('REACT_APP_BACKEND_URL', 'http://localhost:8080')
    bulk_import_endpoint = f'{backend_url}/rdf-models/bulk-import'

    # Find all TTL files
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ttl_dir = os.path.join(project_root, 'example-ttls')
    ttl_files = glob.glob(os.path.join(ttl_dir, '*.ttl'))

    if not ttl_files:
        print(f"❌ No TTL files found in {ttl_dir}")
        return 1

    print("=" * 80)
    print("RDF Models Template Migration")
    print("=" * 80)
    print(f"Backend URL: {backend_url}")
    print(f"TTL Directory: {ttl_dir}")
    print(f"Found {len(ttl_files)} template files")
    print()

    # Read all templates
    models = []
    for ttl_file in ttl_files:
        try:
            model = read_ttl_file(ttl_file)
            models.append(model)
            print(f"✓ Loaded: {model['name']} ({model['category']})")
        except Exception as e:
            print(f"✗ Failed to load {os.path.basename(ttl_file)}: {e}")

    if not models:
        print("\n❌ No models were successfully loaded")
        return 1

    print(f"\n{'=' * 80}")
    print(f"Importing {len(models)} templates to database...")
    print(f"{'=' * 80}\n")

    # Send bulk import request
    try:
        response = requests.post(
            bulk_import_endpoint,
            json={'models': models},
            headers={'Content-Type': 'application/json'},
            timeout=30
        )

        if response.status_code in [200, 207]:
            result = response.json()
            print(f"✅ Import completed!")
            print(f"   Created: {result.get('created', 0)} models")
            print(f"   Errors: {result.get('errors', 0)}")

            if result.get('error_details'):
                print(f"\n⚠️  Error details:")
                for error in result['error_details']:
                    print(f"   - {error.get('model', 'unknown')}: {error.get('error', 'unknown error')}")

            print(f"\n{'=' * 80}")
            print("Migration Summary")
            print(f"{'=' * 80}")
            print(f"Total templates processed: {len(models)}")
            print(f"Successfully imported: {result.get('created', 0)}")
            print(f"Failed: {result.get('errors', 0)}")

            if result.get('created', 0) > 0:
                print(f"\n✅ Templates are now available in the Model Library!")
                return 0
            else:
                print(f"\n⚠️  No templates were imported. They may already exist.")
                return 1
        else:
            print(f"❌ Import failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return 1

    except requests.exceptions.ConnectionError:
        print(f"❌ Could not connect to backend at {backend_url}")
        print(f"   Make sure the Flask server is running!")
        return 1
    except Exception as e:
        print(f"❌ Import failed: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == '__main__':
    sys.exit(main())
