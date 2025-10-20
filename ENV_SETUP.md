# Environment Variable Setup Guide

This guide explains how to configure environment variables for the Databricks Digital Twin application.

## 🏗️ Architecture Overview

The application consists of two main components:
- **Backend**: Flask API server (Python)
- **Frontend**: React application (JavaScript)

Both components use environment variables for configuration, with the frontend requiring `REACT_APP_` prefixes.

## 📋 Quick Setup

### 1. Copy Environment Files

```bash
# Root level (shared configuration)
cp .env.example .env.local

# Backend specific
cp serving-app/.env.example serving-app/.env.local

# Frontend specific (if not already done)
cp frontend/.env.example frontend/.env.local
```

### 2. Configure Your Values

Edit the `.env.local` files with your actual Databricks workspace details:

```bash
# Essential configuration needed
DATABRICKS_HOST=https://your-workspace.databricks.com
DATABRICKS_TOKEN=your-access-token
WAREHOUSE_ID=your-warehouse-id
DATABRICKS_CATALOG=your_catalog
DATABRICKS_SCHEMA=your_schema
DATABRICKS_TABLE=your_table
```

## 🔧 Environment Variables Reference

### Application Configuration

| Variable | Backend | Frontend | Description | Default |
|----------|---------|----------|-------------|---------|
| `PORT` | ✅ | ❌ | Backend server port | `8080` |
| `SECRET_KEY` | ✅ | ❌ | Flask secret key | `dev-secret-key` |
| `REACT_APP_BACKEND_URL` | ❌ | ✅ | Backend API URL | `http://localhost:8080` |

### Databricks Configuration

| Variable | Backend | Frontend | Description |
|----------|---------|----------|-------------|
| `DATABRICKS_HOST` | ✅ | `REACT_APP_DATABRICKS_HOST` | Workspace URL |
| `DATABRICKS_TOKEN` | ✅ | `REACT_APP_DATABRICKS_TOKEN` | Access token |
| `DATABRICKS_HTTP_PATH` | ✅ | `REACT_APP_DATABRICKS_HTTP_PATH` | SQL warehouse HTTP path |
| `WAREHOUSE_ID` | ✅ | `REACT_APP_WAREHOUSE_ID` | SQL warehouse ID |
| `DATABRICKS_CATALOG` | ✅ | `REACT_APP_DATABRICKS_CATALOG` | Catalog name |
| `DATABRICKS_SCHEMA` | ✅ | `REACT_APP_DATABRICKS_SCHEMA` | Schema name |
| `DATABRICKS_TABLE` | ✅ | `REACT_APP_DATABRICKS_TABLE` | Bronze table name |

### Advanced Table Configuration

| Variable | Backend | Frontend | Description |
|----------|---------|----------|-------------|
| `SYNCED_TABLE_FULL_NAME` | ✅ | `REACT_APP_SYNCED_TABLE_FULL_NAME` | Full name for synced table |
| `TRIPLE_TABLE_FULL_NAME` | ✅ | `REACT_APP_TRIPLE_TABLE_FULL_NAME` | Full name for triple table |

### PostgreSQL Configuration (Backend Only)

| Variable | Description | Default |
|----------|-------------|---------|
| `PGDATABASE` | Database name | - |
| `PGUSER` | Database user | - |
| `PGPASSWORD` | Database password | - |
| `PGHOST` | Database host | `localhost` |
| `PGPORT` | Database port | `5432` |
| `PGSSLMODE` | SSL mode | `require` |
| `PGAPPNAME` | Application name | `databricks-digital-twin` |
| `PG_TOKEN_REFRESH_SECONDS` | Token refresh interval | `900` |

## 📝 Configuration Examples

### Development Setup

```bash
# Backend (.env.local)
PORT=8080
DATABRICKS_HOST=https://your-workspace.databricks.com
DATABRICKS_TOKEN=dapixxxxxxxxxx
WAREHOUSE_ID=abc123def456
DATABRICKS_CATALOG=main
DATABRICKS_SCHEMA=development
DATABRICKS_TABLE=sensor_bronze
```

