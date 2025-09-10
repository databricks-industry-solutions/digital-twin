class DatabricksService {
  constructor() {
    // Configuration for Databricks SQL warehouse connection
    this.config = {
      serverHostname: process.env.REACT_APP_DATABRICKS_HOST || '',
      httpPath: process.env.REACT_APP_DATABRICKS_HTTP_PATH || '',
      warehouseId: process.env.REACT_APP_WAREHOUSE_ID || '',
      token: process.env.REACT_APP_DATABRICKS_TOKEN || '',
      catalog: process.env.REACT_APP_DATABRICKS_CATALOG || 'main',
      schema: process.env.REACT_APP_DATABRICKS_SCHEMA || 'default',
      tableName: process.env.REACT_APP_DATABRICKS_TABLE || 'sensor_bronze_table',
      // Additional table for synced data (like serving-app)
      syncedTableFullName: process.env.REACT_APP_SYNCED_TABLE_FULL_NAME || '',
      tripleTableFullName: process.env.REACT_APP_TRIPLE_TABLE_FULL_NAME || ''
    };
    
    this.tableFullName = `${this.config.catalog}.${this.config.schema}.${this.config.tableName}`;
    
    console.log('DatabricksService initialized with config:', {
      serverHostname: this.config.serverHostname ? '***' : 'not set',
      warehouseId: this.config.warehouseId ? '***' : 'not set',
      token: this.config.token ? '***' : 'not set',
      tableFullName: this.tableFullName
    });
  }

  async executeQuery(query) {
    const url = `https://${this.config.serverHostname}/api/2.0/sql/statements/`;
    
    const warehouseId = this.config.warehouseId || this.extractWarehouseId(this.config.httpPath);
    
    if (!warehouseId) {
      throw new Error('Warehouse ID not configured. Set REACT_APP_WAREHOUSE_ID or REACT_APP_DATABRICKS_HTTP_PATH');
    }

    const requestBody = {
      statement: query,
      warehouse_id: warehouseId,
      wait_timeout: "30s",
      on_wait_timeout: "CONTINUE"
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.status?.state === 'SUCCEEDED') {
        return result.result;
      } else if (result.status?.state === 'FAILED') {
        throw new Error(result.status.error?.message || 'Query failed');
      } else {
        // Query is still running, wait for completion
        return await this.waitForCompletion(result.statement_id);
      }
    } catch (error) {
      console.error('Error executing Databricks query:', error);
      throw error;
    }
  }

  async waitForCompletion(statementId) {
    const url = `https://${this.config.serverHostname}/api/2.0/sql/statements/${statementId}`;
    
    let attempts = 0;
    const maxAttempts = 30;
    
    while (attempts < maxAttempts) {
      try {
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${this.config.token}`
          }
        });

        const result = await response.json();
        
        if (result.status?.state === 'SUCCEEDED') {
          return result.result;
        } else if (result.status?.state === 'FAILED') {
          throw new Error(result.status.error?.message || 'Query failed');
        }
        
        // Wait 1 second before checking again
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      } catch (error) {
        console.error('Error checking query status:', error);
        throw error;
      }
    }
    
    throw new Error('Query timed out');
  }

  extractWarehouseId(httpPath) {
    // Extract warehouse ID from path like "/sql/1.0/warehouses/abc123def456"
    const match = httpPath.match(/\/warehouses\/([^/]+)/);
    return match ? match[1] : '';
  }

  async fetchLatestTelemetry() {
    // Try multiple query patterns to match different table schemas
    const queries = [
      // Original query for sensor_bronze_table
      {
        name: 'bronze_table',
        query: `
          SELECT 
            component_id,
            sensor_temperature as sensorAReading,
            sensor_pressure as sensorBReading, 
            sensor_vibration as sensorCReading,
            sensor_speed as sensorDReading,
            timestamp
          FROM (
            SELECT *,
                   ROW_NUMBER() OVER (PARTITION BY component_id ORDER BY timestamp DESC) as rn
            FROM ${this.tableFullName}
            WHERE timestamp >= date_sub(current_timestamp(), INTERVAL 1 HOUR)
          ) t
          WHERE rn = 1
        `
      },
      // Alternative query for different column names (matching serving-app pattern)
      {
        name: 'alternative_schema',
        query: `
          SELECT 
            componentID,
            sensorAReading,
            sensorBReading,
            sensorCReading,
            sensorDReading,
            timestamp
          FROM (
            SELECT *,
                   ROW_NUMBER() OVER (PARTITION BY componentID ORDER BY timestamp DESC) as rn
            FROM ${this.tableFullName}
            WHERE timestamp >= date_sub(current_timestamp(), INTERVAL 1 HOUR)
          ) t
          WHERE rn = 1
        `
      }
    ];

    for (const queryConfig of queries) {
      try {
        console.log(`Trying ${queryConfig.name} query pattern...`);
        const result = await this.executeQuery(queryConfig.query);
        
        if (result?.data_array && result.data_array.length > 0) {
          console.log(`Success with ${queryConfig.name} query pattern`);
          return result.data_array.map(row => ({
            componentID: row[0],
            sensorAReading: parseFloat(row[1]) || 0.0,
            sensorBReading: parseFloat(row[2]) || 0.0,
            sensorCReading: parseFloat(row[3]) || 0.0,
            sensorDReading: parseFloat(row[4]) || 0.0,
            timestamp: row[5]
          }));
        }
      } catch (error) {
        console.warn(`${queryConfig.name} query pattern failed:`, error.message);
        continue;
      }
    }
    
    console.error('All query patterns failed for fetchLatestTelemetry');
    return [];
  }

  async fetchComponentTelemetry(componentId, hoursBack = 24) {
    const query = `
      SELECT 
        component_id,
        sensor_temperature as sensorAReading,
        sensor_pressure as sensorBReading,
        sensor_vibration as sensorCReading,
        sensor_speed as sensorDReading,
        timestamp
      FROM ${this.tableFullName}
      WHERE component_id = '${componentId}'
      AND timestamp >= date_sub(current_timestamp(), INTERVAL ${hoursBack} HOUR)
      ORDER BY timestamp DESC
      LIMIT 1000
    `;

    try {
      const result = await this.executeQuery(query);
      
      if (result?.data_array) {
        return result.data_array.map(row => ({
          componentID: row[0],
          sensorAReading: parseFloat(row[1]) || 0.0,
          sensorBReading: parseFloat(row[2]) || 0.0,
          sensorCReading: parseFloat(row[3]) || 0.0,
          sensorDReading: parseFloat(row[4]) || 0.0,
          timestamp: row[5]
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching component telemetry:', error);
      return [];
    }
  }

  async fetchTelemetryByTimeRange(startTime, endTime) {
    const query = `
      SELECT 
        component_id,
        sensor_temperature as sensorAReading,
        sensor_pressure as sensorBReading,
        sensor_vibration as sensorCReading,
        sensor_speed as sensorDReading,
        timestamp
      FROM ${this.tableFullName}
      WHERE timestamp >= '${startTime}'
      AND timestamp <= '${endTime}'
      ORDER BY timestamp DESC
      LIMIT 10000
    `;

    try {
      const result = await this.executeQuery(query);
      
      if (result?.data_array) {
        return result.data_array.map(row => ({
          componentID: row[0],
          sensorAReading: parseFloat(row[1]) || 0.0,
          sensorBReading: parseFloat(row[2]) || 0.0,
          sensorCReading: parseFloat(row[3]) || 0.0,
          sensorDReading: parseFloat(row[4]) || 0.0,
          timestamp: row[5]
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching telemetry by time range:', error);
      return [];
    }
  }

  isConfigured() {
    const hasBasicConfig = !!(this.config.serverHostname && this.config.token);
    const hasWarehouseConfig = !!(this.config.warehouseId || this.config.httpPath);
    
    const isConfigured = hasBasicConfig && hasWarehouseConfig;
    
    if (!isConfigured) {
      console.log('DatabricksService configuration check:', {
        serverHostname: !!this.config.serverHostname,
        token: !!this.config.token,
        warehouseId: !!this.config.warehouseId,
        httpPath: !!this.config.httpPath,
        isConfigured
      });
    }
    
    return isConfigured;
  }

  // New method to test connection and validate configuration
  async testConnection() {
    if (!this.isConfigured()) {
      throw new Error('Databricks service not properly configured');
    }

    try {
      // Simple test query
      const result = await this.executeQuery('SELECT 1 as test');
      return result?.data_array?.[0]?.[0] === 1;
    } catch (error) {
      console.error('Databricks connection test failed:', error);
      throw error;
    }
  }

  // Method to get table schema info for debugging
  async getTableInfo() {
    const query = `DESCRIBE TABLE ${this.tableFullName}`;
    try {
      const result = await this.executeQuery(query);
      console.log('Table schema:', result);
      return result;
    } catch (error) {
      console.error('Error getting table info:', error);
      throw error;
    }
  }
}

export default DatabricksService;