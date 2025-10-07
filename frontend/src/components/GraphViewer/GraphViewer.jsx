import React, { useEffect, useRef, useState, useCallback } from "react";
import cytoscape from "cytoscape";
// import your JS utilities as before
import {
  parseDigitalTwinStructure,
  parseDigitalTwinState,
  retrieveAffectedQuads,
} from "../../utils/viewer/rdf";
import { fetchLatestTriples, fetchTriplesAtTimestamp } from "../../utils/viewer/triples";
import { fetchDigitalTwinRDFBody, getDigitalTwinLayoutAndStyle } from "../../utils/viewer/digitaltwin";
import { Store } from "n3";
import { QueryEngine } from "@comunica/query-sparql-rdfjs";

function DigitalTwinGraph({ initialModel }) {
  const graphRef = useRef(null);
  const [rdfContent, setRdfContent] = useState(initialModel || '');
  const [visibleRight, setVisibleRight] = useState(false);
  const [visibleComponent, setVisibleComponent] = useState({
    id: 0,
    label: null,
    type: null,
    comment: null,
    sensorList: {},
  });
  const [digitalTwinState, setDigitalTwinState] = useState({});
  const [digitalTwinStructure, setDigitalTwinStructure] = useState([]);
  const engine = useRef(new QueryEngine());

  const handleTimestampSelection = useCallback(async (event) => {
    const state = await parseDigitalTwinState(
      await fetchTriplesAtTimestamp(event.timestamp)
    );
    setDigitalTwinState(state);
  }, []);

  useEffect(() => {
    async function initialize() {
      // Use digitalTwinName from props or your app state
      const structure = await parseDigitalTwinStructure(
        rdfContent
      );
      console.log(structure)
      const state = await parseDigitalTwinState(await fetchLatestTriples());
      let results = structure;

      for (let result of results.elements) {
        if (state[result.data.id] !== undefined) {
          if ("damaged_component" in state[result.data.id]) {
            if (state[result.data.id]["damaged_component"] === "true") {
              result.data.state = "broken";
            }
          }
        }
      }
      const store = new Store();
      store.addQuads(results.quads);
      const affectedQuads = await retrieveAffectedQuads(engine.current, store);

      for (let quad of affectedQuads) {
        for (let i = 0; i < results.elements.length; i++) {
          if (results.elements[i].data.id === quad.subject.id) {
            results.elements[i].data.state = "impacted";
            break;
          }
        }
      }
      setDigitalTwinState(state);
      setDigitalTwinStructure(results);

      // layout and style
      const [layout, style] = getDigitalTwinLayoutAndStyle(results);
      if (graphRef.current) {
        let cy = cytoscape({
          container: graphRef.current,
          elements: results.elements,
          style,
          layout,
        });
        cy.on("tap", "node", function (evt) {
          var node = evt.target;
          setVisibleRight(true);
          setVisibleComponent({
            label: node.data("label"),
            type: node.data("type"),
            comment: node.data("comment"),
            sensorList: state[node.data("id")] ?? {},
          });
        });
      }
    }
    initialize();
  }, [initialModel]);

  return (
    <>

        {/* Timestamp Selector Example */}
        <button
          onClick={() =>
            handleTimestampSelection({ timestamp: Date.now() })
          }
          style={{
            fontSize: 16,
            padding: "8px 12px",
            cursor: "pointer",
            border: "1px solid #888",
            borderRadius: 4,
            background: "#fafafa",
            boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
          }}
        >
          Pick Timestamp
        </button>

      <div
        ref={graphRef}
        className="graph-container"
        style={{
          width: "calc(100vw - 360px)",
          height: "calc(100vh - 80px)",
          backgroundColor: "rgb(246,247,249)",
        }}
      />
      {/* Sidebar */}
      <div
        className={`sidebar${visibleRight ? " visible" : ""}`}
        style={{
          position: "fixed",
          top: 0,
          right: visibleRight ? 0 : -400,
          width: 400,
          height: "100vh",
          background: "#fff",
          boxShadow: "-2px 0 7px #e0e0e0",
          zIndex: 10000,
          transition: "right 0.25s",
          padding: "24px 18px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <button
          className="sidebar-close"
          style={{
            position: "absolute",
            top: 10,
            right: 16,
            border: "none",
            background: "transparent",
            fontSize: "1.2em",
            cursor: "pointer",
          }}
          onClick={() => setVisibleRight(false)}
        >
          ×
        </button>
        <div
          className="sidebar-header"
          style={{
            fontWeight: "bold",
            fontSize: "1.2rem",
            marginBottom: 8,
            color: "#000", 
          }}
        >
          {visibleComponent.label}
        </div>
        <span style={{ color: "#000" }}>{visibleComponent.type}</span>
        <span style={{ color: "#000" }}>{visibleComponent.comment}</span>
        <ul style={{ marginTop: "1rem", padding: 0, listStyle: "none" }}>
          {Object.keys(visibleComponent.sensorList || {}).map((sensor) => (
            <li
              key={sensor}
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <span style={{ fontWeight: 600, color: "#222" }}>{sensor}</span>
              <span style={{ color: "#000" }}>
                {visibleComponent.sensorList[sensor]}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

export default DigitalTwinGraph;
