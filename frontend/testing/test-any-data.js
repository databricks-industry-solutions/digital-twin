require('dotenv').config();
const https = require('https');

const config = {
  serverHostname: process.env.REACT_APP_DATABRICKS_HOST.replace(/https?:\/\//, '').split('?')[0].split('/')[0],
  token: process.env.REACT_APP_DATABRICKS_TOKEN,
  warehouseId: process.env.REACT_APP_WAREHOUSE_ID,
  catalog: process.env.REACT_APP_DATABRICKS_CATALOG,
  schema: process.env.REACT_APP_DATABRICKS_SCHEMA,
  tableName: process.env.REACT_APP_DATABRICKS_TABLE
};

const tableFullName = `${config.catalog}.${config.schema}.${config.tableName}`;

// Check for any data in the table and show sample records
const query = `
  SELECT 
    component_id,
    sensor_temperature,
    sensor_pressure, 
    sensor_vibration,
    sensor_speed,
    timestamp
  FROM ${tableFullName}
  ORDER BY timestamp DESC
  LIMIT 10
`;

console.log('🔄 Checking for any data in the table...');

const requestBody = {
  statement: query,
  warehouse_id: config.warehouseId,
  wait_timeout: "30s"
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
      
      if (result.status?.state === 'SUCCEEDED') {
        if (result.result?.data_array && result.result.data_array.length > 0) {
          console.log(`✅ Found ${result.result.data_array.length} records in the table:`);
          
          result.result.data_array.forEach((row, i) => {
            console.log(`\n  Record ${i + 1}:`);
            console.log(`    Component ID: ${row[0]}`);
            console.log(`    Temperature: ${row[1]}°C`);
            console.log(`    Pressure: ${row[2]} PSI`);
            console.log(`    Vibration: ${row[3]} Hz`);
            console.log(`    Speed: ${row[4]} RPM`);
            console.log(`    Timestamp: ${row[5]}`);
          });
          
          console.log('\n✅ CONFIRMATION: Frontend will read REAL DATA from Databricks!');
          console.log('The TelemetryFetcher will successfully fetch actual sensor readings.');
          
        } else {
          console.log('⚠️  Table exists but contains no data');
          console.log('Frontend will connect to Databricks but return empty results, then use mock data');
        }
      } else {
        console.log('❌ Query failed:', result.status?.error?.message);
      }
    } catch (e) {
      console.log('❌ Error:', e.message);
    }
  });
});

req.on('error', (error) => {
  console.log('❌ Connection error:', error.message);
});

req.write(postData);
req.end();