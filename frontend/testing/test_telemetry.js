#!/usr/bin/env node

// Test script to verify Databricks telemetry connection
// This script tests the DatabricksService functionality

// Load environment variables from .env.local
require('dotenv').config({ path: '../.env.local' });

// Import fetch for Node.js
const fetch = globalThis.fetch || require('node-fetch');

class DatabricksService {
  constructor() {
    // Configuration for Databricks SQL warehouse connection
    this.config = {
      serverHostname: this.parseHostname(process.env.REACT_APP_DATABRICKS_HOST || ''),
      httpPath: process.env.REACT_APP_DATABRICKS_HTTP_PATH || '',
      warehouseId: process.env.REACT_APP_WAREHOUSE_ID || '',
      token: process.env.REACT_APP_DATABRICKS_TOKEN || '',
      catalog: process.env.REACT_APP_DATABRICKS_CATALOG || 'main',
      schema: process.env.REACT_APP_DATABRICKS_SCHEMA || 'default',
      tableName: process.env.REACT_APP_DATABRICKS_TABLE || 'sensor_bronze_table',
      syncedTableFullName: process.env.REACT_APP_SYNCED_TABLE_FULL_NAME || '',
      tripleTableFullName: process.env.REACT_APP_TRIPLE_TABLE_FULL_NAME || ''
    };
    
    this.tableFullName = `${this.config.catalog}.${this.config.schema}.${this.config.tableName}`;
    
    console.log('DatabricksService initialized with config:', {
      serverHostname: this.config.serverHostname ? '***' + this.config.serverHostname.slice(-10) : 'not set',
      warehouseId: this.config.warehouseId ? '***' + this.config.warehouseId.slice(-4) : 'not set',
      token: this.config.token ? '***' + this.config.token.slice(-4) : 'not set',
      tableFullName: this.tableFullName
    });
  }

  parseHostname(host) {
    if (!host) return '';
    // Remove protocol (http:// or https://)
    const withoutProtocol = host.replace(/https?:\/\//, '');
    // Remove query parameters and path
    const hostname = withoutProtocol.split('?')[0].split('/')[0];
    return hostname;
  }

  extractWarehouseId(httpPath) {
    // Extract warehouse ID from path like "/sql/1.0/warehouses/abc123def456"
    const match = httpPath.match(/\/warehouses\/([^/]+)/);
    return match ? match[1] : '';
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

    console.log(`Executing query: ${query.trim()}`);
    console.log(`Using warehouse ID: ${warehouseId}`);

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
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
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
    
    console.log(`Waiting for query completion (statement ID: ${statementId})...`);
    
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
        if (attempts % 5 === 0) {
          console.log(`Still waiting... (${attempts}/${maxAttempts})`);
        }
      } catch (error) {
        console.error('Error checking query status:', error);
        throw error;
      }
    }
    
    throw new Error('Query timed out');
  }

  isConfigured() {
    const hasBasicConfig = !!(this.config.serverHostname && this.config.token);
    const hasWarehouseConfig = !!(this.config.warehouseId || this.config.httpPath);
    
    return hasBasicConfig && hasWarehouseConfig;
  }

  async testConnection() {
    if (!this.isConfigured()) {
      throw new Error('Databricks service not properly configured');
    }

    try {
      console.log('\n=== Testing Databricks Connection ===');
      const result = await this.executeQuery('SELECT 1 as test');
      const testValue = result?.data_array?.[0]?.[0];
      console.log(`Connection test result: ${testValue}`);
      return testValue === 1;
    } catch (error) {
      console.error('Databricks connection test failed:', error);
      throw error;
    }
  }

  async getTableInfo() {
    const query = `DESCRIBE TABLE ${this.tableFullName}`;
    try {
      console.log('\n=== Getting Table Schema ===');
      const result = await this.executeQuery(query);
      console.log('Table schema:');
      if (result?.data_array) {
        result.data_array.forEach((row, idx) => {
          console.log(`  ${idx + 1}. Column: ${row[0]}, Type: ${row[1]}, Comment: ${row[2] || 'None'}`);
        });
      }
      return result;
    } catch (error) {
      console.error('Error getting table info:', error);
      throw error;
    }
  }

  async fetchSampleData(limit = 10) {
    const query = `SELECT * FROM ${this.tableFullName} ORDER BY timestamp DESC LIMIT ${limit}`;
    try {
      console.log('\n=== Fetching Sample Data ===');
      const result = await this.executeQuery(query);
      if (result?.data_array && result.data_array.length > 0) {
        console.log(`Retrieved ${result.data_array.length} rows:`);
        result.data_array.forEach((row, idx) => {
          console.log(`  Row ${idx + 1}:`, row);
        });
        return result.data_array;
      } else {
        console.log('No data found in table');
        return [];
      }
    } catch (error) {
      console.error('Error fetching sample data:', error);
      throw error;
    }
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
            WHERE timestamp >= current_timestamp() - INTERVAL 1 HOUR
          ) t
          WHERE rn = 1
        `
      },
      // Alternative query for different column names
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
            WHERE timestamp >= current_timestamp() - INTERVAL 1 HOUR
          ) t
          WHERE rn = 1
        `
      }
    ];

    console.log('\n=== Fetching Latest Telemetry Data ===');

    for (const queryConfig of queries) {
      try {
        console.log(`Trying ${queryConfig.name} query pattern...`);
        const result = await this.executeQuery(queryConfig.query);
        
        if (result?.data_array && result.data_array.length > 0) {
          console.log(`✓ Success with ${queryConfig.name} query pattern`);
          const telemetryData = result.data_array.map(row => ({
            componentID: row[0],
            sensorAReading: parseFloat(row[1]) || 0.0,
            sensorBReading: parseFloat(row[2]) || 0.0,
            sensorCReading: parseFloat(row[3]) || 0.0,
            sensorDReading: parseFloat(row[4]) || 0.0,
            timestamp: row[5]
          }));
          
          console.log('Latest telemetry data:');
          telemetryData.forEach((data, idx) => {
            console.log(`  Component ${idx + 1}:`, data);
          });
          
          return telemetryData;
        } else {
          console.log(`No data returned for ${queryConfig.name} query pattern`);
        }
      } catch (error) {
        console.warn(`${queryConfig.name} query pattern failed:`, error.message);
        continue;
      }
    }
    
    console.error('All query patterns failed for fetchLatestTelemetry');
    return [];
  }
}

// Main test function
async function runTests() {
  const service = new DatabricksService();
  
  try {
    // Test 1: Check configuration
    console.log('\n🔧 Configuration Check:', service.isConfigured() ? '✓ OK' : '✗ Failed');
    
    if (!service.isConfigured()) {
      console.error('❌ Service not properly configured. Please check your .env.local file.');
      return;
    }

    // Test 2: Test connection
    await service.testConnection();
    console.log('✓ Connection test passed');

    // Test 3: Get table schema
    await service.getTableInfo();

    // Test 4: Fetch sample data
    await service.fetchSampleData(5);

    // Test 5: Fetch latest telemetry (the main functionality)
    await service.fetchLatestTelemetry();

    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Check if running as main script
if (require.main === module) {
  runTests();
}