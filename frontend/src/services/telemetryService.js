class TelemetryService {
  constructor() {
    this.backendBaseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8080';

  }

  async testConnection() {
    try {
      console.log('🔄 Testing Databricks connection via backend...');
      const response = await fetch(`${this.backendBaseUrl}/api/telemetry/test`);
      
      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ Backend connection test result:', result);
      
      return {
        success: result.status === 'connected',
        message: result.message,
        method: 'backend-proxy'
      };
      
    } catch (error) {
      console.error('❌ Backend connection test failed:', error);
      
      if (error.message.includes('Failed to fetch')) {
        return {
          success: false,
          message: 'Backend server not available. Start Flask server on port 8080.',
          method: 'backend-proxy',
          error: 'backend-unavailable'
        };
      }
      
      return {
        success: false,
        message: error.message,
        method: 'backend-proxy',
        error: 'connection-failed'
      };
    }
  }

  async fetchLatestTelemetry() {
    try {
      console.log('🧬 Fetching latest telemetry from RDF triples via backend...');

      // Try RDF triples endpoint first (preferred for semantic data)
      try {
        const triplesResponse = await fetch(`${this.backendBaseUrl}/api/telemetry/triples`);
        if (triplesResponse.ok) {
          const triplesResult = await triplesResponse.json();
          if (triplesResult.success !== false && triplesResult.data && triplesResult.data.length > 0) {
            console.log(`✅ Retrieved ${triplesResult.count} telemetry records from RDF triples (${triplesResult.table})`);
            return {
              success: true,
              data: triplesResult.data,
              count: triplesResult.count,
              table: triplesResult.table,
              method: 'rdf-triples-backend',
              source: triplesResult.source
            };
          }
        }
      } catch (triplesError) {
        console.warn('⚠️ RDF triples endpoint failed, trying bronze table:', triplesError.message);
      }

      // Fallback to bronze table telemetry
      console.log('📊 Falling back to bronze table telemetry...');
      const response = await fetch(`${this.backendBaseUrl}/api/telemetry/latest`);

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }

      const result = await response.json();
      console.log(`✅ Retrieved ${result.count} telemetry records from bronze table (${result.table})`);

      return {
        success: true,
        data: result.data,
        count: result.count,
        table: result.table,
        method: 'backend-proxy'
      };

    } catch (error) {
      console.error('❌ Failed to fetch telemetry via backend:', error);

      return {
        success: false,
        error: error.message,
        method: 'backend-proxy',
        fallback: 'mock-data'
      };
    }
  }

  // Browser-based validation methods
  validateConfiguration() {
    const config = {
      hasBackendUrl: !!this.backendBaseUrl,
      backendUrl: this.backendBaseUrl,
      securityMode: 'backend-proxy',

      // Note: Frontend no longer uses direct Databricks configuration
      // All authentication handled securely by backend via OAuth
      // REACT_APP_DATABRICKS_TOKEN removed for security (never put tokens in frontend!)

      // Table configuration (informational only, not used for direct connection)
      catalog: process.env.REACT_APP_DATABRICKS_CATALOG || 'main',
      schema: process.env.REACT_APP_DATABRICKS_SCHEMA || 'deba',
      table: process.env.REACT_APP_DATABRICKS_TABLE || 'bronze'
    };

    console.log('✅ Configuration validation (secure backend proxy):', config);
    return config;
  }

  async testBackendAvailability() {
    try {
      console.log('🏥 Testing backend health...');

      const response = await fetch(`${this.backendBaseUrl}/api/telemetry/test`, {
        method: 'GET',
        timeout: 5000
      });

      if (response.ok) {
        const result = await response.json();
        return {
          available: true,
          status: result.status || 'connected',
          method: 'backend-health-check'
        };
      }

      return {
        available: false,
        status: response.status,
        error: `HTTP ${response.status}`,
        method: 'backend-health-check'
      };

    } catch (error) {
      return {
        available: false,
        error: error.message,
        method: 'backend-health-check'
      };
    }
  }

  // Generate mock data as fallback
  generateMockTelemetry() {
    const components = ['111', '112', '113', '121', '122', '123'];
    const mockData = components.map(componentID => ({
      componentID,
      sensorAReading: 20 + Math.random() * 60, // Temperature 20-80°C
      sensorBReading: 1 + Math.random() * 4,   // Pressure 1-5 bar
      sensorCReading: Math.random() * 10,      // Vibration 0-10 mm/s
      sensorDReading: 1000 + Math.random() * 2000, // Speed 1000-3000 RPM
      timestamp: new Date().toISOString()
    }));
    
    console.log('🎭 Generated mock telemetry data for demonstration');
    return {
      success: true,
      data: mockData,
      count: mockData.length,
      method: 'mock-data'
    };
  }

  // Comprehensive connection testing
  async runConnectionTests() {
    console.log('🧪 Running comprehensive connection tests...');
    
    const results = {
      timestamp: new Date().toISOString(),
      tests: {}
    };
    
    // Test 1: Configuration validation
    results.tests.configuration = this.validateConfiguration();
    
    // Test 2: Backend availability
    results.tests.backendHealth = await this.testBackendAvailability();
    
    // Test 3: Databricks connection (via backend)
    if (results.tests.backendHealth.available) {
      results.tests.databricksConnection = await this.testConnection();
      
      // Test 4: Data fetching (if connection works)
      if (results.tests.databricksConnection.success) {
        results.tests.dataFetch = await this.fetchLatestTelemetry();
      } else {
        results.tests.dataFetch = {
          skipped: true,
          reason: 'Databricks connection failed'
        };
      }
    } else {
      results.tests.databricksConnection = {
        skipped: true,
        reason: 'Backend not available'
      };
      results.tests.dataFetch = {
        skipped: true,
        reason: 'Backend not available'
      };
    }
    
    // Test 5: Fallback to mock data
    results.tests.mockDataFallback = this.generateMockTelemetry();
    
    // Summary
    results.summary = {
      configurationValid: results.tests.configuration.hasBackendUrl,
      backendAvailable: results.tests.backendHealth.available,
      databricksConnected: results.tests.databricksConnection.success || false,
      dataAvailable: results.tests.dataFetch.success || results.tests.mockDataFallback.success,
      recommendedApproach: this.getRecommendedApproach(results.tests)
    };
    
    console.log('📋 Connection test results:', results.summary);
    return results;
  }
  
  getRecommendedApproach(tests) {
    if (tests.backendHealth.available && tests.databricksConnection?.success) {
      return 'backend-proxy';
    } else if (tests.backendHealth.available) {
      return 'backend-proxy-with-mock-data';
    } else {
      return 'frontend-mock-data-only';
    }
  }
}

export default TelemetryService;