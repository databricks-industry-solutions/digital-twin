import TelemetryService from './telemetryService';

/**
 * Service for loading RDF models from the triples table and creating
 * semantic telemetry mappings based on actual database structure
 */
class RDFTripleService {
  constructor() {
    this.telemetryService = new TelemetryService();
    this.backendBaseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8080';
  }

  /**
   * Load RDF triples from backend and build semantic model
   */
  async loadRDFModel() {
    try {
      console.log('🧱 Loading RDF model from triples database...');

      const response = await fetch(`${this.backendBaseUrl}/api/telemetry/triples/debug`);
      if (!response.ok) {
        throw new Error(`Failed to load RDF triples: ${response.status}`);
      }

      const data = await response.json();

      if (data.status !== 'success') {
        throw new Error(`RDF triples query failed: ${data.error || 'Unknown error'}`);
      }

      console.log(`✅ Loaded RDF model: ${data.total_rows} triples, ${data.components.length} components`);

      return this.buildSemanticModel(data);

    } catch (error) {
      console.error('❌ Failed to load RDF model from triples:', error);
      throw error;
    }
  }

  /**
   * Build semantic model from triples data
   */
  buildSemanticModel(triplesData) {
    const { sample_triples, components, predicates } = triplesData;

    // Extract component information
    const componentNodes = components.map(componentUri => {
      const componentId = this.extractComponentId(componentUri);
      return {
        id: componentUri,
        label: `Component ${componentId}`,
        type: 'component',
        data: {
          uri: componentUri,
          componentId: componentId
        }
      };
    });

    // Extract relationships from sample triples
    const relationships = sample_triples
      .filter(triple => triple.predicate !== 'rdf:type')
      .filter(triple => triple.predicate.includes('partOf') ||
                       triple.predicate.includes('dependsOn') ||
                       triple.predicate.includes('inLine'))
      .map(triple => ({
        id: `${triple.subject}-${triple.predicate}-${triple.object}`,
        source: triple.subject,
        target: triple.object,
        label: this.extractLabel(triple.predicate),
        type: this.getEdgeType(triple.predicate),
        data: { predicate: triple.predicate }
      }));

    // Filter out disconnected nodes (nodes with no edges)
    // Only filter if we have relationships, otherwise keep all nodes
    let filteredNodes = componentNodes;

    if (relationships.length > 0) {
      const connectedNodeIds = new Set();
      relationships.forEach(edge => {
        connectedNodeIds.add(edge.source);
        connectedNodeIds.add(edge.target);
      });

      filteredNodes = componentNodes.filter(node =>
        connectedNodeIds.has(node.id)
      );

      const removedCount = componentNodes.length - filteredNodes.length;
      if (removedCount > 0) {
        console.log(`Filtered ${removedCount} disconnected nodes (kept ${filteredNodes.length} connected nodes)`);
      }
    } else {
      console.warn('⚠️ No relationships found in triples database. Keeping all component nodes. Consider using static RDF model instead.');
    }

    // Create semantic mapping
    const sensorMapping = this.createSensorMapping(predicates);

    return {
      nodes: filteredNodes,
      edges: relationships,
      sensorMapping: sensorMapping,
      metadata: {
        totalTriples: triplesData.total_rows,
        componentCount: filteredNodes.length,
        predicateTypes: predicates.length,
        source: 'rdf_triples_database'
      }
    };
  }

  /**
   * Create mapping between RDF sensor predicates and frontend sensor types
   */
  createSensorMapping(predicates) {
    const sensorMapping = predicates
      .filter(p => p.predicate.includes('sensor'))
      .reduce((mapping, p) => {
        const predicate = p.predicate;

        if (predicate.includes('sensor_temperature')) {
          mapping.sensorAReading = {
            predicate,
            label: 'Temperature',
            unit: '°C',
            count: p.count
          };
        } else if (predicate.includes('sensor_pressure')) {
          mapping.sensorBReading = {
            predicate,
            label: 'Pressure',
            unit: 'bar',
            count: p.count
          };
        } else if (predicate.includes('sensor_vibration')) {
          mapping.sensorCReading = {
            predicate,
            label: 'Vibration',
            unit: 'mm/s',
            count: p.count
          };
        } else if (predicate.includes('sensor_speed')) {
          mapping.sensorDReading = {
            predicate,
            label: 'Speed',
            unit: 'RPM',
            count: p.count
          };
        } else if (predicate.includes('sensor_rotation')) {
          mapping.sensorEReading = {
            predicate,
            label: 'Rotation',
            unit: 'rad/s',
            count: p.count
          };
        } else if (predicate.includes('sensor_flow')) {
          mapping.sensorFReading = {
            predicate,
            label: 'Flow',
            unit: 'L/min',
            count: p.count
          };
        }

        return mapping;
      }, {});

    return sensorMapping;
  }

  /**
   * Get telemetry data mapped to RDF components
   */
  async getTelemetryWithSemanticMapping() {
    try {
      const telemetryResult = await this.telemetryService.fetchLatestTelemetry();

      if (!telemetryResult.success) {
        throw new Error(`Telemetry fetch failed: ${telemetryResult.error}`);
      }

      console.log(`📊 Retrieved telemetry data: ${telemetryResult.count} components`);
      console.log(`🔗 Data source: ${telemetryResult.method}`);

      // Add semantic metadata to each telemetry record
      const enhancedTelemetry = telemetryResult.data.map(record => ({
        ...record,
        semantic: {
          componentUri: `http://example.com/factory/component-${record.componentID}`,
          lastUpdated: new Date().toISOString(),
          dataSource: telemetryResult.method
        }
      }));

      return {
        success: true,
        data: enhancedTelemetry,
        metadata: {
          count: enhancedTelemetry.length,
          source: telemetryResult.method,
          table: telemetryResult.table,
          semanticEnhanced: true
        }
      };

    } catch (error) {
      console.error('❌ Failed to get semantic telemetry mapping:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Extract component ID from URI
   */
  extractComponentId(uri) {
    const parts = uri.split(/[/#]/);
    const lastPart = parts[parts.length - 1] || uri;

    // Handle component-xxx pattern
    if (lastPart.includes('component-')) {
      return lastPart.replace('component-', '');
    }

    // Extract trailing numbers
    const match = lastPart.match(/\d+$/);
    return match ? match[0] : lastPart;
  }

  /**
   * Extract human-readable label from URI
   */
  extractLabel(uri) {
    const parts = uri.split(/[/#]/);
    const lastPart = parts[parts.length - 1] || uri;

    // Convert camelCase/snake_case to Title Case
    return lastPart
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/\b\w/g, l => l.toUpperCase())
      .trim();
  }

  /**
   * Map RDF predicate to edge type
   */
  getEdgeType(predicate) {
    if (predicate.includes('partOf') || predicate.includes('componentOf')) return 'partOf';
    if (predicate.includes('dependsOn') || predicate.includes('upstream')) return 'dependsOn';
    if (predicate.includes('inLine')) return 'partOf';
    return 'relationship';
  }

  /**
   * Test the service connectivity
   */
  async testConnection() {
    try {
      const model = await this.loadRDFModel();
      const telemetry = await this.getTelemetryWithSemanticMapping();

      return {
        success: true,
        model: {
          nodeCount: model.nodes.length,
          edgeCount: model.edges.length,
          source: model.metadata.source
        },
        telemetry: {
          componentCount: telemetry.metadata?.count || 0,
          source: telemetry.metadata?.source || 'failed'
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default RDFTripleService;