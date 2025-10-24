// DatabricksService removed for security - use TelemetryService backend proxy instead
import TelemetryService from '../services/telemetryService';

export class TelemetryFetcher {
  constructor() {
    // Removed insecure DatabricksService - frontend should never connect directly to Databricks
    // this.databricksService = new DatabricksService(); // ⚠️ REMOVED FOR SECURITY

    this.telemetryService = new TelemetryService(); // ✅ Secure backend proxy
    this.mockData = this.generateMockTelemetryData();
    this.useBackend = true; // Always use backend proxy (secure)

    console.log('✅ TelemetryFetcher: Using secure backend telemetry service');
    console.log('   Backend URL: ' + (this.telemetryService.backendBaseUrl || 'http://localhost:8080'));
    console.log('   Security: All Databricks authentication handled server-side with OAuth');
  }

  // Removed testDatabricksConnection() - direct connections are insecure
  // Backend handles all Databricks authentication via OAuth

  generateMockTelemetryData() {
    // Use actual component IDs from RDF triples data for better compatibility
    const components = [
      '111', '112', '113', '122', '123', '131', '132', '133',
      '222', '223', '231', '232', '233', '322', '341', '342', '343',
      '411', '412', '413', '421', '422', '423'
    ];
    const data = [];

    const now = new Date();

    for (let i = 0; i < 100; i++) {
      const timestamp = new Date(now.getTime() - (i * 60000));

      components.forEach(componentID => {
        data.push({
          componentID,
          sensorAReading: -5 + Math.random() * 10,  // Temperature (normalized from triples)
          sensorBReading: -5 + Math.random() * 10,  // Pressure (normalized from triples)
          sensorCReading: -5 + Math.random() * 10,  // Vibration (normalized from triples)
          sensorDReading: -3 + Math.random() * 6,   // Speed (normalized from triples)
          timestamp: timestamp.toISOString()
        });
      });
    }

    return data;
  }

  async fetchLatestTelemetry(componentID) {
    // Always use secure backend proxy
    try {
      console.log(`📡 Fetching telemetry for component ${componentID} via backend proxy`);
      const result = await this.telemetryService.fetchLatestTelemetry();

      if (result.success && result.data && result.data.length > 0) {
        const componentData = result.data.find(data => data.componentID === componentID);
        if (componentData) {
          console.log(`✅ Found telemetry data for component ${componentID}`);
          return componentData;
        } else {
          console.warn(`⚠️  No data for component ${componentID}. Available: ${result.data.map(d => d.componentID).join(', ')}`);
          return null;
        }
      } else {
        console.warn('⚠️  Backend returned no telemetry data, using mock data');
        throw new Error('No telemetry data from backend');
      }
    } catch (error) {
      console.error('❌ Backend unavailable, using mock data:', error.message);
    }

    // Fallback to mock data if backend unavailable
    console.log(`🎭 Using mock data for component: ${componentID}`);
    await this.simulateDelay();

    const componentData = this.mockData
      .filter(data => data.componentID === componentID)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return componentData[0] || null;
  }

  async fetchHistoricalTelemetry(componentID, startTime, endTime) {
    // Use mock data for historical telemetry (backend endpoint for historical data can be added)
    console.log(`📊 Fetching historical telemetry for ${componentID} (${startTime} to ${endTime})`);
    await this.simulateDelay();

    const start = new Date(startTime);
    const end = new Date(endTime);

    return this.mockData
      .filter(data => {
        const dataTime = new Date(data.timestamp);
        return data.componentID === componentID &&
               dataTime >= start &&
               dataTime <= end;
      })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  async fetchAllLatestTelemetry() {
    // Always use secure backend proxy
    try {
      console.log('📡 Fetching all latest telemetry via backend proxy');
      const result = await this.telemetryService.fetchLatestTelemetry();

      if (result.success && result.data && result.data.length > 0) {
        console.log(`✅ Retrieved ${result.data.length} telemetry records from backend`);
        return result.data;
      } else {
        console.warn('⚠️  Backend returned no telemetry data, using mock data');
        throw new Error('No telemetry data from backend');
      }
    } catch (error) {
      console.error('❌ Backend unavailable, using mock data:', error.message);
    }

    // Fallback to mock data if backend unavailable
    console.log('🎭 Using mock data for all latest telemetry');
    await this.simulateDelay();

    const latest = {};

    this.mockData.forEach(data => {
      if (!latest[data.componentID] ||
          new Date(data.timestamp) > new Date(latest[data.componentID].timestamp)) {
        latest[data.componentID] = data;
      }
    });

    return Object.values(latest);
  }

  async fetchTelemetryByTimeRange(startTime, endTime) {
    // Use mock data for time range queries (backend endpoint can be added)
    console.log(`📊 Fetching telemetry by time range (${startTime} to ${endTime})`);
    await this.simulateDelay();

    const start = new Date(startTime);
    const end = new Date(endTime);

    return this.mockData
      .filter(data => {
        const dataTime = new Date(data.timestamp);
        return dataTime >= start && dataTime <= end;
      })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  simulateDelay() {
    return new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 100));
  }

  getSensorDefinitions() {
    return {
      sensorAReading: { label: 'Temperature', unit: '°C', min: 0, max: 120 },
      sensorBReading: { label: 'Pressure', unit: 'PSI', min: 0, max: 80 },
      sensorCReading: { label: 'Vibration', unit: 'Hz', min: 0, max: 150 },
      sensorDReading: { label: 'Speed', unit: 'RPM', min: 0, max: 90 }
    };
  }

  getHealthThresholds() {
    return {
      sensorAReading: { warning: 90, critical: 100 },
      sensorBReading: { warning: 60, critical: 70 },
      sensorCReading: { warning: 120, critical: 140 },
      sensorDReading: { warning: 75, critical: 85 }
    };
  }

  analyzeSensorHealth(sensorValue, sensorType) {
    const thresholds = this.getHealthThresholds()[sensorType];
    if (!thresholds) return 'unknown';
    
    if (sensorValue >= thresholds.critical) return 'critical';
    if (sensorValue >= thresholds.warning) return 'warning';
    return 'healthy';
  }

  getComponentHealth(telemetryData) {
    if (!telemetryData) return 'unknown';
    
    const sensors = ['sensorAReading', 'sensorBReading', 'sensorCReading', 'sensorDReading'];
    const healthLevels = sensors.map(sensor => 
      this.analyzeSensorHealth(telemetryData[sensor], sensor)
    );
    
    if (healthLevels.includes('critical')) return 'critical';
    if (healthLevels.includes('warning')) return 'warning';
    return 'healthy';
  }
}