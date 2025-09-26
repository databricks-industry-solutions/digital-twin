import React, { useState, useEffect } from 'react';
import TelemetryService from '../../services/telemetryService';

const ConnectionTestPanel = () => {
  const [testResults, setTestResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [telemetryService] = useState(new TelemetryService());

  useEffect(() => {
    // Auto-run basic tests on component mount
    runQuickTest();
  }, []);

  const runQuickTest = async () => {
    setLoading(true);
    try {
      const config = telemetryService.validateConfiguration();
      const backendHealth = await telemetryService.testBackendAvailability();
      
      setTestResults({
        quick: true,
        config,
        backendHealth,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Quick test failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const runFullTest = async () => {
    setLoading(true);
    try {
      const results = await telemetryService.runConnectionTests();
      setTestResults(results);
    } catch (error) {
      console.error('Full test failed:', error);
      setTestResults({
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    if (status === true) return '✅';
    if (status === false) return '❌';
    return '⚠️';
  };

  const getStatusColor = (status) => {
    if (status === true) return '#10b981';
    if (status === false) return '#ef4444';
    return '#f59e0b';
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <div style={{ marginBottom: '20px' }}>
        <h3>🧪 Databricks Connection Validator</h3>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>
          Test your Databricks connection through different methods to avoid CORS issues
        </p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={runQuickTest}
          disabled={loading}
          style={{
            marginRight: '10px',
            padding: '8px 16px',
            backgroundColor: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '🔄 Testing...' : '⚡ Quick Test'}
        </button>
        
        <button
          onClick={runFullTest}
          disabled={loading}
          style={{
            padding: '8px 16px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '🔄 Testing...' : '🔬 Full Test Suite'}
        </button>
      </div>

      {testResults && (
        <div style={{ 
          backgroundColor: '#f8fafc', 
          border: '1px solid #e2e8f0', 
          borderRadius: '8px', 
          padding: '16px' 
        }}>
          <div style={{ marginBottom: '16px' }}>
            <strong>📊 Test Results</strong>
            <span style={{ 
              marginLeft: '10px', 
              fontSize: '12px', 
              color: '#6b7280' 
            }}>
              {new Date(testResults.timestamp).toLocaleString()}
            </span>
          </div>

          {/* Configuration Check */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
              🔧 Configuration
            </div>
            <div style={{ paddingLeft: '20px', fontSize: '14px' }}>
              <div>Backend URL: {getStatusIcon(testResults.config?.hasBackendUrl)} {testResults.config?.backendUrl}</div>
              <div>Databricks Host: {getStatusIcon(testResults.config?.hasDatabricksHost)}</div>
              <div>Auth Token: {getStatusIcon(testResults.config?.hasDatabricksToken)}</div>
              <div>Warehouse ID: {getStatusIcon(testResults.config?.hasWarehouseId)}</div>
              <div>Target Table: {testResults.config?.catalog}.{testResults.config?.schema}.{testResults.config?.table}</div>
            </div>
          </div>

          {/* Backend Health */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
              🏥 Backend Health
            </div>
            <div style={{ paddingLeft: '20px', fontSize: '14px' }}>
              <div>
                Available: {getStatusIcon(testResults.backendHealth?.available)}
                {testResults.backendHealth?.available ? 
                  ` (Status: ${testResults.backendHealth.status})` : 
                  ` (${testResults.backendHealth?.error})`
                }
              </div>
            </div>
          </div>

          {/* Full Test Results */}
          {testResults.tests && (
            <>
              {/* Databricks Connection */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                  🔗 Databricks Connection
                </div>
                <div style={{ paddingLeft: '20px', fontSize: '14px' }}>
                  {testResults.tests.databricksConnection?.skipped ? (
                    <div>⏭️ Skipped: {testResults.tests.databricksConnection.reason}</div>
                  ) : (
                    <div>
                      Status: {getStatusIcon(testResults.tests.databricksConnection?.success)} 
                      {testResults.tests.databricksConnection?.message}
                    </div>
                  )}
                </div>
              </div>

              {/* Data Fetch */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                  📊 Data Fetch
                </div>
                <div style={{ paddingLeft: '20px', fontSize: '14px' }}>
                  {testResults.tests.dataFetch?.skipped ? (
                    <div>⏭️ Skipped: {testResults.tests.dataFetch.reason}</div>
                  ) : testResults.tests.dataFetch?.success ? (
                    <div>
                      ✅ Retrieved {testResults.tests.dataFetch.count} records from {testResults.tests.dataFetch.table}
                    </div>
                  ) : (
                    <div>❌ Failed: {testResults.tests.dataFetch?.error}</div>
                  )}
                </div>
              </div>

              {/* Summary & Recommendation */}
              <div style={{ 
                marginTop: '16px', 
                padding: '12px', 
                backgroundColor: testResults.summary?.dataAvailable ? '#d1fae5' : '#fef3c7',
                borderRadius: '6px',
                borderLeft: `4px solid ${testResults.summary?.dataAvailable ? '#10b981' : '#f59e0b'}`
              }}>
                <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                  🎯 Recommendation
                </div>
                <div style={{ fontSize: '14px' }}>
                  <div><strong>Approach:</strong> {testResults.summary?.recommendedApproach}</div>
                  <div><strong>Data Available:</strong> {getStatusIcon(testResults.summary?.dataAvailable)}</div>
                  
                  {testResults.summary?.recommendedApproach === 'backend-proxy' && (
                    <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#dcfce7', borderRadius: '4px' }}>
                      ✅ <strong>Best Setup:</strong> Using backend proxy - no CORS issues!
                    </div>
                  )}
                  
                  {testResults.summary?.recommendedApproach === 'backend-proxy-with-mock-data' && (
                    <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fef3c7', borderRadius: '4px' }}>
                      ⚠️ <strong>Development Mode:</strong> Backend available but Databricks connection issues. Using mock data.
                    </div>
                  )}
                  
                  {testResults.summary?.recommendedApproach === 'frontend-mock-data-only' && (
                    <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fef2f2', borderRadius: '4px' }}>
                      🔧 <strong>Setup Needed:</strong> Start the Flask backend server on port 8080 for full functionality.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {testResults.error && (
            <div style={{ 
              color: '#dc2626', 
              backgroundColor: '#fef2f2', 
              padding: '12px', 
              borderRadius: '6px',
              marginTop: '12px'
            }}>
              ❌ Test Error: {testResults.error}
            </div>
          )}
        </div>
      )}

      <div style={{ 
        marginTop: '20px', 
        padding: '12px', 
        backgroundColor: '#f0f9ff', 
        borderRadius: '6px',
        fontSize: '13px',
        color: '#374151'
      }}>
        <div><strong>💡 Connection Methods:</strong></div>
        <div>• <strong>Backend Proxy</strong> (Recommended): Flask server proxies requests to Databricks</div>
        <div>• <strong>Mock Data</strong> (Development): Generated sample data for UI testing</div>
        <div>• <strong>Direct Connection</strong> (Blocked): Browser → Databricks blocked by CORS</div>
      </div>
    </div>
  );
};

export default ConnectionTestPanel;