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

console.log('🔍 Detailed Connection Test\n');
console.log('Configuration:');
console.log('- Server:', config.serverHostname || 'MISSING');
console.log('- Token:', config.token ? `${config.token.substring(0, 8)}...` : 'MISSING');
console.log('- Warehouse ID:', config.warehouseId || 'MISSING');
console.log('- Table:', `${config.catalog}.${config.schema}.${config.tableName}`);

if (!config.serverHostname || !config.token || !config.warehouseId) {
  console.log('\n❌ Missing required configuration');
  process.exit(1);
}

// Test 1: Simple connection test
console.log('\n🧪 Test 1: Basic Connection Test');
const testQuery = 'SELECT 1 as test';

const requestBody = {
  statement: testQuery,
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
    console.log(`Response status: ${res.statusCode}`);
    
    if (res.statusCode !== 200) {
      console.log('❌ HTTP Error:', res.statusCode);
      console.log('Headers:', JSON.stringify(res.headers, null, 2));
      console.log('Response body (first 1000 chars):', data.substring(0, 1000));
      return;
    }

    try {
      const result = JSON.parse(data);
      console.log('✅ Successfully connected to Databricks!');
      console.log('Query state:', result.status?.state || 'unknown');
      
      if (result.status?.state === 'SUCCEEDED') {
        console.log('Query result:', result.result?.data_array?.[0]?.[0]);
        console.log('🎉 Connection test PASSED!');
        
        // Test 2: Warehouse validation
        console.log('\n🧪 Test 2: Warehouse Information');
        testWarehouseInfo();
      } else if (result.status?.state === 'FAILED') {
        console.log('❌ Query failed:', result.status?.error?.message || 'Unknown error');
      } else {
        console.log('⏳ Query still running, state:', result.status?.state);
      }
    } catch (e) {
      console.log('❌ Failed to parse response:', e.message);
      console.log('Raw response (first 1000 chars):', data.substring(0, 1000));
    }
  });
});

req.on('error', (error) => {
  console.log('❌ Connection error:', error.message);
  console.log('Error details:', error);
  
  if (error.code === 'ENOTFOUND') {
    console.log('\n💡 Troubleshooting tips:');
    console.log('1. Check REACT_APP_DATABRICKS_HOST format');
    console.log('2. Ensure hostname is correct (no protocol, no path)');
    console.log('3. Verify network connectivity');
  }
});

req.write(postData);
req.end();

// Test warehouse info
function testWarehouseInfo() {
  const warehouseOptions = {
    hostname: config.serverHostname,
    port: 443,
    path: `/api/2.0/sql/warehouses/${config.warehouseId}`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${config.token}`,
      'Content-Type': 'application/json'
    }
  };

  const warehouseReq = https.request(warehouseOptions, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      if (res.statusCode === 200) {
        try {
          const warehouse = JSON.parse(data);
          console.log('✅ Warehouse found:', warehouse.name || 'Unnamed');
          console.log('State:', warehouse.state);
          console.log('Size:', warehouse.cluster_size);
          
          // Test 3: Table existence
          console.log('\n🧪 Test 3: Table Existence Check');
          testTableExists();
        } catch (e) {
          console.log('⚠️  Warehouse info parse error:', e.message);
        }
      } else {
        console.log('⚠️  Warehouse check failed:', res.statusCode);
        console.log('Response:', data.substring(0, 500));
      }
    });
  });

  warehouseReq.on('error', (error) => {
    console.log('⚠️  Warehouse check error:', error.message);
  });

  warehouseReq.end();
}

// Test table existence
function testTableExists() {
  const tableFullName = `${config.catalog}.${config.schema}.${config.tableName}`;
  const describeQuery = `DESCRIBE TABLE ${tableFullName}`;

  const requestBody = {
    statement: describeQuery,
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
        
        if (result.status?.state === 'SUCCEEDED') {
          console.log('✅ Table exists and is accessible');
          console.log('Schema columns:', result.result?.data_array?.length || 0);
          
          if (result.result?.data_array?.length > 0) {
            console.log('\nTable schema:');
            result.result.data_array.slice(0, 5).forEach(row => {
              console.log(`  - ${row[0]}: ${row[1]}`);
            });
          }
        } else if (result.status?.state === 'FAILED') {
          console.log('❌ Table check failed:', result.status?.error?.message);
          console.log('\n💡 Table may not exist or you may not have permissions');
        }
      } catch (e) {
        console.log('❌ Table check parse error:', e.message);
      }
    });
  });

  req.on('error', (error) => {
    console.log('❌ Table check error:', error.message);
  });

  req.write(postData);
  req.end();
}