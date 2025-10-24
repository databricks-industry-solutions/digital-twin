import { Parser, Store, DataFactory } from 'n3';

const { namedNode } = DataFactory;

export class RDFParser {
  constructor() {
    this.store = new Store();
    this.parser = new Parser();
  }

  parseRDF(rdfString) {
    return new Promise((resolve, reject) => {
      this.parser.parse(rdfString, (error, quad, prefixes) => {
        if (error) {
          reject(error);
        } else if (quad) {
          this.store.addQuad(quad);
        } else {
          const graphData = this.extractGraphData();
          resolve(graphData);
        }
      });
    });
  }

  extractGraphData() {
    const nodes = new Map();
    const edges = [];
    
    const quads = this.store.getQuads();
    console.log('RDFParser: Extracted quads:', quads.length);
    
    quads.forEach(quad => {
      const subject = quad.subject.value;
      const predicate = quad.predicate.value;
      const object = quad.object.value;
      
      // Skip schema/ontology definitions - only include actual instances
      if (this.isSchemaNode(subject)) return;
      if (quad.object.termType === 'NamedNode' && this.isSchemaNode(object)) return;
      
      // Add subject node if it's an instance
      if (!nodes.has(subject) && this.isInstanceNode(subject)) {
        const label = this.getNodeLabel(subject) || this.extractLabel(subject);
        nodes.set(subject, {
          id: subject,
          label: label,
          type: this.getNodeType(subject),
          data: { uri: subject }
        });
      }
      
      // Add object node if it's a NamedNode instance
      if (quad.object.termType === 'NamedNode' && !nodes.has(object) && this.isInstanceNode(object)) {
        const label = this.getNodeLabel(object) || this.extractLabel(object);
        nodes.set(object, {
          id: object,
          label: label,
          type: this.getNodeType(object),
          data: { uri: object }
        });
      }
      
      // Add relationship edges between instances
      if (this.isRelationshipPredicate(predicate) && this.isInstanceNode(subject) && 
          quad.object.termType === 'NamedNode' && this.isInstanceNode(object)) {
        edges.push({
          id: `${subject}-${predicate}-${object}`,
          source: subject,
          target: object,
          label: this.extractLabel(predicate),
          type: this.getEdgeType(predicate),
          data: { predicate }
        });
      }
    });
    
    const result = {
      nodes: Array.from(nodes.values()),
      edges: edges
    };
    
    console.log('RDFParser: Final graph data:', result);
    return result;
  }

