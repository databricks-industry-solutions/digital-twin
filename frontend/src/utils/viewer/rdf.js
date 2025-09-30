import { Parser,Store } from 'n3'

/*
PREFIX c: <c#>
c:Amsterdam a c:Town.
c:Mansion a c:House;
  c:partOf c:Amsterdam. 
c:Tom a c:Cat;
  c:partOf c:Mansion. 
c:Jerry a c:Mouse;
  c:dependsOn c:Tom; 
  c:partOf c:Mansion. 

const twinModel = `
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix dt: <http://databricks.com/digitaltwin/> .
@prefix ex: <http://example.com/factory/> .

dt:affectedBy rdfs:subPropertyOf dt:dependsOn .  

dt:operational a dt:state .
dt:broken a dt:state .
dt:impacted a dt:state . 

ex:inLine rdfs:subPropertyOf dt:partOf ;
rdfs:domain dt:Machine ;
	rdfs:range dt:Line .
	
ex:componentIn rdfs:subPropertyOf dt:partOf ; 
rdfs:domain dt:Component ;
	rdfs:range dt:Machine .

ex:line1 a ex:Line .

ex:machine1 a ex:Machine ;
	ex:inLine ex:line1 .
  

ex:machine2 a ex:Machine ;
	ex:inLine ex:line1 ;
	dt:dependsOn ex:machine1 ;
  dt:hasState dt:broken . 

ex:machine3 a ex:Machine ;
	ex:inLine ex:line1 ;
	dt:dependsOn ex:machine2 ;
  dt:hasState dt:impacted . 

ex:component11 a ex:Component ;
	ex:componentIn ex:machine1 .

ex:component12 a ex:Component ;
	ex:componentIn ex:machine1 .

ex:component21 a ex:Component ;
	ex:componentIn ex:machine2 .

ex:component22 a ex:Component ;
	ex:componentIn ex:machine2 .

ex:component31 a ex:Component ;
	ex:componentIn ex:machine3 .

ex:component32 a ex:Component ;
	ex:componentIn ex:machine3 .

`

*/

/*
async function executeQuery(query,rdf){
  const store = new Store();
  const parser = new Parser()
  let quads =  parser.parse(rdf)
  store.addQuads(quads)
  const engine = new QueryEngine();

  const bindingsStream = await engine.queryBindings(query, {
  sources: [store],
  });
  const bindings = await bindingsStream.toArray();
  console.log(bindings)
}
  */

async function executeQuery(query,engine,store) {

  // Use queryQuads for CONSTRUCT/DESCRIBE queries
  const quadStream = await engine.queryQuads(query, {
    sources: [store],
  });

  // Collect results as an array
  const quadsResult = await quadStream.toArray();

  return quadsResult

}

async function retrieveAffectedQuads(engine,store){
return await executeQuery(`
  
PREFIX dt: <http://databricks.com/digitaltwin/>
PREFIX ex: <http://example.com/factory/>
CONSTRUCT {
  ?affected ?propagates ?dep .
}
WHERE {
  # List all subproperties
  VALUES ?propagates { dt:propagates ex:upstream }
  # Recursive path
  ?affected (dt:propagates|ex:upstream)+ ?source .
  ?source dt:hasState ?state .
  FILTER (?state = dt:broken || ?state = dt:impacted)
  ?affected ?propagates ?dep .
}
  



`,engine,store)

}



