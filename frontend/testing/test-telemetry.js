require('dotenv').config({ path: '.env.local' });

// Import and test TelemetryFetcher behavior
console.log('Testing TelemetryFetcher configuration...\n');

// Mock process.env for the modules
const mockEnv = {
  REACT_APP_DATABRICKS_HOST: process.env.REACT_APP_DATABRICKS_HOST,
  REACT_APP_DATABRICKS_TOKEN: process.env.REACT_APP_DATABRICKS_TOKEN,
  REACT_APP_WAREHOUSE_ID: process.env.REACT_APP_WAREHOUSE_ID,
  REACT_APP_DATABRICKS_HTTP_PATH: process.env.REACT_APP_DATABRICKS_HTTP_PATH,
  REACT_APP_DATABRICKS_CATALOG: process.env.REACT_APP_DATABRICKS_CATALOG,
  REACT_APP_DATABRICKS_SCHEMA: process.env.REACT_APP_DATABRICKS_SCHEMA,
  REACT_APP_DATABRICKS_TABLE: process.env.REACT_APP_DATABRICKS_TABLE
};

// Simulate DatabricksService configuration check
const config = {
  serverHostname: mockEnv.REACT_APP_DATABRICKS_HOST ? mockEnv.REACT_APP_DATABRICKS_HOST.replace(/https?:\/\//, '').split('?')[0].split('/')[0] : '',
  token: mockEnv.REACT_APP_DATABRICKS_TOKEN || '',
  warehouseId: mockEnv.REACT_APP_WAREHOUSE_ID || '',
  httpPath: mockEnv.REACT_APP_DATABRICKS_HTTP_PATH || ''
};

const hasBasicConfig = !!(config.serverHostname && config.token);
const hasWarehouseConfig = !!(config.warehouseId || config.httpPath);
const isConfigured = hasBasicConfig && hasWarehouseConfig;

console.log('DatabricksService Configuration Check:');
console.log('- serverHostname:', config.serverHostname || 'not set');
console.log('- token:', config.token ? '***configured***' : 'not set'); 
console.log('- warehouseId:', config.warehouseId || 'not set');
console.log('- httpPath:', config.httpPath || 'not set');
console.log('- hasBasicConfig:', hasBasicConfig);
console.log('- hasWarehouseConfig:', hasWarehouseConfig);
console.log('- isConfigured:', isConfigured);

console.log('\nTelemetryFetcher Decision:');
if (isConfigured) {
  console.log('✅ TelemetryFetcher will use DATABRICKS data');
  console.log('- Will test connection on first use');
  console.log('- Will fall back to mock data only on connection failure');
} else {
  console.log('❌ TelemetryFetcher will use MOCK data');
  console.log('- Missing configuration detected');
}

console.log('\nTable Configuration:');
console.log('- Catalog:', mockEnv.REACT_APP_DATABRICKS_CATALOG || 'main');
console.log('- Schema:', mockEnv.REACT_APP_DATABRICKS_SCHEMA || 'default');
console.log('- Table:', mockEnv.REACT_APP_DATABRICKS_TABLE || 'sensor_bronze_table');
console.log('- Full table name:', 
  `${mockEnv.REACT_APP_DATABRICKS_CATALOG || 'main'}.${mockEnv.REACT_APP_DATABRICKS_SCHEMA || 'default'}.${mockEnv.REACT_APP_DATABRICKS_TABLE || 'sensor_bronze_table'}`
);