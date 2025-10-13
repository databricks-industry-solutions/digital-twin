import React, { useState, useEffect } from 'react';
import { TelemetryFetcher } from '../../utils/telemetryFetcher';
// DatabricksService removed for security - frontend uses backend proxy only

const TelemetryDebugPanel = () => {
  const [debugInfo, setDebugInfo] = useState({});
  const [testResults, setTestResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [telemetryFetcher] = useState(new TelemetryFetcher());
  // Removed insecure DatabricksService - all auth handled by backend

  useEffect(() => {
    loadDebugInfo();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDebugInfo = async () => {
    const info = {
      isConfigured: true, // Always configured to use backend proxy
      config: {
        backendUrl: telemetryFetcher.telemetryService.backendBaseUrl || 'http://localhost:8080',
        secureMode: true, // Always uses secure backend proxy
        description: 'Frontend uses backend API for all Databricks operations'
      },
      telemetryFetcherConfig: {
        useBackend: telemetryFetcher.useBackend, // Always true
        securityStatus: 'Secure - No tokens in frontend'
      }
    };
    setDebugInfo(info);
  };

  const testConnection = async () => {
    setLoading(true);
    const results = {};

    try {
      console.log('Testing backend connection...');
      const telemetryData = await telemetryFetcher.fetchAllLatestTelemetry();
      results.connectionTest = true;
      results.connectionStatus = 'success';
      results.telemetryTest = telemetryData;
      results.telemetryStatus = telemetryData.length > 0 ? 'success' : 'no_data';
      results.telemetryCount = telemetryData.length;
      results.message = `✅ Backend proxy working correctly (${telemetryData.length} components)`;
    } catch (error) {
      results.connectionTest = false;
      results.connectionStatus = 'failed';
      results.connectionError = `Backend unavailable: ${error.message}`;
      results.message = '❌ Backend server not available. Start Flask server on port 8080.';
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
          <span>✅ Secure Backend Proxy</span>
        </div>
        <div className={`config-item success`}>
          <span>Backend URL:</span>
          <span>{debugInfo.config?.backendUrl || 'http://localhost:8080'}</span>
        </div>
        <div className={`config-item success`}>
          <span>Security Mode:</span>
          <span>✅ No Tokens in Frontend</span>
        </div>
        <div className={`config-item success`}>
          <span>Authentication:</span>
          <span>✅ Backend OAuth (15-min refresh)</span>
        </div>
        <div className="config-item info">
          <span>Architecture:</span>
          <span>Frontend → Backend API → Databricks</span>
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
            <span>Backend Connection:</span>
            <span>
              {testResults.message || (testResults.connectionStatus === 'success' ? '✅ Connected' : '❌ Failed')}
              {testResults.connectionError && (
                <div className="error-details">
                  <div>{testResults.connectionError}</div>
                  <div className="info-note">
                    <strong>Solution:</strong> Start the Flask backend server:
                    <pre>cd serving-app && python app.py</pre>
                  </div>
                </div>
              )}
            </span>
          </div>

          <div className={`test-item ${testResults.telemetryStatus}`}>
            <span>Telemetry Data:</span>
            <span>
              {testResults.telemetryStatus === 'success' ?
                `✅ ${testResults.telemetryCount} components` :
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
        <li>Set <code>REACT_APP_BACKEND_URL=http://localhost:8080</code></li>
        <li>Start the backend server: <code>cd serving-app && python app.py</code></li>
        <li>Ensure backend is configured with Databricks credentials (see serving-app/.env.local)</li>
        <li>Run the connection test below to verify backend connectivity</li>
      </ol>

      <div className="env-example">
        <h5>Frontend Environment Variables (Secure):</h5>
        <pre>{`# ✅ SAFE - Only backend URL needed
REACT_APP_BACKEND_URL=http://localhost:8080

# ❌ NEVER ADD Databricks tokens in frontend!
# Backend handles all authentication securely`}</pre>
      </div>

      <div className="security-note">
        <h5>🔒 Security Architecture:</h5>
        <div>Frontend → Backend API (localhost:8080) → Databricks</div>
        <div>✅ No credentials in browser</div>
        <div>✅ OAuth tokens managed server-side</div>
        <div>✅ Automatic token refresh every 15 minutes</div>
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

        .config-item.info {
          background: #d1ecf1;
          border-left: 4px solid #17a2b8;
        }

        .test-item.no_data {
          background: #fff3cd;
          border-left: 4px solid #ffc107;
        }

        .security-note {
          margin-top: 15px;
          padding: 15px;
          background: #d4edda;
          border-left: 4px solid #28a745;
          border-radius: 4px;
          font-size: 13px;
          line-height: 1.8;
        }

        .security-note h5 {
          margin-top: 0;
          margin-bottom: 10px;
          color: #155724;
        }

        .security-note div {
          margin: 5px 0;
          padding-left: 10px;
        }

        .info-note {
          margin-top: 10px;
          padding: 12px;
          background: #e7f3ff;
          border-left: 4px solid #2196f3;
          border-radius: 4px;
          font-size: 13px;
          line-height: 1.5;
        }

        .info-note strong {
          color: #0066cc;
        }

        .info-note pre {
          background: #f5f5f5;
          padding: 8px;
          border-radius: 3px;
          margin: 8px 0;
          overflow-x: auto;
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

        .error-details {
          margin-top: 8px;
          font-size: 14px;
        }

        .cors-note {
          margin-top: 10px;
          padding: 12px;
          background: #e3f2fd;
          border-left: 4px solid #2196f3;
          border-radius: 4px;
          font-size: 13px;
          line-height: 1.5;
        }

        .cors-note strong {
          color: #1976d2;
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