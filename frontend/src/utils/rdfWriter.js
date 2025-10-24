import { Writer, DataFactory } from 'n3';

const { namedNode, literal, quad } = DataFactory;

export class RDFWriter {
  constructor() {
    this.writer = new Writer({
      prefixes: {
        rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
        dt: 'http://databricks.com/digitaltwin/',
        ex: 'http://example.com/factory/',
        dbx: 'http://databricks.com/factory/'
      }
    });
  }

  graphToRDF(nodes, edges) {
    // Create a new writer instance for each conversion
    const writer = new Writer({
      prefixes: {
        rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
        dt: 'http://databricks.com/digitaltwin/',
        ex: 'http://example.com/factory/',
        dbx: 'http://databricks.com/factory/'
      }
    });

    return new Promise((resolve, reject) => {
      try {
        // Add prefix declarations first
        let rdfContent = `@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix dt: <http://databricks.com/digitaltwin/> .
@prefix ex: <http://example.com/factory/> .
@prefix dbx: <http://databricks.com/factory/> .

# Domain relationships
dt:inLine rdfs:domain dt:Machine ;
\trdfs:range dt:Line .

dt:partOf rdfs:domain dt:Component ;
\trdfs:range dt:Machine .

`;

        // Group nodes by type for better organization
        const nodesByType = {
          line: [],
          machine: [],
          component: [],
          sensor: []
        };

        nodes.forEach(node => {
          const nodeType = node.type || 'unknown';
          if (nodesByType[nodeType]) {
            nodesByType[nodeType].push(node);
          }
        });

        // Add lines first
        if (nodesByType.line.length > 0) {
          rdfContent += '# Production Lines\n';
          nodesByType.line.forEach(node => {
            const uri = this.extractLocalName(node.id);
            const label = node.label || node.id.split('/').pop();
            rdfContent += `ex:${uri} a dt:Line ;\n\trdfs:label "${label}" .\n\n`;
          });
        }

        // Add machines
        if (nodesByType.machine.length > 0) {
          rdfContent += '# Machines\n';
          nodesByType.machine.forEach(node => {
            const uri = this.extractLocalName(node.id);
            const label = node.label || node.id.split('/').pop();
            rdfContent += `ex:${uri} a dt:Machine ;\n\trdfs:label "${label}"`;
            
            // Find inLine relationships
            const inLineEdges = edges.filter(edge => 
              edge.source === node.id && (edge.type === 'inLine' || edge.label === 'inLine')
            );
            
            inLineEdges.forEach(edge => {
              const targetUri = this.extractLocalName(edge.target);
              rdfContent += ` ;\n\tdt:inLine ex:${targetUri}`;
            });
            
            rdfContent += ' .\n\n';
          });
        }

        // Add components
        if (nodesByType.component.length > 0) {
          rdfContent += '# Components\n';
          nodesByType.component.forEach(node => {
            const uri = this.extractLocalName(node.id);
            const label = node.label || node.id.split('/').pop();
            rdfContent += `ex:${uri} a dt:Component ;\n\trdfs:label "${label}"`;
            
            // Find partOf relationships
            const partOfEdges = edges.filter(edge => 
              edge.source === node.id && (edge.type === 'partOf' || edge.label === 'partOf')
            );
            
            partOfEdges.forEach(edge => {
              const targetUri = this.extractLocalName(edge.target);
              rdfContent += ` ;\n\tdt:partOf ex:${targetUri}`;
            });
            
            rdfContent += ' .\n\n';
          });
        }

        // Add dependency relationships
        const dependencyEdges = edges.filter(edge => 
          edge.type === 'dependsOn' || edge.label === 'dependsOn'
        );
        
        if (dependencyEdges.length > 0) {
          rdfContent += '# Dependencies\n';
          dependencyEdges.forEach(edge => {
            const sourceUri = this.extractLocalName(edge.source);
            const targetUri = this.extractLocalName(edge.target);
            rdfContent += `ex:${sourceUri} dbx:dependsOn ex:${targetUri} .\n`;
          });
        }

        resolve(rdfContent);
      } catch (error) {
        reject(error);
      }
    });
  }

  extractLocalName(uri) {
    // Extract local name from URI, handling both full URIs and simple names
    if (uri.includes('/')) {
      return uri.split('/').pop();
    }
    return uri.replace('ex:', '').replace('dt:', '').replace('dbx:', '');
  }

  getTypeURI(nodeType) {
    const typeMap = {
      'line': 'http://databricks.com/digitaltwin/Line',
      'machine': 'http://databricks.com/digitaltwin/Machine',
      'component': 'http://databricks.com/digitaltwin/Component',
      'sensor': 'http://databricks.com/digitaltwin/Sensor'
    };
    
    return typeMap[nodeType];
  }

  getPredicateURI(edgeType) {
    const predicateMap = {
      'inLine': 'http://databricks.com/digitaltwin/inLine',
      'partOf': 'http://databricks.com/digitaltwin/partOf',
      'dependsOn': 'http://example.com/factory/dependsOn',
      'relationship': 'http://databricks.com/digitaltwin/relatedTo'
    };
    
    return predicateMap[edgeType] || predicateMap['relationship'];
  }

  addNode(nodeData) {
    const nodeURI = namedNode(nodeData.uri);
    const typeURI = namedNode(this.getTypeURI(nodeData.type));
    
    this.writer.addQuad(quad(
      nodeURI,
      namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      typeURI
    ));
    
    if (nodeData.label) {
      this.writer.addQuad(quad(
        nodeURI,
        namedNode('http://www.w3.org/2000/01/rdf-schema#label'),
        literal(nodeData.label)
      ));
    }
  }

  addRelationship(sourceURI, predicateType, targetURI) {
    const subject = namedNode(sourceURI);
    const predicate = namedNode(this.getPredicateURI(predicateType));
    const object = namedNode(targetURI);
    
    this.writer.addQuad(quad(subject, predicate, object));
  }

  removeRelationship(sourceURI, predicateType, targetURI) {
    console.log(`Removing relationship: ${sourceURI} --${predicateType}--> ${targetURI}`);
  }

  serializeChanges() {
    return new Promise((resolve, reject) => {
      this.writer.end((error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
  }

  createNewEntity(entityType, entityID, properties = {}) {
    const baseURI = 'http://example.com/factory/';
    const entityURI = namedNode(baseURI + entityID);
    const typeURI = namedNode(this.getTypeURI(entityType));
    
    this.writer.addQuad(quad(
      entityURI,
      namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      typeURI
    ));
    
    Object.entries(properties).forEach(([key, value]) => {
      const propertyURI = namedNode(`http://databricks.com/digitaltwin/${key}`);
      if (typeof value === 'string' && value.startsWith('http')) {
        this.writer.addQuad(quad(entityURI, propertyURI, namedNode(value)));
      } else {
        this.writer.addQuad(quad(entityURI, propertyURI, literal(value)));
      }
    });
    
    return entityURI.value;
  }

  updateEntityProperty(entityURI, property, newValue) {
    const subject = namedNode(entityURI);
    const predicate = namedNode(`http://databricks.com/digitaltwin/${property}`);
    
    if (typeof newValue === 'string' && newValue.startsWith('http')) {
      this.writer.addQuad(quad(subject, predicate, namedNode(newValue)));
    } else {
      this.writer.addQuad(quad(subject, predicate, literal(newValue)));
    }
  }
}