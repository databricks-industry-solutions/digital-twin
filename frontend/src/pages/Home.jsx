import React, { useState, useEffect, useCallback } from 'react';
import databricksLogo from '../assets/databricks-logo.svg';
import Sidebar from '../components/Sidebar/Sidebar';
import GraphEditor from '../components/GraphEditor/GraphEditor';
import TelemetryOverlay from '../components/TelemetryPanel/TelemetryOverlay';
import SPARQLQueryInterface from '../components/CommandCenter/SPARQLQueryInterface';
import AlertsCenter from '../components/AlertsCenter/AlertsCenter';
import ThreeDViewer from '../components/ThreeDViewer/ThreeDViewer';
import RDFModelEditor from '../components/RDFEditor/RDFModelEditor';
import ModelLibrary from '../components/RDFEditor/ModelLibrary';
import TelemetryDebugPanel from '../components/TelemetryPanel/TelemetryDebugPanel';
import { RDFParser } from '../utils/rdfParser';
import { TelemetryFetcher } from '../utils/telemetryFetcher';
import { RDFWriter } from '../utils/rdfWriter';
import './Home.css';

const rdfData = `
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
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
	rdfs:label "Assembly Machine 1" .

ex:machine2 a dt:Machine ;
	dt:inLine ex:line1 ;
	rdfs:label "Quality Control Machine" .

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

ex:machine2 dbx:dependsOn ex:machine1 .
`;

