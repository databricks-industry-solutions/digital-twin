import React, { useEffect, useRef, useState, useCallback, memo } from 'react';
import cytoscape from 'cytoscape';
import './GraphEditor.css';

const GraphEditor = ({ graphData, onNodeClick, onEdgeCreate, onNodeDrag, onGraphChange, telemetryData }) => {
  const cyRef = useRef(null);
  const containerRef = useRef(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [sourceNode, setSourceNode] = useState(null);
  const [showCustomization, setShowCustomization] = useState(false);
  const [showNodeDialog, setShowNodeDialog] = useState(false);
  const [editingNode, setEditingNode] = useState(null);
  const [graphSettings, setGraphSettings] = useState({
    layout: 'preset',
    showLabels: true,
    showHealthStatus: true,
    nodeSize: 'medium',
    edgeStyle: 'curved',
    theme: 'default'
  });

  useEffect(() => {
    console.log('GraphEditor useEffect triggered:', { graphData, containerRef: !!containerRef.current });
    if (!containerRef.current || !graphData || !graphData.nodes || !graphData.edges) {
      console.log('GraphEditor: Missing container or graphData', { 
        container: !!containerRef.current, 
        graphData: graphData,
        nodes: graphData?.nodes?.length,
        edges: graphData?.edges?.length
      });
      return;
    }

    // Destroy existing instance if it exists
    if (cyRef.current) {
      try {
        cyRef.current.destroy();
      } catch (error) {
        console.warn('Error destroying previous cytoscape instance:', error);
      }
      cyRef.current = null;
    }

    // Add a small delay to ensure container is ready
    const timeoutId = setTimeout(() => {
      if (!containerRef.current) return;

    try {
      const cy = cytoscape({
        container: containerRef.current,
        elements: [
          ...graphData.nodes.map((node, index) => ({
            data: {
              id: node.id,
              label: node.label,
              type: node.type,
              uri: node.data?.uri || node.id
            },
            position: node.position || { 
              x: 100 + (index % 3) * 200, 
              y: 100 + Math.floor(index / 3) * 150 
            },
            classes: `node-${node.type} ${getHealthClass(node.id, telemetryData)}`
          })),
          ...graphData.edges.map(edge => ({
            data: {
              id: edge.id,
              source: edge.source,
              target: edge.target,
              label: edge.label,
              type: edge.type
            },
            classes: `edge-${edge.type}`
          }))
        ],
      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#666',
            'label': 'data(label)',
            'text-valign': 'center',
            'text-halign': 'center',
            'color': '#fff',
            'font-size': '10px',
            'text-wrap': 'wrap',
            'text-max-width': '80px',
            'width': 60,
            'height': 60,
            'border-width': 2,
            'border-color': '#333'
          }
        },
        {
          selector: 'node.node-line',
          style: {
            'background-color': '#3498db',
            'shape': 'rectangle',
            'width': 120,
            'height': 50,
            'font-size': '11px',
            'text-max-width': '110px'
          }
        },
        {
          selector: 'node.node-machine',
          style: {
            'background-color': '#e74c3c',
            'shape': 'round-rectangle',
            'width': 90,
            'height': 60,
            'font-size': '10px',
            'text-max-width': '80px'
          }
        },
        {
          selector: 'node.node-component',
          style: {
            'background-color': '#2ecc71',
            'shape': 'ellipse',
            'width': 65,
            'height': 55,
            'font-size': '9px',
            'text-max-width': '55px'
          }
        },
        {
          selector: 'node.node-sensor',
          style: {
            'background-color': '#f39c12',
            'shape': 'diamond',
            'width': 50,
            'height': 50,
            'font-size': '8px',
            'text-max-width': '40px'
          }
        },
        {
          selector: 'node.health-healthy',
          style: {
            'border-color': '#27ae60',
            'border-width': 3
          }
        },
        {
          selector: 'node.health-warning',
          style: {
            'border-color': '#f39c12',
            'border-width': 3
          }
        },
        {
          selector: 'node.health-critical',
          style: {
            'border-color': '#e74c3c',
            'border-width': 3
          }
        },
        {
          selector: 'node.health-fault',
          style: {
            'border-color': '#c0392b',
            'border-width': 4,
            'background-color': '#e74c3c'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#666',
            'target-arrow-color': '#666',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'label': 'data(label)',
            'font-size': '10px',
            'text-rotation': 'autorotate'
          }
        },
        {
          selector: 'edge.edge-inLine',
          style: {
            'line-color': '#3498db',
            'target-arrow-color': '#3498db'
          }
        },
        {
          selector: 'edge.edge-partOf',
          style: {
            'line-color': '#2ecc71',
            'target-arrow-color': '#2ecc71'
          }
        },
        {
          selector: 'edge.edge-dependsOn',
          style: {
            'line-color': '#e74c3c',
            'target-arrow-color': '#e74c3c',
            'line-style': 'dashed'
          }
        },
        {
          selector: 'node:selected',
          style: {
            'overlay-color': '#3498db',
            'overlay-padding': 10,
            'overlay-opacity': 0.3
          }
        },
        {
          selector: '.highlighted',
          style: {
            'background-color': '#f39c12',
            'line-color': '#f39c12',
            'target-arrow-color': '#f39c12',
            'transition-property': 'background-color, line-color, target-arrow-color',
            'transition-duration': '0.5s'
          }
        }
      ],
      layout: {
        name: 'preset', // Use preset layout to prevent automatic movement
        fit: true,
        padding: 30
      },
      minZoom: 0.1,
      maxZoom: 3.0,
      wheelSensitivity: 0.2
    });

    cy.on('tap', 'node', (event) => {
      if (!event.target || !cyRef.current) return;
      const node = event.target;
      setSelectedNode(node.data());
      
      if (isConnecting && sourceNode) {
        if (sourceNode.id() !== node.id()) {
          createConnection(sourceNode, node);
        }
        setIsConnecting(false);
        setSourceNode(null);
      } else {
        if (onNodeClick) {
          onNodeClick(node.data());
        }
      }
    });

    cy.on('tap', (event) => {
      if (!cyRef.current || event.target === cy) {
        setSelectedNode(null);
        setIsConnecting(false);
        setSourceNode(null);
      }
    });

    cy.on('position', 'node', (event) => {
      if (!event.target || !cyRef.current) return;
      if (onNodeDrag) {
        const node = event.target;
        onNodeDrag(node.data(), node.position());
      }
    });

    cy.on('cxttap', 'node', (event) => {
      if (!event.target || !cyRef.current) return;
      event.preventDefault();
      const node = event.target;
      const position = event.renderedPosition;
      
      // Show context menu
      showContextMenu(position, 'node', node.id());
    });

    cy.on('cxttap', 'edge', (event) => {
      if (!event.target || !cyRef.current) return;
      event.preventDefault();
      const edge = event.target;
      const position = event.renderedPosition;
      
      // Show context menu
      showContextMenu(position, 'edge', edge.id());
    });

    cy.on('cxttap', (event) => {
      if (!cyRef.current || event.target === cy) {
        event.preventDefault();
        const position = event.renderedPosition;
        
        // Show context menu for background
        showContextMenu(position, 'background');
      }
    });

    // Handle node position changes
    cy.on('dragfree', 'node', () => {
      if (!cyRef.current) return;
      emitGraphChange();
    });

      cyRef.current = cy;

    } catch (error) {
      console.error('Error initializing Cytoscape:', error);
      return;
    }
    }, 100); // Small delay to ensure DOM is ready

    return () => {
      clearTimeout(timeoutId);
      if (cyRef.current) {
        try {
          cyRef.current.destroy();
        } catch (error) {
          console.warn('Error destroying cytoscape on cleanup:', error);
        }
        cyRef.current = null;
      }
    };
  }, [graphData]); // Remove telemetryData from dependencies to prevent re-renders

  // Separate effect for telemetry updates - only update node classes, don't recreate graph
  useEffect(() => {
    if (cyRef.current && telemetryData) {
      cyRef.current.nodes().forEach(node => {
        // Remove existing health classes
        node.removeClass('health-healthy health-warning health-critical health-fault health-unknown');
        
        // Add new health class
        const healthClass = getHealthClass(node.id(), telemetryData);
        node.addClass(healthClass);
      });
    }
  }, [telemetryData]);

  const getHealthClass = (nodeId, telemetryData) => {
    if (!telemetryData) return 'health-unknown';
    
    const componentId = nodeId.split('/').pop();
    const telemetry = telemetryData.find(data => data.componentID === componentId);
    
    if (!telemetry) return 'health-unknown';
    
    const { sensorAReading, sensorBReading, sensorCReading, sensorDReading } = telemetry;
    
    if (sensorAReading > 100 || sensorBReading > 70 || sensorCReading > 140 || sensorDReading > 85) {
      return 'health-critical';
    }
    
    if (sensorAReading > 90 || sensorBReading > 60 || sensorCReading > 120 || sensorDReading > 75) {
      return 'health-warning';
    }
    
    return 'health-healthy';
  };

  const createConnection = useCallback((sourceNode, targetNode) => {
    const connectionType = prompt('Enter connection type (inLine, partOf, dependsOn):') || 'relationship';
    
    if (onEdgeCreate) {
      onEdgeCreate({
        source: sourceNode.id(),
        target: targetNode.id(),
        type: connectionType,
        label: connectionType
      });
    }
    
    const cy = cyRef.current;
    cy.add({
      data: {
        id: `${sourceNode.id()}-${connectionType}-${targetNode.id()}`,
        source: sourceNode.id(),
        target: targetNode.id(),
        label: connectionType,
        type: connectionType
      },
      classes: `edge-${connectionType}`
    });
    
    sourceNode.removeClass('connecting');
    emitGraphChange();
  }, [onEdgeCreate]);

  const showContextMenu = useCallback((position, type, itemId) => {
    // Simple context menu implementation
    if (type === 'node') {
      const actions = [
        { label: 'Edit Node', action: () => editNode(itemId) },
        { label: 'Delete Node', action: () => deleteNode(itemId) },
        { label: 'Connect to...', action: () => startConnection(itemId) }
      ];
      showMenu(position, actions);
    } else if (type === 'edge') {
      const actions = [
        { label: 'Delete Connection', action: () => deleteEdge(itemId) }
      ];
      showMenu(position, actions);
    } else if (type === 'background') {
      const actions = [
        { label: 'Add Line', action: () => addNode('line', position) },
        { label: 'Add Machine', action: () => addNode('machine', position) },
        { label: 'Add Component', action: () => addNode('component', position) },
        { label: 'Add Sensor', action: () => addNode('sensor', position) }
      ];
      showMenu(position, actions);
    }
  }, []);

  const showMenu = (position, actions) => {
    // For now, use simple confirm dialogs
    // In a full implementation, you'd create a proper context menu component
    const actionLabels = actions.map(a => a.label).join('\n');
    const choice = prompt(`Choose action:\n${actionLabels}\n\nEnter the number (1-${actions.length}):`);
    const index = parseInt(choice) - 1;
    
    if (index >= 0 && index < actions.length) {
      actions[index].action();
    }
  };

  const startConnection = (nodeId) => {
    if (cyRef.current) {
      const node = cyRef.current.getElementById(nodeId);
      setIsConnecting(true);
      setSourceNode(node);
      node.addClass('connecting');
    }
  };

  const fitToView = () => {
    if (cyRef.current) {
      cyRef.current.fit();
    }
  };

  const centerOnNode = (nodeId) => {
    if (cyRef.current) {
      const node = cyRef.current.getElementById(nodeId);
      if (node.length > 0) {
        cyRef.current.center(node);
        cyRef.current.zoom(1.5);
      }
    }
  };

  const highlightPath = (nodeIds) => {
    if (cyRef.current) {
      cyRef.current.elements().removeClass('highlighted');
      
      nodeIds.forEach(nodeId => {
        const node = cyRef.current.getElementById(nodeId);
        node.addClass('highlighted');
      });
    }
  };

  const resetHighlight = () => {
    if (cyRef.current) {
      cyRef.current.elements().removeClass('highlighted');
    }
  };

  const exportGraph = () => {
    if (cyRef.current) {
      const png = cyRef.current.png({ scale: 2, full: true });
      const link = document.createElement('a');
      link.download = 'digital-twin-graph.png';
      link.href = png;
      link.click();
    }
  };

  const applyLayout = (layoutName) => {
    if (cyRef.current) {
      const layoutOptions = {
        cose: {
          name: 'cose',
          idealEdgeLength: 100,
          nodeOverlap: 20,
          refresh: 0, // Stop automatic refresh
          fit: true,
          padding: 30,
          randomize: false,
          componentSpacing: 100,
          animate: true,
          animationDuration: 1000,
          stop: function() {
            // Layout finished, save positions
            emitGraphChange();
          }
        },
        circle: {
          name: 'circle',
          fit: true,
          padding: 30,
          radius: 200,
          animate: true,
          animationDuration: 1000
        },
        grid: {
          name: 'grid',
          fit: true,
          padding: 30,
          rows: undefined,
          cols: undefined,
          animate: true,
          animationDuration: 1000
        },
        breadthfirst: {
          name: 'breadthfirst',
          fit: true,
          directed: true,
          padding: 30,
          spacingFactor: 1.75,
          animate: true,
          animationDuration: 1000
        },
        concentric: {
          name: 'concentric',
          fit: true,
          padding: 30,
          startAngle: 3.14159 / 4,
          clockwise: true,
          animate: true,
          animationDuration: 1000
        },
        preset: {
          name: 'preset',
          fit: true,
          padding: 30
        }
      };
      
      const layout = cyRef.current.layout(layoutOptions[layoutName] || layoutOptions.preset);
      layout.run();
    }
  };

  const updateGraphSettings = (newSettings) => {
    setGraphSettings(prev => ({ ...prev, ...newSettings }));
    
    if (cyRef.current) {
      // Don't automatically apply layout changes - user must click Layout button
      // Only apply style changes immediately
      const updatedSettings = { ...graphSettings, ...newSettings };
      updateGraphStyles(updatedSettings);
    }
  };

  const updateGraphStyles = (settings) => {
    if (!cyRef.current) return;

    // Define node type specific sizing with text wrapping
    const nodeTypeSettings = {
      small: {
        line: { width: 100, height: 40, fontSize: '9px', textMaxWidth: '90px' },
        machine: { width: 75, height: 50, fontSize: '8px', textMaxWidth: '65px' },
        component: { width: 50, height: 45, fontSize: '7px', textMaxWidth: '40px' },
        sensor: { width: 35, height: 35, fontSize: '6px', textMaxWidth: '30px' }
      },
      medium: {
        line: { width: 120, height: 50, fontSize: '11px', textMaxWidth: '110px' },
        machine: { width: 90, height: 60, fontSize: '10px', textMaxWidth: '80px' },
        component: { width: 65, height: 55, fontSize: '9px', textMaxWidth: '55px' },
        sensor: { width: 50, height: 50, fontSize: '8px', textMaxWidth: '40px' }
      },
      large: {
        line: { width: 140, height: 60, fontSize: '13px', textMaxWidth: '130px' },
        machine: { width: 110, height: 75, fontSize: '12px', textMaxWidth: '100px' },
        component: { width: 80, height: 70, fontSize: '11px', textMaxWidth: '70px' },
        sensor: { width: 65, height: 65, fontSize: '10px', textMaxWidth: '55px' }
      }
    };

    const sizeSettings = nodeTypeSettings[settings.nodeSize] || nodeTypeSettings.medium;
    
    cyRef.current.style()
      .selector('node')
      .style({
        'label': settings.showLabels ? 'data(label)' : '',
        'text-wrap': 'wrap',
        'text-valign': 'center',
        'text-halign': 'center'
      })
      .selector('node.node-line')
      .style({
        'width': sizeSettings.line.width,
        'height': sizeSettings.line.height,
        'font-size': sizeSettings.line.fontSize,
        'text-max-width': sizeSettings.line.textMaxWidth
      })
      .selector('node.node-machine')
      .style({
        'width': sizeSettings.machine.width,
        'height': sizeSettings.machine.height,
        'font-size': sizeSettings.machine.fontSize,
        'text-max-width': sizeSettings.machine.textMaxWidth
      })
      .selector('node.node-component')
      .style({
        'width': sizeSettings.component.width,
        'height': sizeSettings.component.height,
        'font-size': sizeSettings.component.fontSize,
        'text-max-width': sizeSettings.component.textMaxWidth
      })
      .selector('node.node-sensor')
      .style({
        'width': sizeSettings.sensor.width,
        'height': sizeSettings.sensor.height,
        'font-size': sizeSettings.sensor.fontSize,
        'text-max-width': sizeSettings.sensor.textMaxWidth
      })
      .selector('edge')
      .style({
        'curve-style': settings.edgeStyle === 'straight' ? 'straight' : 'bezier',
        'label': settings.showLabels ? 'data(label)' : ''
      })
      .update();

    // Apply health status visibility
    if (settings.showHealthStatus) {
      cyRef.current.elements().forEach(ele => {
        if (ele.isNode()) {
          const healthClass = getHealthClass(ele.id(), telemetryData);
          ele.addClass(healthClass);
        }
      });
    } else {
      cyRef.current.nodes().removeClass('health-healthy health-warning health-critical health-fault');
    }
  };

  const saveGraphConfiguration = () => {
    localStorage.setItem('graph-settings', JSON.stringify(graphSettings));
    alert('Graph configuration saved!');
  };

  const loadGraphConfiguration = () => {
    const saved = localStorage.getItem('graph-settings');
    if (saved) {
      const settings = JSON.parse(saved);
      setGraphSettings(settings);
      updateGraphSettings(settings);
    }
  };

  const emitGraphChange = useCallback((forceSync = false) => {
    if (cyRef.current && onGraphChange) {
      const nodes = cyRef.current.nodes().map(node => ({
        id: node.id(),
        label: node.data('label'),
        type: node.data('type'),
        data: { uri: node.data('uri') || node.id() },
        position: node.position()
      }));

      const edges = cyRef.current.edges().map(edge => ({
        id: edge.id(),
        source: edge.source().id(),
        target: edge.target().id(),
        label: edge.data('label'),
        type: edge.data('type')
      }));

      onGraphChange({ nodes, edges }, forceSync);
      
      if (forceSync) {
        alert('Graph changes synced to RDF Editor!');
      }
    }
  }, [onGraphChange]);

  const addNode = (nodeType, position) => {
    if (!cyRef.current) return;

    const nodeId = `ex:new${nodeType}${Date.now()}`;
    const nodeLabel = `New ${nodeType.charAt(0).toUpperCase() + nodeType.slice(1)}`;

    cyRef.current.add({
      data: {
        id: nodeId,
        label: nodeLabel,
        type: nodeType,
        uri: nodeId
      },
      position: position || { x: 200, y: 200 },
      classes: `node-${nodeType}`
    });

    emitGraphChange();
  };

  const editNode = (nodeId) => {
    const node = cyRef.current.getElementById(nodeId);
    if (node.length > 0) {
      setEditingNode({
        id: nodeId,
        label: node.data('label'),
        type: node.data('type')
      });
      setShowNodeDialog(true);
    }
  };

  const saveNodeEdit = (nodeData) => {
    if (!cyRef.current || !editingNode) return;

    const node = cyRef.current.getElementById(editingNode.id);
    if (node.length > 0) {
      node.data('label', nodeData.label);
      node.data('type', nodeData.type);
      node.removeClass('node-line node-machine node-component node-sensor');
      node.addClass(`node-${nodeData.type}`);
    }

    setShowNodeDialog(false);
    setEditingNode(null);
    emitGraphChange();
  };

  const deleteNode = (nodeId) => {
    if (!cyRef.current) return;
    
    if (window.confirm('Are you sure you want to delete this node and all its connections?')) {
      cyRef.current.getElementById(nodeId).remove();
      emitGraphChange();
    }
  };

  const deleteEdge = (edgeId) => {
    if (!cyRef.current) return;
    
    if (window.confirm('Are you sure you want to delete this connection?')) {
      cyRef.current.getElementById(edgeId).remove();
      emitGraphChange();
    }
  };

  return (
    <div className="graph-editor">
      <div className="graph-controls">
        <div className="controls-left">
          <button onClick={fitToView} title="Fit to view">
            🔍 Fit
          </button>
          <button onClick={exportGraph} title="Export as PNG">
            📷 Export
          </button>
          <button onClick={resetHighlight} title="Clear highlights">
            🔄 Reset
          </button>
          <button onClick={() => applyLayout(graphSettings.layout)} title="Refresh layout">
            📐 Layout
          </button>
          <button 
            onClick={() => setShowCustomization(!showCustomization)} 
            title="Customize graph"
            className={showCustomization ? 'active' : ''}
          >
            ⚙️ Customize
          </button>
          <div className="add-nodes-group">
            <button onClick={() => addNode('line')} title="Add Line">
              📏 Line
            </button>
            <button onClick={() => addNode('machine')} title="Add Machine">
              🏭 Machine
            </button>
            <button onClick={() => addNode('component')} title="Add Component">
              ⚙️ Component
            </button>
          </div>
          <button 
            onClick={() => emitGraphChange(true)} 
            className="sync-to-rdf-btn"
            title="Sync graph changes back to RDF Editor"
          >
            🔄 Sync to RDF
          </button>
        </div>
        
        <div className="controls-right">
          {isConnecting && (
            <div className="connection-mode">
              Connection mode: Click target node
            </div>
          )}
        </div>
      </div>

      {showCustomization && (
        <div className="customization-panel">
          <div className="customization-section">
            <h4>Layout</h4>
            <select 
              value={graphSettings.layout} 
              onChange={(e) => updateGraphSettings({ layout: e.target.value })}
            >
              <option value="preset">Static (No Auto-Layout)</option>
              <option value="cose">Force-directed (COSE)</option>
              <option value="circle">Circle</option>
              <option value="grid">Grid</option>
              <option value="breadthfirst">Hierarchical</option>
              <option value="concentric">Concentric</option>
            </select>
          </div>

          <div className="customization-section">
            <h4>Appearance</h4>
            <div className="setting-group">
              <label>
                <input
                  type="checkbox"
                  checked={graphSettings.showLabels}
                  onChange={(e) => updateGraphSettings({ showLabels: e.target.checked })}
                />
                Show Labels
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={graphSettings.showHealthStatus}
                  onChange={(e) => updateGraphSettings({ showHealthStatus: e.target.checked })}
                />
                Show Health Status
              </label>
            </div>
          </div>

          <div className="customization-section">
            <h4>Node Size</h4>
            <select 
              value={graphSettings.nodeSize} 
              onChange={(e) => updateGraphSettings({ nodeSize: e.target.value })}
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>

          <div className="customization-section">
            <h4>Edge Style</h4>
            <select 
              value={graphSettings.edgeStyle} 
              onChange={(e) => updateGraphSettings({ edgeStyle: e.target.value })}
            >
              <option value="curved">Curved</option>
              <option value="straight">Straight</option>
            </select>
          </div>

          <div className="customization-actions">
            <button onClick={saveGraphConfiguration} className="save-config-btn">
              💾 Save Config
            </button>
            <button onClick={loadGraphConfiguration} className="load-config-btn">
              📁 Load Config
            </button>
          </div>
        </div>
      )}
      
      <div className="graph-container" ref={containerRef} />
      
      {selectedNode && (
        <div className="node-info">
          <h4>{selectedNode.label}</h4>
          <p>Type: {selectedNode.type}</p>
          <p>URI: {selectedNode.uri}</p>
        </div>
      )}

      {/* Node Edit Dialog */}
      {showNodeDialog && editingNode && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Edit Node</h3>
              <button onClick={() => setShowNodeDialog(false)}>×</button>
            </div>
            <div className="modal-content">
              <NodeEditForm
                nodeData={editingNode}
                onSave={saveNodeEdit}
                onCancel={() => setShowNodeDialog(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Node Edit Form Component
const NodeEditForm = ({ nodeData, onSave, onCancel }) => {
  const [label, setLabel] = useState(nodeData.label || '');
  const [type, setType] = useState(nodeData.type || 'component');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ label, type });
  };

  return (
    <form onSubmit={handleSubmit} className="node-edit-form">
      <div className="form-group">
        <label>Label:</label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          required
        />
      </div>
      <div className="form-group">
        <label>Type:</label>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="line">Line</option>
          <option value="machine">Machine</option>
          <option value="component">Component</option>
          <option value="sensor">Sensor</option>
        </select>
      </div>
      <div className="form-actions">
        <button type="button" onClick={onCancel} className="cancel-btn">
          Cancel
        </button>
        <button type="submit" className="save-btn">
          Save Changes
        </button>
      </div>
    </form>
  );
};

// Memoize the component to prevent unnecessary re-renders
export default memo(GraphEditor, (prevProps, nextProps) => {
  // Only re-render if graphData structure changes, not telemetry data
  const graphDataChanged = JSON.stringify(prevProps.graphData) !== JSON.stringify(nextProps.graphData);
  const callbacksChanged = (
    prevProps.onNodeClick !== nextProps.onNodeClick ||
    prevProps.onEdgeCreate !== nextProps.onEdgeCreate ||
    prevProps.onNodeDrag !== nextProps.onNodeDrag ||
    prevProps.onGraphChange !== nextProps.onGraphChange
  );
  
  // Don't re-render for telemetry data changes - handle those separately in useEffect
  return !graphDataChanged && !callbacksChanged;
});