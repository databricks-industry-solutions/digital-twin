import React, { useState, useEffect } from 'react';
import './ModelLibrary.css';

const ModelLibrary = ({ onLoadModel }) => {
  const [savedModels, setSavedModels] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showPreview, setShowPreview] = useState(null);
  const [renamingModel, setRenamingModel] = useState(null);
  const [newModelName, setNewModelName] = useState('');

  const predefinedTemplates = [
    {
      id: 'basic-factory',
      name: 'Basic Factory Template',
      description: 'Simple factory with one line, two machines, and components',
      category: 'template',
      isTemplate: true,
      content: `@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
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

ex:machine2 dbx:dependsOn ex:machine1 .`
    },
    {
      id: 'multi-line-factory',
      name: 'Multi-Line Factory',
      description: 'Complex factory with multiple production lines',
      category: 'template',
      isTemplate: true,
      content: `@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
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
ex:machine4 dbx:dependsOn ex:machine3 .`
    },
    {
      id: 'automotive-assembly',
      name: 'Automotive Assembly Line',
      description: 'Specialized template for automotive manufacturing',
      category: 'template',
      isTemplate: true,
      content: `@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
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
ex:weldingRobot2 dbx:dependsOn ex:weldingRobot1 .`
    },
    {
      id: 'oil-rig-platform',
      name: 'Oil Rig Platform & Subsurface Wells',
      description: 'Complete oil & gas digital twin with platform, wells, reservoirs, and sensors',
      category: 'template',
      isTemplate: true,
      content: `@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
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
ex:well-002 og:flowsTo ex:wellhead-002 .`
    }
  ];

  useEffect(() => {
    loadSavedModels();
  }, []);

  const loadSavedModels = () => {
    const saved = localStorage.getItem('saved-rdf-models');
    if (saved) {
      setSavedModels(JSON.parse(saved));
    }
  };

  const deleteModel = (modelId) => {
    if (window.confirm('Are you sure you want to delete this model?')) {
      const updatedModels = savedModels.filter(model => model.id !== modelId);
      setSavedModels(updatedModels);
      localStorage.setItem('saved-rdf-models', JSON.stringify(updatedModels));
    }
  };

  const exportModel = (model) => {
    const dataStr = `data:text/turtle;charset=utf-8,${encodeURIComponent(model.content)}`;
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute('href', dataStr);
    downloadAnchorNode.setAttribute('download', `${model.name.replace(/\s+/g, '_')}.ttl`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const duplicateModel = (model) => {
    const duplicated = {
      ...model,
      id: Date.now().toString(),
      name: `${model.name} (Copy)`,
      createdAt: new Date().toISOString(),
      isTemplate: false
    };
    
    const updatedModels = [...savedModels, duplicated];
    setSavedModels(updatedModels);
    localStorage.setItem('saved-rdf-models', JSON.stringify(updatedModels));
  };

  const startRename = (model) => {
    setRenamingModel(model.id);
    setNewModelName(model.name);
  };

  const cancelRename = () => {
    setRenamingModel(null);
    setNewModelName('');
  };

  const confirmRename = (modelId) => {
    if (!newModelName.trim()) {
      alert('Model name cannot be empty');
      return;
    }

    // Check if name already exists
    const nameExists = savedModels.some(model => 
      model.id !== modelId && model.name.toLowerCase() === newModelName.trim().toLowerCase()
    );

    if (nameExists) {
      alert('A model with this name already exists');
      return;
    }

    const updatedModels = savedModels.map(model => 
      model.id === modelId 
        ? { ...model, name: newModelName.trim() }
        : model
    );

    setSavedModels(updatedModels);
    localStorage.setItem('saved-rdf-models', JSON.stringify(updatedModels));
    
    setRenamingModel(null);
    setNewModelName('');
  };

  const allModels = [...predefinedTemplates, ...savedModels];
  
  const filteredModels = allModels.filter(model => {
    const matchesSearch = model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         model.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || 
                           (selectedCategory === 'templates' && model.isTemplate) ||
                           (selectedCategory === 'saved' && !model.isTemplate);
    return matchesSearch && matchesCategory;
  });

  const ModelCard = ({ model }) => (
    <div className="model-card">
      <div className="model-header">
        <div className="model-title">
          {renamingModel === model.id ? (
            <div className="rename-input-container">
              <input
                type="text"
                value={newModelName}
                onChange={(e) => setNewModelName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirmRename(model.id);
                  if (e.key === 'Escape') cancelRename();
                }}
                className="rename-input"
                autoFocus
              />
              <div className="rename-actions">
                <button 
                  onClick={() => confirmRename(model.id)}
                  className="confirm-rename-btn"
                  title="Confirm rename"
                >
                  ✓
                </button>
                <button 
                  onClick={cancelRename}
                  className="cancel-rename-btn"
                  title="Cancel rename"
                >
                  ✕
                </button>
              </div>
            </div>
          ) : (
            <>
              <h3>{model.name}</h3>
              {model.isTemplate && <span className="template-badge">Template</span>}
            </>
          )}
        </div>
        <div className="model-actions">
          <button 
            onClick={() => setShowPreview(model)}
            className="preview-btn"
            title="Preview Model"
          >
            👁️
          </button>
          <button 
            onClick={() => onLoadModel(model.content)}
            className="load-btn"
            title="Load Model"
          >
            📁
          </button>
          {!model.isTemplate && (
            <>
              <button 
                onClick={() => startRename(model)}
                className="rename-btn"
                title="Rename Model"
              >
                ✏️
              </button>
              <button 
                onClick={() => exportModel(model)}
                className="export-btn"
                title="Export Model"
              >
                📤
              </button>
              <button 
                onClick={() => deleteModel(model.id)}
                className="delete-btn"
                title="Delete Model"
              >
                🗑️
              </button>
            </>
          )}
          {model.isTemplate && (
            <button 
              onClick={() => duplicateModel(model)}
              className="duplicate-btn"
              title="Create Copy"
            >
              📋
            </button>
          )}
        </div>
      </div>
      
      <div className="model-description">
        <p>{model.description}</p>
      </div>
      
      <div className="model-meta">
        {model.createdAt && (
          <span className="model-date">
            Created: {new Date(model.createdAt).toLocaleDateString()}
          </span>
        )}
        <span className="model-category">
          {model.isTemplate ? 'Template' : 'User Model'}
        </span>
      </div>
    </div>
  );

  return (
    <div className="model-library">
      <div className="library-header">
        <h2>Model Library</h2>
        <p>Browse and manage your RDF model templates and saved models</p>
      </div>

      <div className="library-filters">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search models..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <span className="search-icon">🔍</span>
        </div>
        
        <div className="category-filter">
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="category-select"
          >
            <option value="all">All Models</option>
            <option value="templates">Templates</option>
            <option value="saved">Saved Models</option>
          </select>
        </div>
      </div>

      <div className="library-stats">
        <div className="stat-item">
          <span className="stat-number">{predefinedTemplates.length}</span>
          <span className="stat-label">Templates</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{savedModels.length}</span>
          <span className="stat-label">Saved Models</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{filteredModels.length}</span>
          <span className="stat-label">Filtered Results</span>
        </div>
      </div>

      <div className="models-grid">
        {filteredModels.length === 0 ? (
          <div className="no-models">
            <p>No models found matching your criteria.</p>
            {selectedCategory === 'saved' && savedModels.length === 0 && (
              <p>Create and save your first RDF model using the Model Editor!</p>
            )}
          </div>
        ) : (
          filteredModels.map(model => (
            <ModelCard key={model.id} model={model} />
          ))
        )}
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="modal-overlay">
          <div className="preview-modal">
            <div className="modal-header">
              <h3>Preview: {showPreview.name}</h3>
              <button onClick={() => setShowPreview(null)}>×</button>
            </div>
            <div className="modal-content">
              <div className="preview-description">
                <p>{showPreview.description}</p>
              </div>
              <div className="preview-content">
                <pre><code>{showPreview.content}</code></pre>
              </div>
            </div>
            <div className="modal-actions">
              <button 
                onClick={() => {
                  onLoadModel(showPreview.content);
                  setShowPreview(null);
                }}
                className="load-btn"
              >
                Load This Model
              </button>
              <button onClick={() => setShowPreview(null)} className="cancel-btn">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelLibrary;