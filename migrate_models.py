#!/usr/bin/env python3
"""
Script to migrate predefined RDF models to the database.
Run this after setting up the backend to populate initial templates.
"""

import requests
import json
import sys
from typing import List, Dict

# Backend URL - adjust as needed
BACKEND_URL = "http://localhost:8080"
API_ENDPOINT = f"{BACKEND_URL}/api/rdf-models"

# Predefined templates to migrate
PREDEFINED_TEMPLATES = [
    {
        "name": "Basic Factory Template",
        "description": "Simple factory with one line, two machines, and components",
        "category": "template",
        "is_template": True,
        "content": """@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix dt: <http://databricks.com/digitaltwin/> .
@prefix ex: <http://example.com/factory/> .
@prefix dbx: <http://databricks.com/factory/> .

dt:inLine rdfs:domain dt:Machine ;
    rdfs:range dt:Line .

dt:partOf rdfs:domain dt:Component ;
    rdfs:range dt:Machine .

ex:line1 a dt:Line ;
    rdfs:label "Production Line 1" .

ex:machine1 a dt:Machine ;
    dt:inLine ex:line1 ;
    rdfs:label "Assembly Machine" .

ex:machine2 a dt:Machine ;
    dt:inLine ex:line1 ;
    rdfs:label "Quality Control" .

ex:component11 a dt:Component ;
    dt:partOf ex:machine1 ;
    rdfs:label "Motor" .

ex:component12 a dt:Component ;
    dt:partOf ex:machine1 ;
    rdfs:label "Sensor" .

ex:machine2 dbx:dependsOn ex:machine1 ."""
    },
    {
        "name": "Multi-Line Factory",
        "description": "Complex factory with multiple production lines",
        "category": "template", 
        "is_template": True,
        "content": """@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix dt: <http://databricks.com/digitaltwin/> .
@prefix ex: <http://example.com/factory/> .
@prefix dbx: <http://databricks.com/factory/> .

dt:inLine rdfs:domain dt:Machine ;
    rdfs:range dt:Line .

dt:partOf rdfs:domain dt:Component ;
    rdfs:range dt:Machine .

# Production Lines
ex:line1 a dt:Line ;
    rdfs:label "Assembly Line" .

ex:line2 a dt:Line ;
    rdfs:label "Packaging Line" .

# Assembly Line Machines
ex:machine1 a dt:Machine ;
    dt:inLine ex:line1 ;
    rdfs:label "Welding Station" .

ex:machine2 a dt:Machine ;
    dt:inLine ex:line1 ;
    rdfs:label "Assembly Robot" .

# Packaging Line Machines
ex:machine3 a dt:Machine ;
    dt:inLine ex:line2 ;
    rdfs:label "Packaging Robot" .

ex:machine4 a dt:Machine ;
    dt:inLine ex:line2 ;
    rdfs:label "Quality Scanner" .

# Dependencies
ex:line2 dbx:dependsOn ex:line1 .
ex:machine2 dbx:dependsOn ex:machine1 .
ex:machine4 dbx:dependsOn ex:machine3 ."""
    },
    {
        "name": "Automotive Assembly Line",
        "description": "Specialized template for automotive manufacturing",
        "category": "automotive",
        "is_template": True,
        "content": """@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix dt: <http://databricks.com/digitaltwin/> .
@prefix ex: <http://example.com/automotive/> .
@prefix dbx: <http://databricks.com/factory/> .

dt:inLine rdfs:domain dt:Machine ;
    rdfs:range dt:Line .

dt:partOf rdfs:domain dt:Component ;
    rdfs:range dt:Machine .

# Assembly Line
ex:bodyShop a dt:Line ;
    rdfs:label "Body Shop Assembly" .

# Body Shop Machines
ex:weldingRobot1 a dt:Machine ;
    dt:inLine ex:bodyShop ;
    rdfs:label "Body Welding Robot 1" .

ex:weldingRobot2 a dt:Machine ;
    dt:inLine ex:bodyShop ;
    rdfs:label "Body Welding Robot 2" .

ex:qualityInspection a dt:Machine ;
    dt:inLine ex:bodyShop ;
    rdfs:label "Automated Quality Inspection" .

# Components
ex:weldGun1 a dt:Component ;
    dt:partOf ex:weldingRobot1 ;
    rdfs:label "Primary Weld Gun" .

ex:visionSystem a dt:Component ;
    dt:partOf ex:qualityInspection ;
    rdfs:label "3D Vision System" .

# Dependencies
ex:qualityInspection dbx:dependsOn ex:weldingRobot2 .
ex:weldingRobot2 dbx:dependsOn ex:weldingRobot1 ."""
    },
    {
        "name": "Oil Rig Platform & Subsurface Wells",
        "description": "Complete oil & gas digital twin with platform, wells, reservoirs, and sensors",
        "category": "oil-gas",
        "is_template": True,
        "content": """@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix dt: <http://databricks.com/digitaltwin/> .
@prefix og: <http://example.com/oilgas/> .
@prefix ex: <http://example.com/platform/> .

# Core Classes - Platform Structure
og:Platform a rdfs:Class ;
    rdfs:label "Oil Rig Platform" .

og:Derrick a rdfs:Class ;
    rdfs:label "Derrick" .

og:DrawworksSystem a rdfs:Class ;
    rdfs:label "Drawworks System" .

og:BlowoutPreventer a rdfs:Class ;
    rdfs:label "Blowout Preventer (BOP)" .

# Core Classes - Subsurface Wells
og:Well a rdfs:Class ;
    rdfs:label "Well" .

og:Wellhead a rdfs:Class ;
    rdfs:label "Wellhead" .

og:Reservoir a rdfs:Class ;
    rdfs:label "Reservoir" .

og:Sensor a rdfs:Class ;
    rdfs:label "Sensor" .

# Properties
og:partOfPlatform rdfs:subPropertyOf dt:partOf .
og:accessedFrom rdfs:subPropertyOf dt:dependsOn .
og:protectedBy rdfs:subPropertyOf dt:dependsOn .
og:monitoredBy rdfs:subPropertyOf dt:dependsOn .
og:flowsTo rdfs:subPropertyOf dt:propagates .

# Platform Instance
ex:platform-alpha a og:Platform ;
    rdfs:label "Alpha Platform" .

# Platform Components
ex:derrick-1 a og:Derrick ;
    og:partOfPlatform ex:platform-alpha ;
    rdfs:label "Main Derrick" .

ex:drawworks-1 a og:DrawworksSystem ;
    og:partOfPlatform ex:platform-alpha ;
    rdfs:label "Main Drawworks" .

ex:bop-1 a og:BlowoutPreventer ;
    og:partOfPlatform ex:platform-alpha ;
    rdfs:label "Primary BOP Stack" .

# Wells
ex:well-001 a og:Well ;
    rdfs:label "Well Alpha-001" ;
    og:accessedFrom ex:platform-alpha ;
    og:protectedBy ex:bop-1 .

ex:well-002 a og:Well ;
    rdfs:label "Well Alpha-002" ;
    og:accessedFrom ex:platform-alpha ;
    og:protectedBy ex:bop-1 .

# Wellheads
ex:wellhead-001 a og:Wellhead ;
    dt:partOf ex:well-001 ;
    rdfs:label "Wellhead 001" .

ex:wellhead-002 a og:Wellhead ;
    dt:partOf ex:well-002 ;
    rdfs:label "Wellhead 002" .

# Reservoir
ex:reservoir-main a og:Reservoir ;
    rdfs:label "Main Oil Reservoir" .

# Sensors
ex:pressure-sensor-001 a og:Sensor ;
    og:monitoredBy ex:well-001 ;
    rdfs:label "Wellhead Pressure Sensor 001" .

ex:flow-sensor-001 a og:Sensor ;
    og:monitoredBy ex:well-001 ;
    rdfs:label "Production Flow Rate Sensor 001" .

# Flow relationships
ex:well-001 og:flowsTo ex:wellhead-001 .
ex:well-002 og:flowsTo ex:wellhead-002 ."""
    }
]

