import DatabricksService from '../services/databricksService';
import TelemetryService from '../services/telemetryService';

export class TelemetryFetcher {
  constructor() {
    this.databricksService = new DatabricksService();
    this.telemetryService = new TelemetryService();
    this.mockData = this.generateMockTelemetryData();
    this.useBackend = true; // Prefer backend proxy over direct Databricks connection
    this.useDatabricks = this.databricksService.isConfigured();
    this.connectionTested = false;

    if (this.useBackend) {
      console.log('TelemetryFetcher: Using backend telemetry service (recommended)');
    } else if (this.useDatabricks) {
      console.log('TelemetryFetcher: Databricks configured, will test connection on first data fetch');
    } else {
      console.log('TelemetryFetcher: Using mock data (backend and Databricks not configured)');
    }
  }

  async testDatabricksConnection() {
    if (this.connectionTested) return;
    
    try {
      console.log('Testing Databricks connection...');
      const isConnected = await this.databricksService.testConnection();
      if (isConnected) {
        console.log('✅ Databricks connection successful');
        // Try to get table schema for debugging
        try {
          await this.databricksService.getTableInfo();
        } catch (schemaError) {
          console.warn('Could not fetch table schema (table may not exist yet):', schemaError.message);
        }
      }
      this.connectionTested = true;
    } catch (error) {
      console.error('❌ Databricks connection failed:', error.message);
      if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
        console.log('⚠️  CORS Error: Browser cannot make direct requests to Databricks. This is expected in development.');
        console.log('ℹ️  Using mock data for demonstration. In production, use a backend proxy.');
      }
      console.log('Falling back to mock data');
      this.useDatabricks = false;
      this.connectionTested = true; // Mark as tested to avoid repeated attempts
    }
  }

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
    // Try backend service first (recommended approach)
    if (this.useBackend) {
      try {
        console.log(`TelemetryFetcher: Fetching telemetry for component ${componentID} from backend`);
        const result = await this.telemetryService.fetchLatestTelemetry();

        if (result.success && result.data && result.data.length > 0) {
          const componentData = result.data.find(data => data.componentID === componentID);
          if (componentData) {
            console.log(`✅ Found telemetry data for component ${componentID}:`, componentData);
            return componentData;
          } else {
            console.warn(`⚠️  No telemetry data found for component ${componentID}. Available components:`,
                        result.data.map(d => d.componentID));
            return null;
          }
        } else {
          console.warn('⚠️  Backend returned no telemetry data, trying direct Databricks connection');
          throw new Error('No telemetry data from backend');
        }
      } catch (error) {
        console.error('❌ Backend telemetry fetch failed:', error.message);
        console.log('Falling back to direct Databricks connection...');
        this.useBackend = false; // Fallback to direct connection
      }
    }

    // Fallback to direct Databricks connection
    if (this.useDatabricks) {
      try {
        await this.testDatabricksConnection();

        console.log(`Fetching latest telemetry for component: ${componentID}`);
        const allTelemetry = await this.databricksService.fetchLatestTelemetry();

        if (allTelemetry.length > 0) {
          console.log(`Received ${allTelemetry.length} telemetry records from Databricks`);
          const componentData = allTelemetry.find(data => data.componentID === componentID);
          if (componentData) {
            console.log(`Found telemetry data for ${componentID}:`, componentData);
            return componentData;
          } else {
            console.warn(`No telemetry data found for component ${componentID}. Available components:`,
                        allTelemetry.map(d => d.componentID));
            return null;
          }
        } else {
          console.warn('No telemetry data returned from Databricks');
          throw new Error('No telemetry data available');
        }
      } catch (error) {
        console.error('Error fetching from Databricks, falling back to mock data:', error.message);
        this.useDatabricks = false; // Disable for this session
      }
    }

    console.log(`🎭 Using mock data for component: ${componentID}`);
    await this.simulateDelay();

    const componentData = this.mockData
      .filter(data => data.componentID === componentID)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return componentData[0] || null;
  }

  async fetchHistoricalTelemetry(componentID, startTime, endTime) {
    if (this.useDatabricks) {
      try {
        // For historical data, we can use the time range function
        const telemetryData = await this.databricksService.fetchTelemetryByTimeRange(startTime, endTime);
        return telemetryData
          .filter(data => data.componentID === componentID)
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      } catch (error) {
        console.error('Error fetching historical data from Databricks, falling back to mock data:', error);
        // Fall back to mock data
      }
    }
    
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
    // Try backend service first (recommended approach)
    if (this.useBackend) {
      try {
        console.log('TelemetryFetcher: Fetching telemetry from backend service');
        const result = await this.telemetryService.fetchLatestTelemetry();

        if (result.success && result.data && result.data.length > 0) {
          console.log(`✅ Retrieved ${result.data.length} telemetry records from backend`);
          return result.data;
        } else {
          console.warn('⚠️  Backend returned no telemetry data, trying direct Databricks connection');
          throw new Error('No telemetry data from backend');
        }
      } catch (error) {
        console.error('❌ Backend telemetry fetch failed:', error.message);
        console.log('Falling back to direct Databricks connection...');
        this.useBackend = false; // Fallback to direct connection
      }
    }

    // Fallback to direct Databricks connection
    if (this.useDatabricks) {
      try {
        await this.testDatabricksConnection();

        console.log('Fetching all latest telemetry from Databricks directly');
        const result = await this.databricksService.fetchLatestTelemetry();

        if (result.length > 0) {
          console.log(`Received telemetry data for ${result.length} components from Databricks`);
          return result;
        } else {
          console.warn('No telemetry data returned from Databricks');
          throw new Error('No telemetry data available');
        }
      } catch (error) {
        console.error('Error fetching all telemetry from Databricks, falling back to mock data:', error.message);
        this.useDatabricks = false; // Disable for this session
      }
    }

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
    if (this.useDatabricks) {
      try {
        return await this.databricksService.fetchTelemetryByTimeRange(startTime, endTime);
      } catch (error) {
        console.error('Error fetching telemetry by time range from Databricks, falling back to mock data:', error);
        // Fall back to mock data
      }
    }
    
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