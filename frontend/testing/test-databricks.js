const https = require('https');
require('dotenv').config();

// Extract host from the URL
const hostUrl = process.env.REACT_APP_DATABRICKS_HOST || '';
const host = hostUrl.replace(/https?:\/\//, '').split('?')[0].split('/')[0];
const warehouseId = process.env.REACT_APP_WAREHOUSE_ID;
const token = process.env.REACT_APP_DATABRICKS_TOKEN;
const catalog = process.env.REACT_APP_DATABRICKS_CATALOG;
const schema = process.env.REACT_APP_DATABRICKS_SCHEMA;
const table = process.env.REACT_APP_DATABRICKS_TABLE;

console.log('Testing Databricks connection...');
console.log('Host:', host);
console.log('Warehouse ID:', warehouseId);
console.log('Token:', token ? '***configured***' : 'not set');
console.log('Table:', `${catalog}.${schema}.${table}`);

if (!host || !token || !warehouseId) {
  console.log('❌ Missing required configuration');
  process.exit(1);
}

// Simple connection test - SELECT 1
const testQuery = {
  statement: 'SELECT 1 as test',
  warehouse_id: warehouseId,
  wait_timeout: '10s'
};

const postData = JSON.stringify(testQuery);
const options = {
  hostname: host,
  port: 443,
  path: '/api/2.0/sql/statements/',
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('\n🔄 Testing connection...');

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      if (res.statusCode === 200) {
        if (result.status?.state === 'SUCCEEDED') {
          console.log('✅ Connection test successful!');
          console.log('Test result:', result.result?.data_array);
          
          // Now test the actual table
          testTable();
        } else if (result.status?.state === 'RUNNING') {
          console.log('🔄 Query is running... checking status...');
          checkQueryStatus(result.statement_id);
        } else {
          console.log('❌ Query failed:', result.status?.error?.message || 'Unknown error');
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
});

req.write(postData);
req.end();

// Function to test actual table access
function testTable() {
  console.log('\n🔄 Testing table access...');
  
  const tableQuery = {
    statement: `DESCRIBE TABLE ${catalog}.${schema}.${table}`,
    warehouse_id: warehouseId,
    wait_timeout: '15s'
  };
  
  const postData = JSON.stringify(tableQuery);
  const options = {
    hostname: host,
    port: 443,
    path: '/api/2.0/sql/statements/',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
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
        if (res.statusCode === 200 && result.status?.state === 'SUCCEEDED') {
          console.log('✅ Table access successful!');
          console.log('Table schema:');
          result.result?.data_array?.forEach(row => {
            console.log(`  - ${row[0]} (${row[1]})`);
          });
        } else {
          console.log('❌ Table access failed:', result.status?.error?.message || 'Unknown error');
          console.log('Make sure the table exists and you have permissions to access it.');
        }
      } catch (e) {
        console.log('❌ Parse error:', e.message);
      }
    });
  });
  
  req.on('error', (error) => {
    console.log('❌ Table test request error:', error.message);
  });
  
  req.write(postData);
  req.end();
}

function checkQueryStatus(statementId) {
  // Implementation would go here for polling query status
  console.log('Query status checking not implemented in this simple test');
}