import React, { useState, useRef, useEffect } from 'react';
import { Parser } from 'sparqljs';
import './SPARQLQueryInterface.css';

const SPARQLQueryInterface = ({ rdfParser, onQueryResult, onHighlightNodes }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState(null);
  const [queryHistory, setQueryHistory] = useState([]);
  const [selectedQuery, setSelectedQuery] = useState('');
  const textareaRef = useRef(null);

  const sparqlParser = new Parser();

  const predefinedQueries = [
    {
      name: 'Find all machines',
      query: `SELECT ?machine ?label WHERE {
  ?machine a dt:Machine .
  OPTIONAL { ?machine rdfs:label ?label }
}`
    },
    {
      name: 'Find components in machine1',
      query: `SELECT ?component WHERE {
  ?component a dt:Component .
  ?component dt:partOf ex:machine1 .
}`
    },
    {
      name: 'Find dependencies',
      query: `SELECT ?entity ?dependency WHERE {
  ?entity dbx:dependsOn ?dependency .
}`
    },
    {
      name: 'Find all relationships',
      query: `SELECT ?subject ?predicate ?object WHERE {
  ?subject ?predicate ?object .
  FILTER(?predicate IN (dt:inLine, dt:partOf, dbx:dependsOn))
}`
    },
    {
      name: 'Find machines in line1',
      query: `SELECT ?machine WHERE {
  ?machine a dt:Machine .
  ?machine dt:inLine ex:line1 .
}`
    }
  ];

  useEffect(() => {
    const savedHistory = localStorage.getItem('sparql-query-history');
    if (savedHistory) {
      setQueryHistory(JSON.parse(savedHistory));
    }
  }, []);

  const executeQuery = async () => {
    if (!query.trim() || !rdfParser) return;

    setIsExecuting(true);
    setError(null);

    try {
      const parsedQuery = sparqlParser.parse(query);
      const results = await executeSPARQLQuery(parsedQuery, rdfParser);
      
      setResults(results);
      addToHistory(query);
      
      if (onQueryResult) {
        onQueryResult(results);
      }

      highlightResultNodes(results);
      
    } catch (err) {
      setError(err.message);
      console.error('SPARQL Query Error:', err);
    } finally {
      setIsExecuting(false);
    }
  };

  const executeSPARQLQuery = async (parsedQuery, rdfParser) => {
    if (parsedQuery.queryType !== 'SELECT') {
      throw new Error('Only SELECT queries are supported');
    }

    const store = rdfParser.store;
    const quads = store.getQuads();
    
    const bindings = [];
    const variables = parsedQuery.variables.map(v => v.value || v);

    if (parsedQuery.where && parsedQuery.where.length > 0) {
      const patterns = extractTriplePatterns(parsedQuery.where);
      const solutions = matchPatterns(patterns, quads);
      
      solutions.forEach(solution => {
        const binding = {};
        variables.forEach(variable => {
          if (solution[variable]) {
            binding[variable] = {
              type: solution[variable].termType === 'NamedNode' ? 'uri' : 'literal',
              value: solution[variable].value
            };
          }
        });
        if (Object.keys(binding).length > 0) {
          bindings.push(binding);
        }
      });
    }

    return {
      head: { vars: variables },
      results: { bindings }
    };
  };

  const extractTriplePatterns = (whereClause) => {
    const patterns = [];
    
    const processPattern = (pattern) => {
      if (pattern.type === 'bgp') {
        patterns.push(...pattern.triples);
      } else if (pattern.type === 'group') {
        pattern.patterns.forEach(processPattern);
      } else if (pattern.type === 'optional') {
        processPattern(pattern.patterns[0]);
      } else if (pattern.type === 'filter') {
        // Handle filter patterns
      }
    };

    whereClause.forEach(processPattern);
    return patterns;
  };

  const matchPatterns = (patterns, quads) => {
    const solutions = [{}];
    
    patterns.forEach(pattern => {
      const newSolutions = [];
      
      solutions.forEach(solution => {
        const matchingQuads = findMatchingQuads(pattern, quads, solution);
        
        matchingQuads.forEach(quad => {
          const newSolution = { ...solution };
          
          if (pattern.subject.value && pattern.subject.value.startsWith('?')) {
            newSolution[pattern.subject.value.slice(1)] = quad.subject;
          }
          if (pattern.predicate.value && pattern.predicate.value.startsWith('?')) {
            newSolution[pattern.predicate.value.slice(1)] = quad.predicate;
          }
          if (pattern.object.value && pattern.object.value.startsWith('?')) {
            newSolution[pattern.object.value.slice(1)] = quad.object;
          }
          
          newSolutions.push(newSolution);
        });
      });
      
      solutions.length = 0;
      solutions.push(...newSolutions);
    });
    
    return solutions;
  };

  const findMatchingQuads = (pattern, quads, solution) => {
    return quads.filter(quad => {
      return matchesTerm(pattern.subject, quad.subject, solution) &&
             matchesTerm(pattern.predicate, quad.predicate, solution) &&
             matchesTerm(pattern.object, quad.object, solution);
    });
  };

  const matchesTerm = (patternTerm, quadTerm, solution) => {
    if (patternTerm.value.startsWith('?')) {
      const varName = patternTerm.value.slice(1);
      if (solution[varName]) {
        return solution[varName].value === quadTerm.value;
      }
      return true;
    } else {
      const expandedTerm = expandPrefixedName(patternTerm.value);
      return expandedTerm === quadTerm.value;
    }
  };

  const expandPrefixedName = (term) => {
    const prefixes = {
      'dt:': 'http://databricks.com/digitaltwin/',
      'ex:': 'http://example.com/factory/',
      'rdfs:': 'http://www.w3.org/2000/01/rdf-schema#',
      'dbx:': 'http://databricks.com/factory/'
    };

    for (const [prefix, uri] of Object.entries(prefixes)) {
      if (term.startsWith(prefix)) {
        return term.replace(prefix, uri);
      }
    }
    return term;
  };

  const highlightResultNodes = (results) => {
    if (!onHighlightNodes || !results.results || !results.results.bindings) return;
    
    const nodeIds = new Set();
    
    results.results.bindings.forEach(binding => {
      Object.values(binding).forEach(value => {
        if (value.type === 'uri') {
          nodeIds.add(value.value);
        }
      });
    });
    
    onHighlightNodes(Array.from(nodeIds));
  };

  const addToHistory = (queryText) => {
    const newHistory = [queryText, ...queryHistory.filter(q => q !== queryText)].slice(0, 10);
    setQueryHistory(newHistory);
    localStorage.setItem('sparql-query-history', JSON.stringify(newHistory));
  };

  const loadPredefinedQuery = (predefinedQuery) => {
    setQuery(predefinedQuery.query);
    setSelectedQuery(predefinedQuery.name);
  };

  const loadFromHistory = (historyQuery) => {
    setQuery(historyQuery);
  };

  const clearQuery = () => {
    setQuery('');
    setResults([]);
    setError(null);
    setSelectedQuery('');
  };

  const formatResultValue = (value) => {
    if (value.type === 'uri') {
      const parts = value.value.split(/[/#]/);
      return parts[parts.length - 1] || value.value;
    }
    return value.value;
  };

  const exportResults = () => {
    if (!results.results || !results.results.bindings.length) return;
    
    const csv = [
      results.head.vars.join(','),
      ...results.results.bindings.map(binding => 
        results.head.vars.map(variable => 
          binding[variable] ? `"${binding[variable].value}"` : ''
        ).join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sparql-results.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="sparql-query-interface">
      <div className="query-header">
        <h3>SPARQL Query Interface</h3>
        <div className="query-actions">
          <button onClick={clearQuery} disabled={isExecuting}>
            Clear
          </button>
          <button onClick={executeQuery} disabled={isExecuting || !query.trim()}>
            {isExecuting ? 'Executing...' : 'Execute Query'}
          </button>
        </div>
      </div>

      <div className="query-builder">
        <div className="predefined-queries">
          <h4>Sample Queries</h4>
          <select 
            value={selectedQuery} 
            onChange={(e) => {
              const selected = predefinedQueries.find(q => q.name === e.target.value);
              if (selected) loadPredefinedQuery(selected);
            }}
          >
            <option value="">Select a sample query...</option>
            {predefinedQueries.map(q => (
              <option key={q.name} value={q.name}>{q.name}</option>
            ))}
          </select>
        </div>

        {queryHistory.length > 0 && (
          <div className="query-history">
            <h4>Recent Queries</h4>
            <select onChange={(e) => loadFromHistory(e.target.value)} value="">
              <option value="">Load from history...</option>
              {queryHistory.map((historyQuery, index) => (
                <option key={index} value={historyQuery}>
                  {historyQuery.substring(0, 50)}...
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="query-input">
        <textarea
          ref={textareaRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter your SPARQL query here..."
          rows={8}
          disabled={isExecuting}
        />
      </div>

      {error && (
        <div className="query-error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {results.results && (
        <div className="query-results">
          <div className="results-header">
            <h4>Query Results ({results.results.bindings.length} results)</h4>
            {results.results.bindings.length > 0 && (
              <button onClick={exportResults} className="export-button">
                Export CSV
              </button>
            )}
          </div>
          
          {results.results.bindings.length === 0 ? (
            <div className="no-results">No results found</div>
          ) : (
            <div className="results-table">
              <table>
                <thead>
                  <tr>
                    {results.head.vars.map(variable => (
                      <th key={variable}>{variable}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.results.bindings.map((binding, index) => (
                    <tr key={index}>
                      {results.head.vars.map(variable => (
                        <td key={variable}>
                          {binding[variable] ? (
                            <span 
                              className={`result-value ${binding[variable].type}`}
                              title={binding[variable].value}
                            >
                              {formatResultValue(binding[variable])}
                            </span>
                          ) : (
                            <span className="null-value">-</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SPARQLQueryInterface;