const Home = () => {
  const [graphData, setGraphData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [telemetryData, setTelemetryData] = useState([]);
  const [rdfParser, setRdfParser] = useState(null);
  const [rdfWriter] = useState(new RDFWriter());
  const [telemetryFetcher] = useState(new TelemetryFetcher());
  const [overlayPosition, setOverlayPosition] = useState({ x: 0, y: 0 });
  const [activeModule, setActiveModule] = useState('rdf-editor');
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentRdfModel, setCurrentRdfModel] = useState(rdfData);

  useEffect(() => {
    initializeApp();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      const latestTelemetry = await telemetryFetcher.fetchAllLatestTelemetry();
      setTelemetryData(latestTelemetry);
    }, 5000);

    return () => clearInterval(interval);
  }, [telemetryFetcher]);

  const initializeApp = async () => {
    try {
      setIsLoading(true);
      
      const parser = new RDFParser();
      const parsedGraph = await parser.parseRDF(currentRdfModel);
      
      setRdfParser(parser);
      setGraphData(parsedGraph);
      
      const initialTelemetry = await telemetryFetcher.fetchAllLatestTelemetry();
      setTelemetryData(initialTelemetry);
      
    } catch (error) {
      console.error('Error initializing app:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleModelChange = async (newModel, parsedGraph) => {
    console.log('Manual sync triggered:', { newModel: newModel?.substring(0, 100) + '...', parsedGraph });
    setCurrentRdfModel(newModel);
    if (parsedGraph) {
      console.log('Using provided parsed graph:', parsedGraph);
      setGraphData(parsedGraph);
    } else {
      // Re-parse if no parsed graph provided
      try {
        const parser = new RDFParser();
        const newParsedGraph = await parser.parseRDF(newModel);
        console.log('Newly parsed graph:', newParsedGraph);
        setGraphData(newParsedGraph);
        setRdfParser(parser);
      } catch (error) {
        console.error('Error parsing new model:', error);
      }
    }
  };

  const handleGraphChange = async (newGraphData, forceSync = false) => {
    try {
      // Always update graph data locally
      setGraphData(newGraphData);
      
      // Only sync back to RDF if explicitly requested
      if (forceSync) {
        console.log('Syncing graph changes back to RDF Editor');
        const newRdfModel = await rdfWriter.graphToRDF(newGraphData.nodes, newGraphData.edges);
        setCurrentRdfModel(newRdfModel);
        
        // Update the RDF parser with new data
        const parser = new RDFParser();
        await parser.parseRDF(newRdfModel);
        setRdfParser(parser);
      }
      
    } catch (error) {
      console.error('Error converting graph to RDF:', error);
    }
  };

  const handleLoadModel = (modelContent) => {
    setCurrentRdfModel(modelContent);
    setActiveModule('rdf-editor');
  };

  const handleNodeClick = useCallback((nodeData, position) => {
    setSelectedNode(nodeData);
    if (position) {
      setOverlayPosition(position);
    }
  }, []);

  const handleNodeDrag = useCallback((nodeData, position) => {
    console.log('Node dragged:', nodeData.label, 'to position:', position);
  }, []);

  const handleEdgeCreate = useCallback(async (edgeData) => {
    try {
      rdfWriter.addRelationship(edgeData.source, edgeData.type, edgeData.target);
      
      setGraphData(prev => ({
        ...prev,
        edges: [...prev.edges, {
          id: `${edgeData.source}-${edgeData.type}-${edgeData.target}`,
          ...edgeData
        }]
      }));
      
      console.log('Edge created:', edgeData);
    } catch (error) {
      console.error('Error creating edge:', error);
    }
  }, [rdfWriter]);

  const handleQueryResult = (results) => {
    console.log('SPARQL Query Results:', results);
  };

  const handleHighlightNodes = (nodeIds) => {
    console.log('Highlight nodes:', nodeIds);
  };

  const closeOverlay = () => {
    setSelectedNode(null);
  };

  const renderActiveModule = () => {
    switch (activeModule) {
      case 'rdf-editor':
        return (
          <RDFModelEditor
            initialModel={currentRdfModel}
            onModelChange={handleModelChange}
          />
        );
      
      case 'model-library':
        return (
          <ModelLibrary
            onLoadModel={handleLoadModel}
          />
        );
      
      case 'graph':
        return (
          <div className="graph-module">
            <GraphEditor
              graphData={graphData}
              onNodeClick={handleNodeClick}
              onNodeDrag={handleNodeDrag}
              onEdgeCreate={handleEdgeCreate}
              onGraphChange={handleGraphChange}
              telemetryData={telemetryData}
            />
            {selectedNode && (
              <TelemetryOverlay
                selectedNode={selectedNode}
                onClose={closeOverlay}
                position={overlayPosition}
              />
            )}
          </div>
        );
      
      case '3d':
        return <ThreeDViewer />;
      
      case 'dashboard':
        return (
          <div className="coming-soon">
            <h2>📈 Custom Dashboard</h2>
            <p>Advanced dashboard with custom widgets and real-time monitoring.</p>
          </div>
        );
      
      case 'sparql':
        return (
          <SPARQLQueryInterface
            rdfParser={rdfParser}
            onQueryResult={handleQueryResult}
            onHighlightNodes={handleHighlightNodes}
          />
        );
      
      case 'analytics':
        return (
          <div className="coming-soon">
            <h2>📊 Analytics</h2>
            <p>Advanced analytics tools for data insights and trend analysis.</p>
          </div>
        );
      
      case 'telemetry':
        return (
          <div className="telemetry-dashboard">
            <h2>📈 Telemetry Dashboard</h2>
            <div className="telemetry-overview">
              <div className="telemetry-stats">
                <div className="stat-card">
                  <h3>Active Components</h3>
                  <span className="stat-value">{telemetryData.length}</span>
                </div>
                <div className="stat-card">
                  <h3>Healthy Systems</h3>
                  <span className="stat-value">
                    {telemetryData.filter(data => 
                      telemetryFetcher.getComponentHealth(data) === 'healthy'
                    ).length}
                  </span>
                </div>
                <div className="stat-card warning">
                  <h3>Warnings</h3>
                  <span className="stat-value">
                    {telemetryData.filter(data => 
                      telemetryFetcher.getComponentHealth(data) === 'warning'
                    ).length}
                  </span>
                </div>
                <div className="stat-card critical">
                  <h3>Critical</h3>
                  <span className="stat-value">
                    {telemetryData.filter(data => 
                      telemetryFetcher.getComponentHealth(data) === 'critical'
                    ).length}
                  </span>
                </div>
              </div>
              <TelemetryDebugPanel />
            </div>
          </div>
        );
      
      case 'alerts':
        return (
          <AlertsCenter
            telemetryData={telemetryData}
            graphData={graphData}
          />
        );
      
      case 'logs':
        return (
          <div className="coming-soon">
            <h2>📋 System Logs</h2>
            <p>Comprehensive logging and audit trail for system events.</p>
          </div>
        );
      
      default:
        return (
          <div className="welcome-screen">
            <h2>🏭 Welcome to Digital Twin</h2>
            <p>Select a module from the sidebar to get started.</p>
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <h2>Loading Digital Twin...</h2>
          <p>Initializing RDF data and telemetry systems</p>
        </div>
      </div>
    );
  }

  return (
    <div className="home-container">
      <Sidebar
        activeModule={activeModule}
        onModuleChange={setActiveModule}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        isCollapsed={sidebarCollapsed}
      />
      
      <div className={`main-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <header className="app-header">
          <div className="header-content">
            <div className="header-title">
              <div className="header-logo-section">
                <img src={databricksLogo} alt="Databricks" className="databricks-logo" />
                <div className="title-text">
                  <h1>Digital Twin Manufacturing System</h1>
                  <span className="powered-by">Powered by Databricks</span>
                </div>
              </div>
              <div className="breadcrumb">
                {activeModule === 'rdf-editor' && 'Data Modeling / RDF Model Editor'}
                {activeModule === 'model-library' && 'Data Modeling / Model Library'}
                {activeModule === 'graph' && 'Visualization / Graph Editor'}
                {activeModule === '3d' && 'Visualization / 3D Viewer'}
                {activeModule === 'dashboard' && 'Visualization / Dashboard'}
                {activeModule === 'sparql' && 'Analysis & Query / SPARQL Query'}
                {activeModule === 'analytics' && 'Analysis & Query / Analytics'}
                {activeModule === 'telemetry' && 'Monitoring / Telemetry'}
                {activeModule === 'alerts' && 'Monitoring / Alerts'}
                {activeModule === 'logs' && 'Monitoring / System Logs'}
              </div>
            </div>
            <div className="header-stats">
              <div className="stat-item">
                <span className="stat-label">Components</span>
                <span className="stat-value">{graphData?.nodes?.length || 0}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Relationships</span>
                <span className="stat-value">{graphData?.edges?.length || 0}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Active Sensors</span>
                <span className="stat-value">{telemetryData?.length || 0}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="main-content">
          {renderActiveModule()}
        </main>
      </div>
    </div>
  );
};

export default Home;