function stripRDFPrefix(label) {
  // Handles full URIs or labels with a colon
  if (typeof label === 'string') {
    // Remove trailing slashes, then split by '/' and '#', take last part
    let cleanLabel = label.replace(/\/+$/, '');
    let parts = cleanLabel.split(/[#\/]/);
    return parts[parts.length - 1];
  }
  return label;
}


async function parseDigitalTwinState(rdf){
   const parser = new Parser()
  let results = await parser.parse(rdf)
  
  /*
  Construct a dict with components having type predicate 
  register properties in the dict per component 

  */

  let components = {}
  
  for(let quad of results){
    if(quad.predicate.id.endsWith('type')){
      components[quad.subject.id] = {}
    }else{
      let value = JSON.parse(quad.object.id) 
      value = !isNaN(value) ? Math.round(parseFloat(value)*100,2)/100 : value 
      components[quad.subject.id][stripRDFPrefix(quad.predicate.id)] = value 
    }
  }

  return components 


}

function hasPredicate(given_predicate,target_predicate,mapping){
  if(given_predicate == target_predicate){
    return true; 
  }
  if(given_predicate in mapping){
    return mapping[given_predicate][target_predicate]
  }
  return false 
}

//Look at 
async function parseDigitalTwinStructure(rdf) {
  const parser = new Parser()
  let elements = []
  let index = 0; 
  let nodes = {}
  let known_parents = {}
  let all_types = {}
  let all_states = {}
  let all_comments = {}

  let labels = {}
  let predicate_mapping = {}

  let results = await parser.parse(rdf)

  const filtered_results = []; 
  for(let quad of results){

    if(quad.predicate.id.endsWith('subPropertyOf')){
      if(!(quad.subject.id in predicate_mapping)){
        predicate_mapping[quad.subject.id] = {}
      }

      predicate_mapping[quad.subject.id][quad.object.id]  = true 
    }
    else if (quad.predicate.id.endsWith('hasState')){
      all_states[quad.subject.id] = stripRDFPrefix(quad.object.id)
     }
     else if (quad.predicate.id.endsWith('comment')){
      all_comments[quad.subject.id] = quad.object.id 
     }else if(quad.predicate.id.endsWith('label')){
      labels[quad.subject.id] = quad.object.id 
     }else if (quad.predicate.id.endsWith('type') && (quad.object.id.endsWith('Property') || quad.object.id.endsWith('Class'))){
      continue 
     }
    else{
      filtered_results.push(quad)
    }
  
  }
  console.log(predicate_mapping)
  console.log(filtered_results)

  for(let quad of filtered_results){

     if(hasPredicate(quad.predicate.id,'http://databricks.com/digitaltwin/dependsOn',predicate_mapping)){
            elements.push({ data: { id: index,label: stripRDFPrefix(quad.predicate.id), source: quad.object.id , target: quad.subject.id } })
     }else if(hasPredicate(quad.predicate.id,'http://databricks.com/digitaltwin/partOf',predicate_mapping)){
        //Update the parent of the subject 
        if(quad.subject.id in nodes){
            elements[nodes[quad.subject.id]].data.parent = quad.object.id; 
        }else{
            known_parents[quad.subject.id] = quad.object.id; 
        }
        
     }else if(quad.predicate.id.endsWith('range') || quad.predicate.id.endsWith('domain')){
          continue; 
     }else if (quad.object.id.endsWith('state')){
      continue; 
     }
     else {
  
        elements.push({ 
          data: { id: quad.subject.id, 
            label: labels[quad.subject.id] ?? stripRDFPrefix(quad.subject.id), 
            type: quad.object.id, 
            state: all_states[quad.subject.id] ?? 'operational', 
            comment: all_comments[quad.subject.id] ?? "", 
          
          }})
        all_types[quad.object.id]= true;
        if(quad.subject.id in known_parents){
            elements[elements.length-1].data.parent = known_parents[quad.subject.id]
        }
        nodes[quad.subject.id] = elements.length-1; 
      }
      
      
      index += 1 
  }

  


  const parentMap = {};
elements.forEach(elem => {
  if (elem.data.parent) {
    parentMap[elem.data.id] = elem.data.parent;
  }
});

function findHierarchy(nodeId) {
  const path = [];
  let current = nodeId;
  while (parentMap[current]) {
    current = parentMap[current];
    path.push(current);
  }
  return path.reverse();
}

// Map each type to hierarchy path
const typeHierarchies = {};
Object.keys(all_types).forEach(type => {
  // Find the representative node
  const repElem = elements.find(elem => elem.data.type === type);
  if (repElem) {
    typeHierarchies[type] = findHierarchy(repElem.data.id);
  }
});

let maxDepth = 0
for(let type of Object.keys(typeHierarchies)){
  if(typeHierarchies[type].length > maxDepth){
    maxDepth = typeHierarchies[type].length
  }
}

  /*
  In the results array for each node type determine where it is in the hierarchy 
  by traversing the parent relationship 
  */  



    return {maxdepth: maxDepth, hierarchies: typeHierarchies,types: Object.keys(all_types),elements: elements,quads: results}
}

export { parseDigitalTwinStructure, parseDigitalTwinState,retrieveAffectedQuads}