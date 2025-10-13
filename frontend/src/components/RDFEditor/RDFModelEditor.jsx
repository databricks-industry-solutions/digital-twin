import React, { useState, useEffect, useRef } from 'react';
import { RDFParser } from '../../utils/rdfParser';
import { RDFWriter } from '../../utils/rdfWriter';
import RDFModelsService from '../../services/rdfModelsService';
import './RDFModelEditor.css';

const RDFModelEditor = ({ onModelChange, initialModel, onModelSaved }) => {
  const [rdfContent, setRdfContent] = useState(initialModel || '');
  const [savedModels, setSavedModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [modelName, setModelName] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [backendAvailable, setBackendAvailable] = useState(true);
  const [rdfService] = useState(() => new RDFModelsService());
  const textareaRef = useRef(null);

  const defaultTemplate = `@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix dt: <http://databricks.com/digitaltwin/> .
@prefix ex: <http://example.com/factory/> .
@prefix dbx: <http://databricks.com/factory/> .

# Define the domain relationships
dt:inLine rdfs:domain dt:Machine ;
    rdfs:range dt:Line .

dt:partOf rdfs:domain dt:Component ;
    rdfs:range dt:Machine .

# Create a production line
ex:line1 a dt:Line ;
    rdfs:label "Production Line 1" .

# Create machines in the line
ex:machine1 a dt:Machine ;
    dt:inLine ex:line1 ;
    rdfs:label "Assembly Machine 1" .

ex:machine2 a dt:Machine ;
    dt:inLine ex:line1 ;
    rdfs:label "Quality Control Machine" .

# Create components for each machine
ex:component11 a dt:Component ;
    dt:partOf ex:machine1 ;
    rdfs:label "Motor Component" .

ex:component12 a dt:Component ;
    dt:partOf ex:machine1 ;
    rdfs:label "Sensor Array" .

ex:component21 a dt:Component ;
    dt:partOf ex:machine2 ;
    rdfs:label "Camera System" .

ex:component22 a dt:Component ;
    dt:partOf ex:machine2 ;
    rdfs:label "Testing Unit" .

# Define dependencies
ex:machine2 dbx:dependsOn ex:machine1 .`;

  useEffect(() => {
    loadSavedModels();
    checkBackendAvailability();
    if (!rdfContent && defaultTemplate) {
      setRdfContent(defaultTemplate);
    }
  }, []);

  const checkBackendAvailability = async () => {
    try {
      const isAvailable = await rdfService.isBackendAvailable();
      setBackendAvailable(isAvailable);
    } catch (error) {
      console.warn('Backend availability check failed:', error);
      setBackendAvailable(false);
    }
  };

  useEffect(() => {
    // Update content when initialModel changes (from graph editor)
    if (initialModel && initialModel !== rdfContent) {
      setRdfContent(initialModel);
    }
  }, [initialModel]);

  // Remove automatic sync - now only validate without triggering model change
  useEffect(() => {
    if (rdfContent) {
      validateModel(rdfContent);
    }
  }, [rdfContent]);

  const loadSavedModels = () => {
    const saved = localStorage.getItem('saved-rdf-models');
    if (saved) {
      setSavedModels(JSON.parse(saved));
    }
  };

  const validateModel = async (content) => {
    if (!content.trim()) return;
    
    setIsValidating(true);
    try {
      const parser = new RDFParser();
      const graphData = await parser.parseRDF(content);
      
      setValidationResult({
        isValid: true,
        nodes: graphData.nodes.length,
        edges: graphData.edges.length,
        message: `Valid RDF model with ${graphData.nodes.length} nodes and ${graphData.edges.length} relationships`
      });
    } catch (error) {
      setValidationResult({
        isValid: false,
        message: `Validation Error: ${error.message}`,
        error: error
      });
    } finally {
      setIsValidating(false);
    }
  };

  const syncToGraph = async () => {
    if (!rdfContent.trim()) {
      alert('Please enter RDF content before syncing');
      return;
    }
    
    if (!validationResult || !validationResult.isValid) {
      alert('Please fix validation errors before syncing');
      return;
    }
    
    setIsValidating(true);
    try {
      const parser = new RDFParser();
      const graphData = await parser.parseRDF(rdfContent);
      
      if (onModelChange) {
        onModelChange(rdfContent, graphData);
      }
      
      alert('Successfully synced to Graph Editor!');
    } catch (error) {
      alert(`Sync failed: ${error.message}`);
    } finally {
      setIsValidating(false);
    }
  };

  const saveModel = async () => {
    if (!modelName.trim()) {
      alert('Please enter a model name');
      return;
    }

    const modelData = {
      name: modelName,
      content: rdfContent,
      description: `Model with ${validationResult?.nodes || 0} nodes`,
      category: 'user',
      is_template: false,
    };

    try {
      if (backendAvailable) {
        // Try to save to database first
        await rdfService.createModel(modelData);
        alert('Model saved to database successfully!');

        // Notify parent component to refresh ModelLibrary
        if (onModelSaved) {
          onModelSaved();
        }
      } else {
        // Fallback to localStorage
        const newModel = {
          id: Date.now().toString(),
          name: modelName,
          content: rdfContent,
          createdAt: new Date().toISOString(),
          description: modelData.description,
          category: modelData.category,
          isTemplate: false
        };

        const updatedModels = [...savedModels, newModel];
        setSavedModels(updatedModels);
        localStorage.setItem('saved-rdf-models', JSON.stringify(updatedModels));
        alert('Model saved locally (database unavailable)');

        // Notify parent component to refresh ModelLibrary
        if (onModelSaved) {
          onModelSaved();
        }
      }

      setModelName('');
      setShowSaveDialog(false);

    } catch (error) {
      console.error('Failed to save model:', error);

      // Fallback to localStorage on error
      const newModel = {
        id: Date.now().toString(),
        name: modelName,
        content: rdfContent,
        createdAt: new Date().toISOString(),
        description: modelData.description,
        category: modelData.category,
        isTemplate: false
      };

      const updatedModels = [...savedModels, newModel];
      setSavedModels(updatedModels);
      localStorage.setItem('saved-rdf-models', JSON.stringify(updatedModels));

      alert('Failed to save to database, saved locally instead');
      setBackendAvailable(false);

      // Notify parent component to refresh ModelLibrary
      if (onModelSaved) {
        onModelSaved();
      }

      setModelName('');
      setShowSaveDialog(false);
    }
  };

  const loadModel = (model) => {
    setRdfContent(model.content);
    setSelectedModel(model.id);
    setShowLoadDialog(false);
  };

  const deleteModel = (modelId) => {
    if (window.confirm('Are you sure you want to delete this model?')) {
      const updatedModels = savedModels.filter(model => model.id !== modelId);
      setSavedModels(updatedModels);
      localStorage.setItem('saved-rdf-models', JSON.stringify(updatedModels));
    }
  };

  const insertTemplate = (template) => {
    const templates = {
      machine: `ex:newMachine a dt:Machine ;
    dt:inLine ex:line1 ;
    rdfs:label "New Machine" .`,
      component: `ex:newComponent a dt:Component ;
    dt:partOf ex:machine1 ;
    rdfs:label "New Component" .`,
      line: `ex:newLine a dt:Line ;
    rdfs:label "New Production Line" .`,
      dependency: `ex:machine2 dbx:dependsOn ex:machine1 .`
    };

    const templateText = templates[template];
    if (templateText && textareaRef.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = rdfContent.substring(0, start) + '\n\n' + templateText + '\n' + rdfContent.substring(end);
      setRdfContent(newContent);
      
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + templateText.length + 2, start + templateText.length + 2);
      }, 10);
    }
  };

  const formatRDF = () => {
    // Simple RDF formatting
    const lines = rdfContent.split('\n');
    const formatted = lines.map(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('@prefix')) return trimmed;
      if (trimmed.startsWith('#')) return trimmed;
      if (trimmed.includes(' a ')) return '  ' + trimmed;
      if (trimmed.startsWith('dt:') || trimmed.startsWith('rdfs:') || trimmed.startsWith('dbx:')) return '    ' + trimmed;
      return trimmed;
    }).join('\n');
    
    setRdfContent(formatted);
  };

  return (
    <div className="rdf-model-editor">
      <div className="editor-header">
        <div className="header-left">
          <h2>RDF Model Editor</h2>
          <div className="validation-status">
            {isValidating ? (
              <span className="validating">🔄 Validating...</span>
            ) : validationResult ? (
              <span className={`validation-result ${validationResult.isValid ? 'valid' : 'invalid'}`}>
                {validationResult.isValid ? '✅' : '❌'} {validationResult.message}
              </span>
            ) : null}
          </div>
        </div>
        
        <div className="header-actions">
          <button 
            onClick={syncToGraph} 
            className={`sync-btn ${validationResult?.isValid ? 'valid' : 'invalid'}`}
            disabled={!validationResult?.isValid || isValidating}
            title={validationResult?.isValid ? 'Sync RDF model to Graph Editor' : 'Fix validation errors before syncing'}
          >
            🔄 Sync to Graph
          </button>
          <button onClick={() => setShowLoadDialog(true)} className="load-btn">
            📁 Load Model
          </button>
          <button onClick={() => setShowSaveDialog(true)} className="save-btn">
            💾 Save Model
          </button>
          <button onClick={formatRDF} className="format-btn">
            🎨 Format
          </button>
        </div>
      </div>

      <div className="editor-toolbar">
        <div className="template-buttons">
          <span className="toolbar-label">Quick Insert:</span>
          <button onClick={() => insertTemplate('machine')} title="Insert Machine Template">
            🏭 Machine
          </button>
          <button onClick={() => insertTemplate('component')} title="Insert Component Template">
            ⚙️ Component
          </button>
          <button onClick={() => insertTemplate('line')} title="Insert Line Template">
            📏 Line
          </button>
          <button onClick={() => insertTemplate('dependency')} title="Insert Dependency Template">
            🔗 Dependency
          </button>
        </div>
      </div>

      <div className="editor-content">
        <div className="editor-main">
          <textarea
            ref={textareaRef}
            className="rdf-textarea"
            value={rdfContent}
            onChange={(e) => setRdfContent(e.target.value)}
            placeholder="Enter your RDF model here..."
            spellCheck={false}
          />
        </div>
        
        <div className="editor-sidebar">
          <div className="syntax-help">
            <h4>RDF Syntax Guide</h4>
            <div className="syntax-examples">
              <div className="syntax-item">
                <strong>Prefixes:</strong>
                <code>@prefix dt: &lt;http://...&gt; .</code>
              </div>
              <div className="syntax-item">
                <strong>Class Definition:</strong>
                <code>ex:machine1 a dt:Machine .</code>
              </div>
              <div className="syntax-item">
                <strong>Properties:</strong>
                <code>ex:machine1 dt:inLine ex:line1 .</code>
              </div>
              <div className="syntax-item">
                <strong>Labels:</strong>
                <code>ex:machine1 rdfs:label "Machine 1" .</code>
              </div>
            </div>
          </div>

          <div className="namespace-reference">
            <h4>Available Namespaces</h4>
            <div className="namespace-list">
              <div className="namespace-item">
                <strong>dt:</strong> Digital Twin concepts
              </div>
              <div className="namespace-item">
                <strong>ex:</strong> Factory instances
              </div>
              <div className="namespace-item">
                <strong>dbx:</strong> Databricks extensions
              </div>
              <div className="namespace-item">
                <strong>rdfs:</strong> RDF Schema
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Save RDF Model</h3>
              <button onClick={() => setShowSaveDialog(false)}>×</button>
            </div>
            <div className="modal-content">
              <div className="form-group">
                <label>Model Name:</label>
                <input
                  type="text"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder="Enter model name..."
                  autoFocus
                />
              </div>
              <div className="model-stats">
                {validationResult && (
                  <p>This model contains {validationResult.nodes} nodes and {validationResult.edges} relationships.</p>
                )}
              </div>
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowSaveDialog(false)} className="cancel-btn">Cancel</button>
              <button onClick={saveModel} className="save-btn">Save Model</button>
            </div>
          </div>
        </div>
      )}

      {/* Load Dialog */}
      {showLoadDialog && (
        <div className="modal-overlay">
          <div className="modal large">
            <div className="modal-header">
              <h3>Load Saved Model</h3>
              <button onClick={() => setShowLoadDialog(false)}>×</button>
            </div>
            <div className="modal-content">
              {savedModels.length === 0 ? (
                <p className="no-models">No saved models found. Create and save a model first.</p>
              ) : (
                <div className="models-list">
                  {savedModels.map(model => (
                    <div key={model.id} className="model-item">
                      <div className="model-info">
                        <h4>{model.name}</h4>
                        <p>{model.description}</p>
                        <span className="model-date">
                          Created: {new Date(model.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="model-actions">
                        <button onClick={() => loadModel(model)} className="load-btn">
                          Load
                        </button>
                        <button onClick={() => deleteModel(model.id)} className="delete-btn">
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowLoadDialog(false)} className="cancel-btn">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RDFModelEditor;