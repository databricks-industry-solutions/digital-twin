import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import './ModelLibrary.css';
import RDFModelsService from '../../services/rdfModelsService';

const ModelLibrary = forwardRef(({ onLoadModel, onSaveModel }, ref) => {
  const [models, setModels] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showPreview, setShowPreview] = useState(null);
  const [renamingModel, setRenamingModel] = useState(null);
  const [newModelName, setNewModelName] = useState('');
  const [backendAvailable, setBackendAvailable] = useState(true);
  const [migrationStatus, setMigrationStatus] = useState(null);
  const [loadingModel, setLoadingModel] = useState(null);

  const rdfService = new RDFModelsService();

  // Predefined templates - these will be migrated to DB on first load
  const predefinedTemplates = [
    {
      name: 'Basic Factory Template',
      description: 'Simple factory with one line, two machines, and components',
      category: 'template',
      is_template: true,
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
      name: 'Multi-Line Factory',
      description: 'Complex factory with multiple production lines',
      category: 'template',
      is_template: true,
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
      name: 'Automotive Assembly Line',
      description: 'Specialized template for automotive manufacturing',
      category: 'automotive',
      is_template: true,
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
      name: 'Oil Rig Platform & Subsurface Wells',
      description: 'Complete oil & gas digital twin with platform, wells, reservoirs, and sensors',
      category: 'oil-gas',
      is_template: true,
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
    loadModels();
  }, []);

  // Expose loadModels function to parent component via ref
  useImperativeHandle(ref, () => ({
    refreshModels: () => {
      console.log('🔄 ModelLibrary: refreshModels() called from parent');
      return loadModels();
    }
  }));

  const loadModels = async () => {
    setLoading(true);
    setError(null);

    try {
      // Use enhanced fallback that includes local templates from example-ttls
      const result = await rdfService.getModelsWithLocalTemplatesFallback();

      setModels(result.models || []);
      setStatistics(result.statistics || {});

      const userModels = result.models?.filter(m => !m.is_template) || [];
      console.log('📚 ModelLibrary loaded:', {
        totalModels: result.models?.length || 0,
        source: result.source,
        statistics: result.statistics,
        userModelsCount: userModels.length,
        userModelsList: userModels.map(m => ({ name: m.name, id: m.id, is_template: m.is_template })),
        selectedCategory: selectedCategory
      });

      // Determine backend availability based on source
      const hasBackend = result.source.includes('backend');
      setBackendAvailable(hasBackend);

      // Show user what data sources are being used
      if (result.source === 'backend+local') {
        console.log(`✅ Loaded models from: Database + Local Templates (${result.statistics.local_template_count} local)`);
      } else if (result.source === 'local+localStorage') {
        console.log(`⚠️ Backend unavailable. Using: Local Templates (${result.statistics.local_template_count}) + Saved Models`);
        setMigrationStatus('⚠️ Backend unavailable - using local templates + saved models');
        setTimeout(() => setMigrationStatus(null), 5000);
      } else if (result.source === 'localStorage-only') {
        console.log('⚠️ Complete fallback - using only localStorage');
        setMigrationStatus('⚠️ No templates available - only saved models');
        setTimeout(() => setMigrationStatus(null), 5000);
      }

      // Try to migrate localStorage models if backend is available
      if (hasBackend) {
        try {
          await migrateLocalStorageModels();
        } catch (migrationError) {
          console.warn('Migration failed but models loaded successfully:', migrationError);
        }
      }

    } catch (err) {
      console.error('Error loading models:', err);
      setError(`Failed to load models: ${err.message}`);

      // Final fallback to predefined templates + localStorage
      const localModels = JSON.parse(localStorage.getItem('saved-rdf-models') || '[]');
      const allModels = [...predefinedTemplates.map(t => ({...t, id: t.name})), ...localModels];
      setModels(allModels);
      setStatistics({
        total_models: allModels.length,
        template_count: predefinedTemplates.length,
        user_model_count: localModels.length,
        local_template_count: 0
      });
      setBackendAvailable(false);
    } finally {
      setLoading(false);
    }
  };

  const migrateLocalStorageModels = async () => {
    try {
      const result = await rdfService.migrateFromLocalStorage();
      if (result.migrated > 0) {
        setMigrationStatus(`✅ Migrated ${result.migrated} models from local storage`);
        setTimeout(() => setMigrationStatus(null), 5000);
      }
    } catch (error) {
      console.warn('Migration failed:', error);
      setMigrationStatus(`⚠️ Migration failed: ${error.message}`);
      setTimeout(() => setMigrationStatus(null), 5000);
    }
  };

  const ensurePredefinedTemplates = async () => {
    try {
      // Check if templates already exist
      const templates = await rdfService.getTemplates();
      const existingNames = new Set(templates.models?.map(t => t.name) || []);
      
      const templatesToCreate = predefinedTemplates.filter(t => !existingNames.has(t.name));
      
      if (templatesToCreate.length > 0) {
        await rdfService.bulkImportModels(templatesToCreate);
        console.log(`Imported ${templatesToCreate.length} predefined templates`);
      }
    } catch (error) {
      console.warn('Failed to ensure predefined templates:', error);
    }
  };

  const saveModel = async (modelData) => {
    try {
      if (backendAvailable) {
        const newModel = await rdfService.createModel({
          name: modelData.name,
          content: modelData.content,
          description: modelData.description || '',
          category: 'user',
          is_template: false
        });
        
        // Reload models to reflect changes
        await loadModels();
        
        if (onSaveModel) {
          onSaveModel(newModel);
        }
        
        return newModel;
      } else {
        // Fallback to localStorage
        const localModels = JSON.parse(localStorage.getItem('saved-rdf-models') || '[]');
        const newModel = {
          id: Date.now().toString(),
          name: modelData.name,
          content: modelData.content,
          description: modelData.description || '',
          category: 'user',
          createdAt: new Date().toISOString(),
          isTemplate: false
        };
        
        const updatedModels = [...localModels, newModel];
        localStorage.setItem('saved-rdf-models', JSON.stringify(updatedModels));
        
        await loadModels(); // Refresh view
        
        return newModel;
      }
    } catch (error) {
      setError(`Failed to save model: ${error.message}`);
      throw error;
    }
  };

  const deleteModel = async (model) => {
    if (!window.confirm('Are you sure you want to delete this model?')) {
      return;
    }

    try {
      if (backendAvailable && model.id) {
        await rdfService.deleteModel(model.id);
      } else {
        // Fallback to localStorage
        const localModels = JSON.parse(localStorage.getItem('saved-rdf-models') || '[]');
        const updatedModels = localModels.filter(m => m.id !== model.id);
        localStorage.setItem('saved-rdf-models', JSON.stringify(updatedModels));
      }
      
      await loadModels(); // Refresh view
    } catch (error) {
      setError(`Failed to delete model: ${error.message}`);
    }
  };

  const duplicateModel = async (model) => {
    try {
      if (backendAvailable && model.id) {
        await rdfService.duplicateModel(model.id);
      } else {
        // Fallback to localStorage
        const duplicated = {
          ...model,
          id: Date.now().toString(),
          name: `${model.name} (Copy)`,
          createdAt: new Date().toISOString(),
          isTemplate: false
        };
        
        const localModels = JSON.parse(localStorage.getItem('saved-rdf-models') || '[]');
        const updatedModels = [...localModels, duplicated];
        localStorage.setItem('saved-rdf-models', JSON.stringify(updatedModels));
      }
      
      await loadModels(); // Refresh view
    } catch (error) {
      setError(`Failed to duplicate model: ${error.message}`);
    }
  };

  const renameModel = async (modelId, newName) => {
    if (!newName.trim()) {
      alert('Model name cannot be empty');
      return;
    }

    try {
      if (backendAvailable) {
        await rdfService.updateModel(modelId, { name: newName.trim() });
      } else {
        // Fallback to localStorage
        const localModels = JSON.parse(localStorage.getItem('saved-rdf-models') || '[]');
        const updatedModels = localModels.map(model => 
          model.id === modelId 
            ? { ...model, name: newName.trim() }
            : model
        );
        localStorage.setItem('saved-rdf-models', JSON.stringify(updatedModels));
      }
      
      await loadModels(); // Refresh view
      setRenamingModel(null);
      setNewModelName('');
    } catch (error) {
      setError(`Failed to rename model: ${error.message}`);
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

  const filteredModels = models.filter(model => {
    const matchesSearch = model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (model.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || 
                           (selectedCategory === 'templates' && model.is_template) ||
                           (selectedCategory === 'saved' && !model.is_template);
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
                  if (e.key === 'Enter') renameModel(model.id, newModelName);
                  if (e.key === 'Escape') {
                    setRenamingModel(null);
                    setNewModelName('');
                  }
                }}
                className="rename-input"
                autoFocus
              />
              <div className="rename-actions">
                <button 
                  onClick={() => renameModel(model.id, newModelName)}
                  className="confirm-rename-btn"
                  title="Confirm rename"
                >
                  ✓
                </button>
                <button 
                  onClick={() => {
                    setRenamingModel(null);
                    setNewModelName('');
                  }}
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
              {model.is_template && <span className="template-badge">Template</span>}
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
            onClick={async () => {
              setLoadingModel(model.id);
              try {
                await onLoadModel(model.content);
                // Show success feedback
                setMigrationStatus(`✅ Loaded "${model.name}" and synced to graph view`);
                setTimeout(() => setMigrationStatus(null), 3000);
              } catch (error) {
                setError(`Failed to load model: ${error.message}`);
              } finally {
                setLoadingModel(null);
              }
            }}
            className={`load-btn ${loadingModel === model.id ? 'loading' : ''}`}
            title="Load Model and Sync to Graph"
            disabled={loadingModel === model.id}
          >
            {loadingModel === model.id ? '🔄' : '📁'}
          </button>
          {!model.is_template && (
            <>
              <button 
                onClick={() => {
                  setRenamingModel(model.id);
                  setNewModelName(model.name);
                }}
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
                onClick={() => deleteModel(model)}
                className="delete-btn"
                title="Delete Model"
              >
                🗑️
              </button>
            </>
          )}
          {model.is_template && (
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
        <p>{model.description || 'No description available'}</p>
      </div>
      
      <div className="model-meta">
        {(model.created_at || model.createdAt) && (
          <span className="model-date">
            Created: {new Date(model.created_at || model.createdAt).toLocaleDateString()}
          </span>
        )}
        <span className="model-category">
          {model.is_template || model.isTemplate ? 'Template' : 'User Model'}
        </span>
        <span className="model-category">
          {model.category}
        </span>
        {model.source === 'local-file' && (
          <span className="model-source" title={`Local file: ${model.filename}`}>
            📁 Local File
          </span>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="model-library loading">
        <div className="loading-spinner">Loading models...</div>
      </div>
    );
  }

  return (
    <div className="model-library">
      <div className="library-header">
        <h2>Model Library</h2>
        <p>Browse and manage your RDF model templates and saved models</p>
        
        {!backendAvailable && (
          <div className="backend-status warning">
            ⚠️ Backend unavailable - using local storage
          </div>
        )}
        
        {migrationStatus && (
          <div className="migration-status">
            {migrationStatus}
          </div>
        )}
        
        {error && (
          <div className="error-message">
            ❌ {error}
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}
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
        
        <button 
          onClick={loadModels}
          className="refresh-btn"
          title="Refresh models"
          disabled={loading}
        >
          🔄 Refresh
        </button>
      </div>

      <div className="library-stats">
        <div className="stat-item">
          <span className="stat-number">{statistics.template_count || 0}</span>
          <span className="stat-label">Templates</span>
        </div>
        {statistics.local_template_count > 0 && (
          <div className="stat-item">
            <span className="stat-number">{statistics.local_template_count}</span>
            <span className="stat-label">Local Files</span>
          </div>
        )}
        <div className="stat-item">
          <span className="stat-number">{statistics.user_model_count || 0}</span>
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
            {selectedCategory === 'saved' && (statistics.user_model_count || 0) === 0 && (
              <p>Create and save your first RDF model using the Model Editor!</p>
            )}
          </div>
        ) : (
          filteredModels.map(model => (
            <ModelCard key={model.id || model.name} model={model} />
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
                <p>{showPreview.description || 'No description available'}</p>
              </div>
              <div className="preview-content">
                <pre><code>{showPreview.content}</code></pre>
              </div>
            </div>
            <div className="modal-actions">
              <button 
                onClick={async () => {
                  setLoadingModel(showPreview.id);
                  try {
                    await onLoadModel(showPreview.content);
                    setShowPreview(null);
                    // Show success feedback
                    setMigrationStatus(`✅ Loaded "${showPreview.name}" and synced to graph view`);
                    setTimeout(() => setMigrationStatus(null), 3000);
                  } catch (error) {
                    setError(`Failed to load model: ${error.message}`);
                  } finally {
                    setLoadingModel(null);
                  }
                }}
                className={`load-btn ${loadingModel === showPreview.id ? 'loading' : ''}`}
                disabled={loadingModel === showPreview.id}
              >
                {loadingModel === showPreview.id ? '🔄 Loading...' : '📁 Load This Model'}
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
});

export default ModelLibrary;