import React, { useState, useEffect, useCallback } from 'react';
import databricksLogo from '../assets/databricks-logo.svg';
import Sidebar from '../components/Sidebar/Sidebar';
import GraphEditor from '../components/GraphEditor/GraphEditor';
import TelemetryOverlay from '../components/TelemetryPanel/TelemetryOverlay';
import SPARQLQueryInterface from '../components/CommandCenter/SPARQLQueryInterface';
import AlertsCenter from '../components/AlertsCenter/AlertsCenter';
import ThreeDViewer from '../components/ThreeDViewer/ThreeDViewer';
import RDFModelEditor from '../components/RDFEditor/RDFModelEditor';
import GraphViewer from '../components/GraphViewer/GraphViewer.jsx';
import ModelLibrary from '../components/RDFEditor/ModelLibraryNew';
import TelemetryDebugPanel from '../components/TelemetryPanel/TelemetryDebugPanel';
import ConnectionTestPanel from '../components/TelemetryPanel/ConnectionTestPanel';
import { RDFParser } from '../utils/rdfParser';
import { TelemetryFetcher } from '../utils/telemetryFetcher';
import { RDFWriter } from '../utils/rdfWriter';
import RDFTripleService from '../services/rdfTripleService';
import './Home.css';

const rdfData = `@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
# This prefix defines built in predicates provided by Databricks Digital Twins
@prefix dt: <http://databricks.com/digitaltwin/> .
# Replace this prefix with your own
@prefix ex: <http://example.com/factory/> .

################################################################################
# Definitions of Databricks Digital Twin built in predicates
################################################################################

dt:partOf a rdfs:Property ;
    rdfs:label "part of" ;
    rdfs:comment "Indicates that the subject is a part of the object. Visualised as the subject being drawn inside the object." .

dt:dependsOn a rdfs:Property ;
    rdfs:label "depends on" ;
    rdfs:comment "Indicates that the subject is somehow reliant on the object to function. Visualised as an arrow from the object to the subject." .

dt:propagates a rdfs:Property ;
    rdfs:label "propagates" ;
    rdfs:comment "Indicates that faults in the object will affect the subject. Visualised as a different colour for indirectly affected entities." .

################################################################################
# Ball bearing factory concept definitions
################################################################################

ex:inLine rdfs:subPropertyOf dt:partOf ;
    rdfs:domain ex:Machine ;
	rdfs:range ex:Line ;
	rdfs:label "in line" ;
	rdfs:comment "A machine is part of a production line" .

ex:componentOf rdfs:subPropertyOf dt:partOf ;
    rdfs:domain ex:Component ;
	rdfs:range ex:Machine ;
	rdfs:label "component of" ;
	rdfs:comment "A machine is comprised of components" .

ex:Line a rdfs:Class ;
    rdfs:comment "A production line performs a series of steps to produce a particular element of the finished product" .

ex:Machine a rdfs:Class ;
    rdfs:comment "A machine performs a specific task e.g. grinding or honing" .

ex:Component a rdfs:Class ;
    rdfs:comment "A component is part of a machine that is essential to its function" .

ex:upstream rdfs:subPropertyOf dt:dependsOn .
ex:upstream rdfs:subPropertyOf dt:propagates .

################################################################################
# Ball bearing factory model definition
# Line 1: Outer ring
################################################################################

ex:line1 a ex:Line ;
    rdfs:label "Outer ring production line".

ex:machine1 a ex:Machine ;
	ex:inLine ex:line1 ;
	ex:serialNumber "101E59" ;
	rdfs:label "Machining" .

ex:machine2 a ex:Machine ;
	ex:inLine ex:line1 ;
	ex:upstream ex:machine1 ;
	ex:serialNumber "502C43" ;
	rdfs:label "Grinding" .

ex:machine3 a ex:Machine ;
	ex:inLine ex:line1 ;
	ex:upstream ex:machine2 ;
	ex:serialNumber "446J23" ;
	rdfs:label "Honing" .

ex:component-111 a ex:Component ;
	ex:componentOf ex:machine1 .

ex:component-112 a ex:Component ;
	ex:componentOf ex:machine1 .

ex:component-113 a ex:Component ;
	ex:componentOf ex:machine1 .

ex:component-121 a ex:Component ;
	ex:componentOf ex:machine2 .

ex:component-122 a ex:Component ;
	ex:componentOf ex:machine2 .

ex:component-123 a ex:Component ;
	ex:componentOf ex:machine2 .

ex:component-131 a ex:Component ;
	ex:componentOf ex:machine3 .

ex:component-132 a ex:Component ;
	ex:componentOf ex:machine3 .

ex:component-133 a ex:Component ;
	ex:componentOf ex:machine3 .
`;

