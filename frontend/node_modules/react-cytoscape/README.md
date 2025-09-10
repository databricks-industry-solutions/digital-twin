# React component for Cytoscape

A React component to use simply the cytoscape js library.


[http://js.cytoscape.org](http://js.cytoscape.org)

## Installation

`npm install react-cytoscape`

## Usage

```react
import ReactCytoscape from 'react-cytoscape';

<ReactCytoscape containerID="cy" 
	elements={this.getElements()} 
	cyRef={(cy) => { this.cy = cy; console.log(this.cy) }} 
	cytoscapeOptions={{wheelSensitivity: 0.1}}
	layout={{name: 'dagre'}} />

```

## ReactCytoscape props

Props are same as Cytoscape [builder function](http://js.cytoscape.org/#notation/elements-json).

* `containerID` : HTML ID to `div` cytoscape container
* `elements` : Object with `nodes` and `egdes`  attributes
* `style` : Array of Style object
* `layout` : Object with `name` of layout attribute.    
`ReactCytoscape` integrates [**cola** layout](https://github.com/cytoscape/cytoscape.js-cola) and [**dagre** layout](https://github.com/cytoscape/cytoscape.js-dagre).

* `styleContainer` : an object of `css` style
* `cyRef` : a callback function to obtain a reference to `cytoscape object`
* `cytoscapeOptions` : Object with others cytoscape options builder
