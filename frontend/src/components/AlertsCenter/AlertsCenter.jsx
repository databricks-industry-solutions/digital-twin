import React, { useState, useEffect } from 'react';
import './AlertsCenter.css';

const AlertsCenter = ({ telemetryData, graphData }) => {
  const [alerts, setAlerts] = useState([]);
  const [filterLevel, setFilterLevel] = useState('all');

  useEffect(() => {
    if (telemetryData && graphData) {
      generateAlerts();
    }
  }, [telemetryData, graphData]);

  const generateAlerts = () => {
    const newAlerts = [];
    const now = new Date();

    telemetryData.forEach(data => {
      const thresholds = {
        sensorAReading: { warning: 90, critical: 100 },
        sensorBReading: { warning: 60, critical: 70 },
        sensorCReading: { warning: 120, critical: 140 },
        sensorDReading: { warning: 75, critical: 85 }
      };

      Object.entries(thresholds).forEach(([sensor, threshold]) => {
        const value = data[sensor];
        if (value >= threshold.critical) {
          newAlerts.push({
            id: `${data.componentID}-${sensor}-critical-${now.getTime()}`,
            componentID: data.componentID,
            sensor,
            level: 'critical',
            message: `${sensor} reading is critically high: ${value.toFixed(2)}`,
            timestamp: now.toISOString(),
            value: value,
            threshold: threshold.critical
          });
        } else if (value >= threshold.warning) {
          newAlerts.push({
            id: `${data.componentID}-${sensor}-warning-${now.getTime()}`,
            componentID: data.componentID,
            sensor,
            level: 'warning',
            message: `${sensor} reading is above warning threshold: ${value.toFixed(2)}`,
            timestamp: now.toISOString(),
            value: value,
            threshold: threshold.warning
          });
        }
      });
    });

    setAlerts(prev => [...newAlerts, ...prev].slice(0, 100));
  };

  const filteredAlerts = alerts.filter(alert => 
    filterLevel === 'all' || alert.level === filterLevel
  );

  const clearAlert = (alertId) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  const clearAllAlerts = () => {
    setAlerts([]);
  };

  const getAlertColor = (level) => {
    const colors = {
      critical: '#dc3545',
      warning: '#ffc107',
      info: '#17a2b8'
    };
    return colors[level] || '#6c757d';
  };

  const getAlertIcon = (level) => {
    const icons = {
      critical: '🚨',
      warning: '⚠️',
      info: 'ℹ️'
    };
    return icons[level] || '📋';
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const getAlertCounts = () => {
    return {
      total: alerts.length,
      critical: alerts.filter(a => a.level === 'critical').length,
      warning: alerts.filter(a => a.level === 'warning').length,
      info: alerts.filter(a => a.level === 'info').length
    };
  };

  const counts = getAlertCounts();

  return (
    <div className="alerts-center">
      <div className="alerts-header">
        <h3>Alerts & Notifications</h3>
        <div className="alerts-actions">
          <button 
            onClick={clearAllAlerts}
            disabled={alerts.length === 0}
            className="clear-all-btn"
          >
            Clear All
          </button>
        </div>
      </div>

      <div className="alerts-summary">
        <div className="alert-count total">
          <span className="count">{counts.total}</span>
          <span className="label">Total</span>
        </div>
        <div className="alert-count critical">
          <span className="count">{counts.critical}</span>
          <span className="label">Critical</span>
        </div>
        <div className="alert-count warning">
          <span className="count">{counts.warning}</span>
          <span className="label">Warning</span>
        </div>
        <div className="alert-count info">
          <span className="count">{counts.info}</span>
          <span className="label">Info</span>
        </div>
      </div>

      <div className="alerts-filters">
        <select 
          value={filterLevel} 
          onChange={(e) => setFilterLevel(e.target.value)}
        >
          <option value="all">All Alerts</option>
          <option value="critical">Critical Only</option>
          <option value="warning">Warning Only</option>
          <option value="info">Info Only</option>
        </select>
      </div>

      <div className="alerts-list">
        {filteredAlerts.length === 0 ? (
          <div className="no-alerts">
            {filterLevel === 'all' ? 'No alerts at this time' : `No ${filterLevel} alerts`}
          </div>
        ) : (
          filteredAlerts.map(alert => (
            <div 
              key={alert.id} 
              className={`alert-item ${alert.level}`}
              style={{ borderLeftColor: getAlertColor(alert.level) }}
            >
              <div className="alert-content">
                <div className="alert-header">
                  <span className="alert-icon">{getAlertIcon(alert.level)}</span>
                  <span className="alert-component">{alert.componentID}</span>
                  <span className="alert-level">{alert.level.toUpperCase()}</span>
                  <button 
                    className="close-alert"
                    onClick={() => clearAlert(alert.id)}
                  >
                    ×
                  </button>
                </div>
                <div className="alert-message">{alert.message}</div>
                <div className="alert-details">
                  <span>Sensor: {alert.sensor}</span>
                  <span>Value: {alert.value?.toFixed(2)}</span>
                  <span>Threshold: {alert.threshold}</span>
                </div>
                <div className="alert-timestamp">
                  {formatTimestamp(alert.timestamp)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AlertsCenter;