import React, { useState, useEffect } from 'react';
import { TelemetryFetcher } from '../../utils/telemetryFetcher';
import { RDFParser } from '../../utils/rdfParser';
import './TelemetryOverlay.css';

const TelemetryOverlay = ({ selectedNode, onClose, position }) => {
  const [telemetryData, setTelemetryData] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('1h');
  const [selectedTimestamp, setSelectedTimestamp] = useState(new Date().toISOString());
  const [telemetryFetcher] = useState(new TelemetryFetcher());
  const [rdfParser] = useState(new RDFParser());

  useEffect(() => {
    if (selectedNode && selectedNode.type === 'component') {
      fetchTelemetryData();
    }
  }, [selectedNode, selectedTimestamp]);

  const fetchTelemetryData = async () => {
    if (!selectedNode) return;

    setLoading(true);
    try {
      // Use RDF parser to extract proper component ID for telemetry mapping
      const componentId = rdfParser.extractComponentId(selectedNode.id);
      console.log(`TelemetryOverlay: Extracted component ID "${componentId}" from URI "${selectedNode.id}"`);

      const latest = await telemetryFetcher.fetchLatestTelemetry(componentId);
      setTelemetryData(latest);

      const endTime = new Date(selectedTimestamp);
      const startTime = new Date(endTime.getTime() - getTimeRangeMs(selectedTimeRange));

      const historical = await telemetryFetcher.fetchHistoricalTelemetry(
        componentId,
        startTime.toISOString(),
        endTime.toISOString()
      );
      setHistoricalData(historical);
    } catch (error) {
      console.error('Error fetching telemetry data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeRangeMs = (range) => {
    const ranges = {
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000
    };
    return ranges[range] || ranges['1h'];
  };

  const getSensorDefinitions = () => {
    return telemetryFetcher.getSensorDefinitions();
  };

  const getSensorHealth = (value, sensorType) => {
    return telemetryFetcher.analyzeSensorHealth(value, sensorType);
  };

  const formatValue = (value, unit) => {
    return `${value.toFixed(2)} ${unit}`;
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const getHealthColor = (health) => {
    const colors = {
      'healthy': '#27ae60',
      'warning': '#f39c12',
      'critical': '#e74c3c',
      'unknown': '#95a5a6'
    };
    return colors[health] || colors['unknown'];
  };

  const renderSensorCard = (sensorKey, sensorDef, value) => {
    const health = getSensorHealth(value, sensorKey);
    const healthColor = getHealthColor(health);
    
    return (
      <div key={sensorKey} className="sensor-card">
        <div className="sensor-header">
          <h4>{sensorDef.label}</h4>
          <div 
            className="health-indicator"
            style={{ backgroundColor: healthColor }}
            title={health}
          />
        </div>
        <div className="sensor-value">
          {formatValue(value, sensorDef.unit)}
        </div>
        <div className="sensor-range">
          Range: {sensorDef.min} - {sensorDef.max} {sensorDef.unit}
        </div>
        <div className="sensor-progress">
          <div 
            className="progress-bar"
            style={{ 
              width: `${(value / sensorDef.max) * 100}%`,
              backgroundColor: healthColor
            }}
          />
        </div>
      </div>
    );
  };

  const renderHistoricalChart = () => {
    if (!historicalData.length) return null;

    const sensorDefinitions = getSensorDefinitions();
    const sensors = Object.keys(sensorDefinitions);
    
    return (
      <div className="historical-chart">
        <h4>Historical Data</h4>
        <div className="chart-container">
          {sensors.map(sensorKey => {
            const sensorDef = sensorDefinitions[sensorKey];
            const values = historicalData.map(data => data[sensorKey]);
            const maxValue = Math.max(...values);
            const minValue = Math.min(...values);
            
            return (
              <div key={sensorKey} className="mini-chart">
                <div className="chart-title">{sensorDef.label}</div>
                <div className="chart-line">
                  {values.map((value, index) => (
                    <div
                      key={index}
                      className="chart-point"
                      style={{
                        height: `${((value - minValue) / (maxValue - minValue)) * 100}%`,
                        backgroundColor: getHealthColor(getSensorHealth(value, sensorKey))
                      }}
                      title={`${formatValue(value, sensorDef.unit)} at ${formatTimestamp(historicalData[index].timestamp)}`}
                    />
                  ))}
                </div>
                <div className="chart-range">
                  <span>{formatValue(minValue, sensorDef.unit)}</span>
                  <span>{formatValue(maxValue, sensorDef.unit)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (!selectedNode) return null;

  const overlayStyle = {
    position: 'absolute',
    left: position?.x || 0,
    top: position?.y || 0,
    zIndex: 1000
  };

  return (
    <div className="telemetry-overlay" style={overlayStyle}>
      <div className="overlay-header">
        <h3>{selectedNode.label} Telemetry</h3>
        <button className="close-button" onClick={onClose}>×</button>
      </div>

      <div className="overlay-content">
        {selectedNode.type !== 'component' ? (
          <div className="no-telemetry">
            <p>Telemetry data is only available for components.</p>
          </div>
        ) : loading ? (
          <div className="loading">Loading telemetry data...</div>
        ) : !telemetryData ? (
          <div className="no-data">No telemetry data available</div>
        ) : (
          <>
            <div className="timestamp-controls">
              <label>
                Timestamp:
                <input
                  type="datetime-local"
                  value={selectedTimestamp.slice(0, -1)}
                  onChange={(e) => setSelectedTimestamp(e.target.value + 'Z')}
                />
              </label>
              <label>
                Time Range:
                <select
                  value={selectedTimeRange}
                  onChange={(e) => setSelectedTimeRange(e.target.value)}
                >
                  <option value="15m">15 minutes</option>
                  <option value="1h">1 hour</option>
                  <option value="6h">6 hours</option>
                  <option value="24h">24 hours</option>
                  <option value="7d">7 days</option>
                </select>
              </label>
              <button onClick={fetchTelemetryData} disabled={loading}>
                Refresh
              </button>
            </div>

            <div className="current-values">
              <h4>Current Values</h4>
              <div className="last-updated">
                Last updated: {formatTimestamp(telemetryData.timestamp)}
              </div>
              <div className="sensors-grid">
                {Object.entries(getSensorDefinitions()).map(([sensorKey, sensorDef]) => 
                  renderSensorCard(sensorKey, sensorDef, telemetryData[sensorKey])
                )}
              </div>
            </div>

            {renderHistoricalChart()}

            <div className="telemetry-summary">
              <div className="summary-item">
                <span>Component ID:</span>
                <span>{rdfParser.extractComponentId(selectedNode.id)}</span>
              </div>
              <div className="summary-item">
                <span>Overall Health:</span>
                <span 
                  className="health-status"
                  style={{ 
                    color: getHealthColor(telemetryFetcher.getComponentHealth(telemetryData))
                  }}
                >
                  {telemetryFetcher.getComponentHealth(telemetryData).toUpperCase()}
                </span>
              </div>
              <div className="summary-item">
                <span>Data Points:</span>
                <span>{historicalData.length}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TelemetryOverlay;