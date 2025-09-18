require('dotenv').config({ path: '.env.local' });
const https = require('https');

// Configuration matching DatabricksService
const config = {
  serverHostname: process.env.REACT_APP_DATABRICKS_HOST ? process.env.REACT_APP_DATABRICKS_HOST.replace(/https?:\/\//, '').split('?')[0].split('/')[0] : '',
  token: process.env.REACT_APP_DATABRICKS_TOKEN || '',
  warehouseId: process.env.REACT_APP_WAREHOUSE_ID || '',
  catalog: process.env.REACT_APP_DATABRICKS_CATALOG || 'main',
  schema: process.env.REACT_APP_DATABRICKS_SCHEMA || 'default',
  tableName: process.env.REACT_APP_DATABRICKS_TABLE || 'bronze'
};

// Validate configuration before proceeding
if (!config.serverHostname || !config.token || !config.warehouseId) {
  console.log('❌ Missing required environment variables:');
  console.log('- REACT_APP_DATABRICKS_HOST:', config.serverHostname || 'MISSING');
  console.log('- REACT_APP_DATABRICKS_TOKEN:', config.token ? 'SET' : 'MISSING');
  console.log('- REACT_APP_WAREHOUSE_ID:', config.warehouseId || 'MISSING');
  console.log('\nPlease check your .env.local file configuration.');
  process.exit(1);
}

const tableFullName = `${config.catalog}.${config.schema}.${config.tableName}`;

console.log('Testing Telemetry Data Fetching...');
console.log('Table:', tableFullName);

// Test the exact query that DatabricksService.fetchLatestTelemetry() uses (fixed for Databricks SQL)
const query = `
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
    FROM ${tableFullName}
    WHERE timestamp >= current_timestamp() - INTERVAL 1 HOUR
  ) t
  WHERE rn = 1
`;

console.log('\n🔄 Fetching latest telemetry data...');

const requestBody = {
  statement: query,
  warehouse_id: config.warehouseId,
  wait_timeout: "30s",
  on_wait_timeout: "CONTINUE"
};

const postData = JSON.stringify(requestBody);
const options = {
  hostname: config.serverHostname,
  port: 443,
  path: '/api/2.0/sql/statements/',
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${config.token}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      
      if (res.statusCode === 200) {
        if (result.status?.state === 'SUCCEEDED') {
          console.log('✅ Telemetry fetch successful!');
          
          if (result.result?.data_array && result.result.data_array.length > 0) {
            console.log(`📊 Found ${result.result.data_array.length} component(s) with recent data:`);
            
            result.result.data_array.forEach((row, i) => {
              const telemetryData = {
                componentID: row[0],
                sensorAReading: parseFloat(row[1]) || 0.0,
                sensorBReading: parseFloat(row[2]) || 0.0,  
                sensorCReading: parseFloat(row[3]) || 0.0,
                sensorDReading: parseFloat(row[4]) || 0.0,
                timestamp: row[5]
              };
              
              console.log(`\n  Component ${i + 1}: ${telemetryData.componentID}`);
              console.log(`    Temperature: ${telemetryData.sensorAReading.toFixed(2)}°C`);
              console.log(`    Pressure: ${telemetryData.sensorBReading.toFixed(2)} PSI`);
              console.log(`    Vibration: ${telemetryData.sensorCReading.toFixed(2)} Hz`);
              console.log(`    Speed: ${telemetryData.sensorDReading.toFixed(2)} RPM`);
              console.log(`    Timestamp: ${telemetryData.timestamp}`);
            });
            
            console.log('\n✅ REAL DATA CONFIRMED: Frontend will receive actual sensor readings from Databricks!');
          } else {
            console.log('⚠️  No recent telemetry data found (within last hour)');
            console.log('This means frontend will use real Databricks connection but may not find data');
          }
        } else if (result.status?.state === 'RUNNING') {
          console.log('🔄 Query is still running...');
        } else {
          console.log('❌ Query failed:', result.status?.error?.message || result.status?.state);
        }
      } else {
        console.log('❌ HTTP Error:', res.statusCode);
        console.log('Response:', data.substring(0, 500));
      }
    } catch (e) {
      console.log('❌ Parse error:', e.message);
      console.log('Raw response:', data.substring(0, 500));
    }
  });
});

req.on('error', (error) => {
  console.log('❌ Request error:', error.message);
  console.log('Frontend would fall back to mock data in this case.');
});

req.write(postData);
req.end();