const Home = () => {
  const [graphData, setGraphData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [telemetryData, setTelemetryData] = useState([]);
  const [rdfParser, setRdfParser] = useState(null);
  const [rdfWriter] = useState(new RDFWriter());
  const [telemetryFetcher] = useState(new TelemetryFetcher());
  const [rdfTripleService] = useState(new RDFTripleService());
  const [overlayPosition, setOverlayPosition] = useState({ x: 0, y: 0 });
  const [activeModule, setActiveModule] = useState('rdf-editor');
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentRdfModel, setCurrentRdfModel] = useState(rdfData);
  const [dataSource, setDataSource] = useState('static'); // 'static' or 'triples'

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

      // Try loading from RDF triples database first, fallback to static model
      try {
        console.log('🔄 Attempting to load RDF model from triples database...');
        const semanticModel = await rdfTripleService.loadRDFModel();

        setGraphData(semanticModel);
        setDataSource('triples');
        console.log('✅ Successfully loaded RDF model from triples database');

        // Get enhanced telemetry data
        const semanticTelemetry = await rdfTripleService.getTelemetryWithSemanticMapping();
        if (semanticTelemetry.success) {
          setTelemetryData(semanticTelemetry.data);
          console.log('✅ Loaded semantic telemetry data');
        } else {
          throw new Error('Failed to load semantic telemetry');
        }

      } catch (triplesError) {
        console.warn('⚠️ Failed to load from triples database, using static model:', triplesError.message);

        // Fallback to static RDF parsing
        const parser = new RDFParser();
        const parsedGraph = await parser.parseRDF(currentRdfModel);

        setRdfParser(parser);
        setGraphData(parsedGraph);
        setDataSource('static');

        const initialTelemetry = await telemetryFetcher.fetchAllLatestTelemetry();
        setTelemetryData(initialTelemetry);
        console.log('✅ Using static RDF model and telemetry');
      }

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

  const handleLoadModel = async (modelContent) => {
    try {
      console.log('Loading model from library and syncing graph...');
      
      // Update the RDF model state
      setCurrentRdfModel(modelContent);
      
      // Parse the RDF and update the graph data
      const parser = new RDFParser();
      const parsedGraph = await parser.parseRDF(modelContent);
      
      console.log('Model loaded, parsed graph:', parsedGraph);
      
      // Update both parser and graph data
      setRdfParser(parser);
      setGraphData(parsedGraph);
      
      // Switch to the graph module to show the loaded model visually
      setActiveModule('graph');
      
    } catch (error) {
      console.error('Error loading and parsing model:', error);
      // Fallback to just setting the model
      setCurrentRdfModel(modelContent);
      setActiveModule('rdf-editor');
    }
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
      case 'graph-view':
        return <GraphViewer/> 
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
            <div className="data-source-indicator">
              <h4>📊 Current Data Source</h4>
              <div className={`source-badge ${dataSource}`}>
                {dataSource === 'triples' ? (
                  <>
                    <span className="source-icon">🧱</span>
                    <span className="source-text">RDF Triples Database</span>
                    <span className="source-desc">Live semantic data from materialized view</span>
                  </>
                ) : (
                  <>
                    <span className="source-icon">📄</span>
                    <span className="source-text">Static RDF Model</span>
                    <span className="source-desc">Predefined model with mock telemetry</span>
                  </>
                )}
              </div>
            </div>
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
              <ConnectionTestPanel />
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
                {activeModule === 'graph-view' && 'Graph viewer'}
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
              <div className="stat-item">
                <span className="stat-label">Data Source</span>
                <span className="stat-value" title={dataSource === 'triples' ? 'RDF Triples Database' : 'Static RDF Model'}>
                  {dataSource === 'triples' ? '🧱 DB' : '📄 Static'}
                </span>
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