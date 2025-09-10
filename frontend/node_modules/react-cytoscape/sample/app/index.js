import React from 'react';
import { render } from 'react-dom';
import Graph from './Graph.js';

import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap/dist/css/bootstrap-theme.css'

class App extends React.Component {
	render() {
		return (
			<div>
				<p> Hello React cyotscape!</p>
				<Graph />
			</div>
		);
	}
}

render(<App />, document.getElementById('app'));