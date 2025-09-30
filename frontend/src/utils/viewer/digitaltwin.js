async function fetchDigitalTwinRDFBody(name) {
  const url = `${process.env.REACT_APP_DATABRICKS_HOST}/api/digital-twins/${encodeURIComponent(name)}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json'
    }
  });
  if (!response.ok) {
    throw new Error(`Error fetching digital twin "${name}": ${response.statusText}`);
  }
  const data = await response.json();
  return data.body;
}

function getDigitalTwinLayoutAndStyle(results){


  const style = [
  {
    selector: 'edge',
    style: {
      'width': 3,
      'line-color': '#193cb8',
      'target-arrow-color': '#193cb8',
      'target-arrow-shape': 'triangle',
      'curve-style': 'straight',
      'text-rotation': 'autorotate',
      'arrow-scale': 1.5,
        'label': 'data(label)', // Tells Cytoscape.js to use the label from data
    'font-size': 12,
    'text-margin-y': -16,
    'text-margin-x': 0,
    'color': '#000' // Label text color
      
    }
  }
];

const nodeShades = [
  "#2B547E",   // Blue Jay
  "#6495ED",   // Cornflower Blue
  "#4169E1",   // Royal Blue
  "#0096FF",   // Bright Blue
  "#1E90FF",   // Dodger Blue
  "#87CEEB",   // Sky Blue
  "#B3CDE0",   // Light Blue
  "#00AEEF"    // Tiffany Blue
]; 

for(let nodeType of results.types){
  let padding = results.maxdepth - results.hierarchies[nodeType].length == 0 ? 16 : (results.maxdepth - results.hierarchies[nodeType].length ) * 32 + 8;

  style.push({
    selector: `node[type="${nodeType}"]`,
    style: {
      'background-color': nodeShades[nodeShades.length - 1 - results.hierarchies[nodeType].length % nodeShades.length],
      'shape': 'round-rectangle',
      'label': 'data(label)',

      'color': 'black',
      'font-size': 14,
      'text-valign': results.maxdepth - results.hierarchies[nodeType].length == 0 ? 'center': 'top',
      'text-margin-y': results.maxdepth - results.hierarchies[nodeType].length == 0 ? 0 : 32,
      'border-width': results.maxdepth - results.hierarchies[nodeType].length + 1,
      'border-color': '#193cb8',
      'padding': padding, 
    }})
}

style.push(  {
    selector: 'node[state = "broken"]',
    style: {
      'background-color': '#ff6467'
    }
  },
  {
    selector: 'node[state = "impacted"]',
    style: {
      'background-color': '#ff8904'
    }
  },
)


const layout = {
  name: 'breadthfirst',
  directed: true,
   direction: 'leftward', 
  padding: 100,
  spacingFactor: 3,
  avoidOverlap: true,
 
  circle: false,
 
};

return [layout, style]

}


export {fetchDigitalTwinRDFBody,getDigitalTwinLayoutAndStyle}