#!/usr/bin/env node

// Load environment variables from .env.local
require('dotenv').config({ path: '../.env.local' });
const fetch = globalThis.fetch || require('node-fetch');

class DatabricksService {
  constructor() {
    this.config = {
      serverHostname: this.parseHostname(process.env.REACT_APP_DATABRICKS_HOST || ''),
      httpPath: process.env.REACT_APP_DATABRICKS_HTTP_PATH || '',
      warehouseId: process.env.REACT_APP_WAREHOUSE_ID || '',
      token: process.env.REACT_APP_DATABRICKS_TOKEN || '',
      catalog: process.env.REACT_APP_DATABRICKS_CATALOG || 'main',
      schema: process.env.REACT_APP_DATABRICKS_SCHEMA || 'default',
      tableName: process.env.REACT_APP_DATABRICKS_TABLE || 'sensor_bronze_table',
    };
    
    this.tableFullName = `${this.config.catalog}.${this.config.schema}.${this.config.tableName}`;
  }

  parseHostname(host) {
    if (!host) return '';
    const withoutProtocol = host.replace(/https?:\/\//, '');
    const hostname = withoutProtocol.split('?')[0].split('/')[0];
    return hostname;
  }

  async executeQuery(query) {
    const url = `https://${this.config.serverHostname}/api/2.0/sql/statements/`;
    const warehouseId = this.config.warehouseId;

    const requestBody = {
      statement: query,
      warehouse_id: warehouseId,
      wait_timeout: "30s",
      on_wait_timeout: "CONTINUE"
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const result = await response.json();
    
    if (result.status?.state === 'SUCCEEDED') {
      return result.result;
    } else if (result.status?.state === 'FAILED') {
      throw new Error(result.status.error?.message || 'Query failed');
    } else {
      return await this.waitForCompletion(result.statement_id);
    }
  }

  async waitForCompletion(statementId) {
    const url = `https://${this.config.serverHostname}/api/2.0/sql/statements/${statementId}`;
    
    let attempts = 0;
    const maxAttempts = 30;
    
    while (attempts < maxAttempts) {
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${this.config.token}` }
      });
      const result = await response.json();
      
      if (result.status?.state === 'SUCCEEDED') {
        return result.result;
      } else if (result.status?.state === 'FAILED') {
        throw new Error(result.status.error?.message || 'Query failed');
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }
    
    throw new Error('Query timed out');
  }

  async checkAllData() {
    console.log('=== Checking for ANY data in table ===');
    const queries = [
      'SELECT COUNT(*) as total_rows FROM ' + this.tableFullName,
      'SELECT MIN(timestamp) as earliest, MAX(timestamp) as latest FROM ' + this.tableFullName,
      'SELECT * FROM ' + this.tableFullName + ' LIMIT 10'
    ];

    for (const query of queries) {
      try {
        console.log(`\nQuery: ${query}`);
        const result = await this.executeQuery(query);
        console.log('Result:', result.data_array);
      } catch (error) {
        console.error('Error:', error.message);
      }
    }
  }
}

async function main() {
  const service = new DatabricksService();
  await service.checkAllData();
}

main().catch(console.error);