def test_backend_connection() -> bool:
    """Test if backend is available"""
    try:
        response = requests.get(f"{API_ENDPOINT}/statistics", timeout=5)
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Backend not available: {e}")
        return False

def check_existing_models() -> List[str]:
    """Get list of existing model names"""
    try:
        response = requests.get(f"{API_ENDPOINT}?is_template=true&limit=100")
        response.raise_for_status()
        
        data = response.json()
        existing_names = [model['name'] for model in data.get('models', [])]
        print(f"📋 Found {len(existing_names)} existing templates")
        return existing_names
        
    except Exception as e:
        print(f"⚠️  Could not check existing models: {e}")
        return []

def create_model(model_data: Dict) -> bool:
    """Create a single model"""
    try:
        response = requests.post(
            API_ENDPOINT,
            headers={'Content-Type': 'application/json'},
            json=model_data
        )
        
        if response.status_code == 201:
            print(f"✅ Created: {model_data['name']}")
            return True
        elif response.status_code == 409:
            print(f"⚠️  Already exists: {model_data['name']}")
            return True  # Consider this success
        else:
            print(f"❌ Failed to create {model_data['name']}: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error creating {model_data['name']}: {e}")
        return False

def bulk_import_models(models_data: List[Dict]) -> Dict:
    """Bulk import multiple models"""
    try:
        response = requests.post(
            f"{API_ENDPOINT}/bulk-import",
            headers={'Content-Type': 'application/json'},
            json={'models': models_data}
        )
        
        response.raise_for_status()
        return response.json()
        
    except Exception as e:
        print(f"❌ Bulk import failed: {e}")
        return {"created": 0, "errors": len(models_data)}

def main():
    """Main migration function"""
    print("🚀 Starting RDF Model Migration")
    print("=" * 50)
    
    # Test backend connection
    if not test_backend_connection():
        print("❌ Cannot connect to backend. Please ensure the Flask server is running.")
        sys.exit(1)
    
    print("✅ Backend connection successful")
    
    # Check existing models
    existing_names = set(check_existing_models())
    
    # Filter out models that already exist
    models_to_create = [
        model for model in PREDEFINED_TEMPLATES 
        if model['name'] not in existing_names
    ]
    
    if not models_to_create:
        print("🎉 All predefined templates already exist in the database")
        return
    
    print(f"📝 Will create {len(models_to_create)} new templates")
    
    # Try bulk import first
    result = bulk_import_models(models_to_create)
    
    if result.get('created', 0) == len(models_to_create):
        print(f"🎉 Successfully imported {result['created']} templates via bulk import")
    else:
        # Fallback to individual creation
        print("📋 Bulk import partial success, creating remaining models individually...")
        
        success_count = 0
        for model in models_to_create:
            if create_model(model):
                success_count += 1
        
        print(f"🎉 Successfully created {success_count}/{len(models_to_create)} templates")
    
    # Final verification
    final_count = len(check_existing_models())
    print(f"📊 Database now contains {final_count} total templates")
    
    print("=" * 50)
    print("✅ Migration completed!")

if __name__ == "__main__":
    main()