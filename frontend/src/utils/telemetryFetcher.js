import DatabricksService from '../services/databricksService';

export class TelemetryFetcher {
  constructor() {
    this.databricksService = new DatabricksService();
    this.mockData = this.generateMockTelemetryData();
    this.useDatabricks = this.databricksService.isConfigured();
    this.connectionTested = false;
    
    if (this.useDatabricks) {
      console.log('TelemetryFetcher: Databricks configured, will test connection on first use');
      this.testDatabricksConnection();
    } else {
      console.log('TelemetryFetcher: Using mock data (Databricks not configured)');
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
      console.log('Falling back to mock data');
      this.useDatabricks = false;
    }
  }

  generateMockTelemetryData() {
    const components = ['component11', 'component12', 'component21', 'component22'];
    const data = [];
    
    const now = new Date();
    
    for (let i = 0; i < 100; i++) {
      const timestamp = new Date(now.getTime() - (i * 60000));
      
      components.forEach(componentID => {
        data.push({
          componentID,
          sensorAReading: Math.random() * 120,
          sensorBReading: Math.random() * 80,
          sensorCReading: Math.random() * 150,
          sensorDReading: Math.random() * 90,
          timestamp: timestamp.toISOString()
        });
      });
    }
    
    return data;
  }

  async fetchLatestTelemetry(componentID) {
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
    
    console.log(`Using mock data for component: ${componentID}`);
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
    if (this.useDatabricks) {
      try {
        await this.testDatabricksConnection();
        
        console.log('Fetching all latest telemetry from Databricks');
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
    
    console.log('Using mock data for all latest telemetry');
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