```bash
# Frontend (.env.local)
REACT_APP_BACKEND_URL=http://localhost:8080
REACT_APP_DATABRICKS_HOST=https://your-workspace.databricks.com
REACT_APP_DATABRICKS_TOKEN=dapixxxxxxxxxx
REACT_APP_WAREHOUSE_ID=abc123def456
REACT_APP_DATABRICKS_CATALOG=main
REACT_APP_DATABRICKS_SCHEMA=development
REACT_APP_DATABRICKS_TABLE=sensor_bronze
```

### Production Setup

```bash
# Backend (.env.local)
PORT=8080
SECRET_KEY=your-production-secret-key
DATABRICKS_HOST=https://production-workspace.databricks.com
DATABRICKS_TOKEN=dapi_production_token_here
WAREHOUSE_ID=production_warehouse_id
DATABRICKS_CATALOG=production
DATABRICKS_SCHEMA=digital_twin
DATABRICKS_TABLE=sensor_bronze
```

## 🚀 Getting Databricks Configuration

### 1. Get Workspace URL
Your workspace URL is the base URL you use to access Databricks, typically:
`https://[workspace-name].[region].databricks.com`

### 2. Generate Access Token
1. Go to your Databricks workspace
2. Click on your user profile (top right)
3. Select "User Settings"
4. Go to "Developer" tab
5. Click "Manage" next to "Access tokens"
6. Generate a new token

### 3. Find SQL Warehouse Details
1. Go to "SQL Warehouses" in your workspace
2. Select your warehouse
3. Click "Connection Details"
4. Copy the "Server hostname" and "HTTP path"
5. Extract the warehouse ID from the HTTP path: `/sql/1.0/warehouses/{WAREHOUSE_ID}`

### 4. Table Schema Requirements
Your bronze table should have these columns:
```sql
CREATE TABLE IF NOT EXISTS {catalog}.{schema}.{table} (
  component_id STRING,
  sensor_temperature DOUBLE,
  sensor_pressure DOUBLE,
  sensor_vibration DOUBLE,
  sensor_speed DOUBLE,
  timestamp TIMESTAMP
);
```

## 🔍 Troubleshooting

### Environment Not Loading
- Ensure `.env.local` files exist in the correct directories
- Check file permissions (should be readable)
- Verify variable names are exact (case-sensitive)
- Frontend variables MUST start with `REACT_APP_`

### Backend Connection Issues
- Verify `DATABRICKS_HOST` doesn't include path components
- Check `DATABRICKS_TOKEN` has proper permissions
- Ensure `WAREHOUSE_ID` is correct and warehouse is running

### Frontend Not Connecting to Backend
- Check `REACT_APP_BACKEND_URL` points to correct backend
- Ensure backend is running on the configured port
- Verify CORS is enabled in Flask app

### Database Access Issues
- Confirm your access token has permissions to query the specified tables
- Check that the catalog, schema, and table exist
- Verify the table schema matches expected format

## 🎯 Validation Commands

### Backend Validation
```bash
cd serving-app
python -c "from app.config import Config; print('Databricks missing:', Config.validate_databricks_config())"
```

### Frontend Validation
Check browser console for environment variable warnings when the app loads.

## 📚 Best Practices

1. **Never commit `.env.local` files** - they contain sensitive data
2. **Use different tokens** for development and production
3. **Rotate access tokens** regularly
4. **Limit token permissions** to only what's needed
5. **Use separate workspaces** for dev/staging/production
6. **Keep environment files in sync** between backend and frontend
7. **Document any custom variables** your team adds

## 🔐 Security Notes

- Environment files contain sensitive credentials
- Add `.env.local` to your `.gitignore`
- Use different tokens for different environments
- Consider using secret management systems in production
- Regularly audit and rotate access tokens