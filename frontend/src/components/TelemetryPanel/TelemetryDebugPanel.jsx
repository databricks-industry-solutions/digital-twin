import React, { useState, useEffect } from 'react';
import { TelemetryFetcher } from '../../utils/telemetryFetcher';
import DatabricksService from '../../services/databricksService';

const TelemetryDebugPanel = () => {
  const [debugInfo, setDebugInfo] = useState({});
  const [testResults, setTestResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [telemetryFetcher] = useState(new TelemetryFetcher());
  const [databricksService] = useState(new DatabricksService());

  useEffect(() => {
    loadDebugInfo();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDebugInfo = async () => {
    const info = {
      isConfigured: databricksService.isConfigured(),
      config: {
        hasHost: !!databricksService.config.serverHostname,
        hasToken: !!databricksService.config.token,
        hasWarehouseId: !!databricksService.config.warehouseId,
        hasHttpPath: !!databricksService.config.httpPath,
        tableFullName: databricksService.tableFullName
      },
      telemetryFetcherConfig: {
        useDatabricks: telemetryFetcher.useDatabricks,
        connectionTested: telemetryFetcher.connectionTested
      }
    };
    setDebugInfo(info);
  };

  const testConnection = async () => {
    setLoading(true);
    const results = {};
    
    try {
      console.log('Testing Databricks connection...');
      results.connectionTest = await databricksService.testConnection();
      results.connectionStatus = 'success';
    } catch (error) {
      results.connectionTest = false;
      results.connectionStatus = 'failed';
      results.connectionError = error.message;
    }

    try {
      console.log('Testing table schema...');
      results.tableSchema = await databricksService.getTableInfo();
      results.schemaStatus = 'success';
    } catch (error) {
      results.schemaStatus = 'failed';
      results.schemaError = error.message;
    }

    try {
      console.log('Testing telemetry data fetch...');
      const telemetryData = await databricksService.fetchLatestTelemetry();
      results.telemetryTest = telemetryData;
      results.telemetryStatus = telemetryData.length > 0 ? 'success' : 'no_data';
      results.telemetryCount = telemetryData.length;
    } catch (error) {
      results.telemetryStatus = 'failed';
      results.telemetryError = error.message;
    }

    setTestResults(results);
    setLoading(false);
  };

  const renderConfigInfo = () => (
    <div className="debug-section">
      <h4>Configuration Status</h4>
      <div className="config-grid">
        <div className={`config-item ${debugInfo.isConfigured ? 'success' : 'error'}`}>
          <span>Overall Config:</span>
          <span>{debugInfo.isConfigured ? '✅ Valid' : '❌ Invalid'}</span>
        </div>
        <div className={`config-item ${debugInfo.config?.hasHost ? 'success' : 'error'}`}>
          <span>Databricks Host:</span>
          <span>{debugInfo.config?.hasHost ? '✅ Set' : '❌ Missing'}</span>
        </div>
        <div className={`config-item ${debugInfo.config?.hasToken ? 'success' : 'error'}`}>
          <span>Access Token:</span>
          <span>{debugInfo.config?.hasToken ? '✅ Set' : '❌ Missing'}</span>
        </div>
        <div className={`config-item ${(debugInfo.config?.hasWarehouseId || debugInfo.config?.hasHttpPath) ? 'success' : 'error'}`}>
          <span>Warehouse Config:</span>
          <span>
            {debugInfo.config?.hasWarehouseId ? '✅ Warehouse ID' : 
             debugInfo.config?.hasHttpPath ? '✅ HTTP Path' : '❌ Missing'}
          </span>
        </div>
        <div className="config-item">
          <span>Table Name:</span>
          <span>{debugInfo.config?.tableFullName || 'Not set'}</span>
        </div>
      </div>
    </div>
  );

  const renderTestResults = () => {
    if (Object.keys(testResults).length === 0) return null;

    return (
      <div className="debug-section">
        <h4>Test Results</h4>
        <div className="test-results">
          <div className={`test-item ${testResults.connectionStatus}`}>
            <span>Connection Test:</span>
            <span>
              {testResults.connectionStatus === 'success' ? '✅ Connected' : '❌ Failed'}
              {testResults.connectionError && ` (${testResults.connectionError})`}
            </span>
          </div>
          
          <div className={`test-item ${testResults.schemaStatus}`}>
            <span>Table Schema:</span>
            <span>
              {testResults.schemaStatus === 'success' ? '✅ Accessible' : '❌ Failed'}
              {testResults.schemaError && ` (${testResults.schemaError})`}
            </span>
          </div>

          <div className={`test-item ${testResults.telemetryStatus}`}>
            <span>Telemetry Data:</span>
            <span>
              {testResults.telemetryStatus === 'success' ? 
                `✅ ${testResults.telemetryCount} records` : 
                testResults.telemetryStatus === 'no_data' ? 
                  '⚠️ No data' : '❌ Failed'}
              {testResults.telemetryError && ` (${testResults.telemetryError})`}
            </span>
          </div>

          {testResults.telemetryTest && testResults.telemetryTest.length > 0 && (
            <div className="sample-data">
              <h5>Sample Data:</h5>
              <pre>{JSON.stringify(testResults.telemetryTest[0], null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderInstructions = () => (
    <div className="debug-section">
      <h4>Setup Instructions</h4>
      <ol className="instructions">
        <li>Copy <code>frontend/.env.example</code> to <code>frontend/.env.local</code></li>
        <li>Fill in your Databricks workspace URL, warehouse ID, and access token</li>
        <li>Ensure your bronze table exists with the expected schema</li>
        <li>Run the connection test below to verify everything works</li>
      </ol>
      
      <div className="env-example">
        <h5>Required Environment Variables:</h5>
        <pre>{`REACT_APP_DATABRICKS_HOST=your-workspace.databricks.com
REACT_APP_WAREHOUSE_ID=your-warehouse-id
REACT_APP_DATABRICKS_TOKEN=your-access-token
REACT_APP_DATABRICKS_TABLE=sensor_bronze_table`}</pre>
      </div>
    </div>
  );

  return (
    <div className="telemetry-debug-panel">
      <div className="debug-header">
        <h3>Databricks Telemetry Debug Panel</h3>
        <button 
          onClick={testConnection} 
          disabled={loading}
          className="test-button"
        >
          {loading ? 'Testing...' : 'Run Connection Test'}
        </button>
      </div>

      <div className="debug-content">
        {renderConfigInfo()}
        {renderTestResults()}
        {renderInstructions()}
      </div>

      <style jsx>{`
        .telemetry-debug-panel {
          padding: 20px;
          background: #f8f9fa;
          border-radius: 8px;
          margin: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .debug-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 2px solid #dee2e6;
        }

        .debug-header h3 {
          margin: 0;
          color: #333;
        }

        .test-button {
          padding: 10px 20px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-weight: 500;
        }

        .test-button:hover:not(:disabled) {
          background: #0056b3;
        }

        .test-button:disabled {
          background: #6c757d;
          cursor: not-allowed;
        }

        .debug-section {
          margin-bottom: 25px;
          background: white;
          padding: 20px;
          border-radius: 6px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .debug-section h4 {
          margin-top: 0;
          margin-bottom: 15px;
          color: #495057;
          font-size: 18px;
        }

        .config-grid, .test-results {
          display: grid;
          gap: 10px;
        }

        .config-item, .test-item {
          display: flex;
          justify-content: space-between;
          padding: 10px;
          border-radius: 4px;
          background: #f8f9fa;
        }

        .config-item.success, .test-item.success {
          background: #d4edda;
          border-left: 4px solid #28a745;
        }

        .config-item.error, .test-item.failed {
          background: #f8d7da;
          border-left: 4px solid #dc3545;
        }

        .test-item.no_data {
          background: #fff3cd;
          border-left: 4px solid #ffc107;
        }

        .sample-data {
          margin-top: 15px;
        }

        .sample-data pre {
          background: #f1f3f4;
          padding: 10px;
          border-radius: 4px;
          overflow-x: auto;
          font-size: 12px;
        }

        .instructions {
          margin-bottom: 20px;
          padding-left: 20px;
        }

        .instructions li {
          margin-bottom: 8px;
          line-height: 1.5;
        }

        .env-example pre {
          background: #f1f3f4;
          padding: 15px;
          border-radius: 4px;
          overflow-x: auto;
          font-size: 13px;
          border-left: 4px solid #17a2b8;
        }

        code {
          background: #f1f3f4;
          padding: 2px 4px;
          border-radius: 3px;
          font-size: 90%;
        }
      `}</style>
    </div>
  );
};

export default TelemetryDebugPanel;