  extractLabel(uri) {
    const parts = uri.split(/[/#]/);
    return parts[parts.length - 1] || uri;
  }

  extractComponentId(uri) {
    // Extract component ID for telemetry mapping
    const parts = uri.split(/[/#]/);
    const lastPart = parts[parts.length - 1] || uri;

    // Handle various component naming patterns:
    // ex:component-111 -> "111"
    // ex:comp111 -> "111"
    // ex:111 -> "111"
    if (lastPart.includes('component-')) {
      return lastPart.replace('component-', '');
    } else if (lastPart.includes('comp')) {
      return lastPart.replace('comp', '');
    } else if (lastPart.match(/^\d+$/)) {
      return lastPart;
    }

    // Extract any trailing numbers if no clear pattern
    const match = lastPart.match(/\d+$/);
    return match ? match[0] : lastPart;
  }

  isSchemaNode(uri) {
    // Skip schema/ontology URIs - these are not actual instances
    return uri.includes('digitaltwin/') && (
      uri.endsWith('/Machine') || 
      uri.endsWith('/Line') || 
      uri.endsWith('/Component') || 
      uri.endsWith('/Sensor') ||
      uri.endsWith('/inLine') ||
      uri.endsWith('/partOf') ||
      uri.endsWith('/dependsOn')
    );
  }

  isInstanceNode(uri) {
    // Instance nodes are typically in the example namespace or specific factory namespaces
    return uri.includes('example.com/factory/') || 
           uri.includes('databricks.com/factory/') || 
           uri.includes('example.com/platform/') || 
           uri.includes('example.com/automotive/');
  }

  getNodeLabel(uri) {
    // Try to get rdfs:label first
    const labelQuads = this.store.getQuads(namedNode(uri), namedNode('http://www.w3.org/2000/01/rdf-schema#label'), null);
    if (labelQuads.length > 0) {
      return labelQuads[0].object.value;
    }
    return null;
  }

  getNodeType(uri) {
    const typeQuads = this.store.getQuads(namedNode(uri), namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'), null);
    
    if (typeQuads.length === 0) return 'unknown';
    
    const type = typeQuads[0].object.value;
    
    // Manufacturing types
    if (type.includes('Line')) return 'line';
    if (type.includes('Machine')) return 'machine';
    if (type.includes('Component')) return 'component';
    if (type.includes('Sensor')) return 'sensor';
    
    // Oil & Gas types - map to closest manufacturing equivalent for styling
    if (type.includes('Platform')) return 'line';  // Platform = main structure like Line
    if (type.includes('Well')) return 'machine';   // Well = major equipment like Machine
    if (type.includes('Wellhead') || type.includes('Derrick') || type.includes('Drawworks') || 
        type.includes('BlowoutPreventer') || type.includes('Separator') || type.includes('Compressor')) return 'component';
    if (type.includes('Sensor')) return 'sensor';
    if (type.includes('Reservoir') || type.includes('Formation')) return 'line'; // Geological structures = lines
    
    return 'component'; // Default fallback for unknown oil & gas equipment
  }

  getEdgeType(predicate) {
    if (predicate.includes('inLine')) return 'partOf';  // inLine is a type of partOf
    if (predicate.includes('componentOf')) return 'partOf';  // componentOf is a type of partOf
    if (predicate.includes('partOf')) return 'partOf';
    if (predicate.includes('upstream')) return 'dependsOn';  // upstream creates dependencies
    if (predicate.includes('dependsOn')) return 'dependsOn';
    if (predicate.includes('propagates')) return 'propagates';
    // Oil & Gas specific relationships - map to standard types
    if (predicate.includes('partOfPlatform')) return 'partOf';
    if (predicate.includes('accessedFrom')) return 'dependsOn';
    if (predicate.includes('protectedBy')) return 'dependsOn';
    if (predicate.includes('monitoredBy')) return 'dependsOn';
    if (predicate.includes('flowsTo')) return 'dependsOn';
    return 'relationship';
  }

  isRelationshipPredicate(predicate) {
    const relationshipPredicates = [
      'http://databricks.com/digitaltwin/partOf',
      'http://databricks.com/digitaltwin/dependsOn',
      'http://databricks.com/digitaltwin/propagates',
      'http://example.com/factory/inLine',
      'http://example.com/factory/componentOf',
      'http://example.com/factory/upstream',
      'http://example.com/factory/dependsOn',
      // Oil & Gas specific relationships
      'http://example.com/oilgas/partOfPlatform',
      'http://example.com/oilgas/accessedFrom',
      'http://example.com/oilgas/protectedBy',
      'http://example.com/oilgas/monitoredBy',
      'http://example.com/oilgas/flowsTo'
    ];

    // More flexible matching - check if predicate contains any of the key relationship terms
    const relationshipTerms = ['partOf', 'componentOf', 'inLine', 'dependsOn', 'upstream', 'propagates'];

    return relationshipPredicates.includes(predicate) ||
           relationshipTerms.some(term => predicate.includes(term));
  }

  getComponentTelemetryMapping() {
    // Get all components from the RDF model
    const componentTypeQuads = this.store.getQuads(null, namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'), null);
    const components = componentTypeQuads.filter(quad =>
      quad.object.value.includes('Component')
    );

    const mapping = components.map(quad => {
      const uri = quad.subject.value;
      return {
        componentURI: uri,
        componentID: this.extractComponentId(uri),
        label: this.getNodeLabel(uri) || this.extractLabel(uri)
      };
    });

    console.log('RDFParser: Component-to-telemetry mapping:', mapping);
    return mapping;
  }

  queryComponents() {
    return this.store.getQuads(null, namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'), namedNode('http://databricks.com/digitaltwin/Component'));
  }

  queryMachines() {
    return this.store.getQuads(null, namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'), namedNode('http://databricks.com/digitaltwin/Machine'));
  }

  queryLines() {
    return this.store.getQuads(null, namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'), namedNode('http://databricks.com/digitaltwin/Line'));
  }

  getDependencies(entityURI) {
    const dependencies = this.store.getQuads(namedNode(entityURI), null, null)
      .filter(quad => quad.predicate.value.includes('dependsOn'))
      .map(quad => quad.object.value);
    
    return dependencies;
  }

  getHealthStatus(entityURI, telemetryData) {
    const dependencies = this.getDependencies(entityURI);
    
    let status = 'healthy';
    
    dependencies.forEach(depURI => {
      const depStatus = this.getHealthStatus(depURI, telemetryData);
      if (depStatus === 'fault') {
        status = 'fault';
      }
    });
    
    const componentID = this.extractLabel(entityURI);
    const latestTelemetry = telemetryData.find(data => data.componentID === componentID);
    
    if (latestTelemetry) {
      const { sensorAReading, sensorBReading, sensorCReading, sensorDReading } = latestTelemetry;
      
      if (sensorAReading > 100 || sensorBReading > 100 || sensorCReading > 100 || sensorDReading > 100) {
        status = 'fault';
      }
    }
    
    return status;
  }
}