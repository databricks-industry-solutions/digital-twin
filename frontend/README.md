# Digital Twin Frontend

A modern React-based frontend for the Databricks Digital Twin Manufacturing System. This application provides interactive visualization, real-time telemetry monitoring, RDF data modeling, and SPARQL query capabilities for industrial IoT and manufacturing systems.

## Features

### **Core Modules**
- **RDF Model Editor**: Create and edit semantic data models using RDF/Turtle syntax
- **Graph Visualization**: Interactive factory hierarchy visualization with Cytoscape.js
- **Telemetry Dashboard**: Real-time sensor monitoring with health status indicators
- **3D Viewer**: Three-dimensional visualization of manufacturing systems
- **SPARQL Query Interface**: Execute semantic queries against RDF data
- **Alerts Center**: Centralized monitoring and alerting for system health

### **Data Integration**
- **Databricks Integration**: Direct connection to Databricks SQL warehouses for telemetry data
- **Real-time Updates**: Automatic telemetry refresh every 5 seconds
- **Mock Data Fallback**: Seamless fallback to generated data during development
- **Multiple Schema Support**: Compatible with various telemetry table schemas

### 🔧 **Developer Tools**
- **Debug Panel**: Built-in connection testing and configuration validation
- **Environment Configuration**: Easy setup with `.env` files
- **Error Handling**: Graceful degradation and user-friendly error messages
- **Comprehensive Logging**: Detailed console output for troubleshooting

## Quick Start

### Prerequisites
- Node.js 16+ and npm
- Access to a Databricks workspace (optional for development)
- SQL warehouse configured in Databricks (optional)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Databricks connection (optional):**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` with your Databricks credentials:
   ```env
   REACT_APP_DATABRICKS_HOST=your-workspace.databricks.com
   REACT_APP_WAREHOUSE_ID=your-warehouse-id
   REACT_APP_DATABRICKS_TOKEN=your-access-token
   REACT_APP_DATABRICKS_TABLE=sensor_bronze_table
   ```

3. **Start the development server:**
   ```bash
   npm start
   ```

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `REACT_APP_DATABRICKS_HOST` | Databricks workspace hostname | Optional* |
| `REACT_APP_WAREHOUSE_ID` | SQL warehouse ID | Optional* |
| `REACT_APP_DATABRICKS_TOKEN` | Personal access token | Optional* |
| `REACT_APP_DATABRICKS_TABLE` | Telemetry table name | Optional |
| `REACT_APP_DATABRICKS_CATALOG` | Database catalog | Optional |
| `REACT_APP_DATABRICKS_SCHEMA` | Database schema | Optional |

*Required only for live Databricks integration. App will use mock data otherwise.

### Databricks Setup

1. **Create a Personal Access Token:**
   - Go to Databricks workspace → User Settings → Developer → Access Tokens
   - Click "Generate New Token"
   - Save the token securely

2. **Get SQL Warehouse Details:**
   - Navigate to SQL Warehouses in your Databricks workspace
   - Copy the Warehouse ID from Connection Details

3. **Prepare Your Telemetry Table:**
   
   Your table should have one of these schemas:

   **Option A (Recommended):**
   ```sql
   CREATE TABLE sensor_bronze_table (
     component_id STRING,
     sensor_temperature DOUBLE,
     sensor_pressure DOUBLE, 
     sensor_vibration DOUBLE,
     sensor_speed DOUBLE,
     timestamp TIMESTAMP
   )
   ```

   **Option B (Alternative):**
   ```sql
   CREATE TABLE sensor_bronze_table (
     componentID STRING,
     sensorAReading DOUBLE,
     sensorBReading DOUBLE,
     sensorCReading DOUBLE,
     sensorDReading DOUBLE,
     timestamp TIMESTAMP
   )
   ```

## Usage Guide

### 1. RDF Model Editor
- Edit semantic models using Turtle/RDF syntax
- Real-time syntax validation
- Auto-sync with graph visualization
- Export models for use in other systems

### 2. Graph Visualization
- Interactive node-link diagrams of factory hierarchy
- Click nodes to view telemetry data overlays
- Drag nodes to rearrange layout
- Color-coded health status indicators

### 3. Telemetry Dashboard
- Real-time sensor data monitoring
- Health status with configurable thresholds:
  - **Temperature**: Warning >90°C, Critical >100°C
  - **Pressure**: Warning >60 PSI, Critical >70 PSI
  - **Vibration**: Warning >120 Hz, Critical >140 Hz
  - **Speed**: Warning >75 RPM, Critical >85 RPM
- Historical data visualization
- Debug panel for connection testing

### 4. SPARQL Queries
- Execute semantic queries against RDF data
- Pre-built query templates
- Results highlighting in graph view
- Export query results

## Architecture

### Component Structure
```
src/
├── components/          # React components
│   ├── Sidebar/        # Navigation sidebar
│   ├── GraphEditor/    # Cytoscape graph visualization
│   ├── TelemetryPanel/ # Telemetry monitoring & debug tools
│   ├── RDFEditor/      # Semantic data modeling
│   ├── CommandCenter/  # SPARQL query interface
│   └── AlertsCenter/   # System alerts and monitoring
├── services/           # API and data services
│   └── databricksService.js # Databricks SQL integration
├── utils/              # Utility functions
│   ├── rdfParser.js    # RDF/Turtle parsing
│   ├── rdfWriter.js    # RDF serialization
│   └── telemetryFetcher.js # Telemetry data management
└── pages/              # Page components
    └── Home.jsx        # Main application page
```

### Data Flow
1. **RDF Data**: Parsed from Turtle format into graph structures
2. **Telemetry Data**: Fetched from Databricks or mock generators
3. **Real-time Updates**: Automatic refresh with configurable intervals
4. **State Management**: React hooks for local state, context for shared data

## Development

### Available Scripts
- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run test suite
- `npm run eject` - Eject from Create React App

### Adding New Components
1. Create component in appropriate `src/components/` subdirectory
2. Add to sidebar navigation in `Sidebar.jsx`
3. Register route handler in `Home.jsx`
4. Follow existing patterns for state management

### Extending Telemetry Support
1. Modify `TelemetryFetcher.js` for new data sources
2. Update `DatabricksService.js` for schema changes
3. Adjust health thresholds in telemetry configuration
4. Add new sensor types to sensor definitions

## Troubleshooting

### Common Issues

**1. Databricks Connection Failed**
- Verify environment variables in `.env.local`
- Check network connectivity to Databricks workspace
- Ensure SQL warehouse is running
- Validate access token permissions

**2. No Telemetry Data**
- Confirm table exists and has data
- Check table schema matches expected format
- Use Debug Panel to test queries
- Review browser console for error messages

**3. Graph Not Rendering**
- Check RDF syntax in Model Editor
- Verify component relationships are properly defined
- Clear browser cache and reload

### Debug Tools
- **Telemetry Debug Panel**: Access via Telemetry Dashboard
- **Browser Console**: Detailed logging for all operations
- **Network Tab**: Monitor API calls to Databricks
- **React DevTools**: Component state inspection

### Getting Help
- Check browser console for error messages
- Use the built-in Debug Panel for connection testing
- Review environment variable configuration
- Ensure Databricks SQL warehouse is accessible

## Production Deployment

### Build for Production
```bash
npm run build
```

### Environment Variables
Set production environment variables in your hosting platform:
- Databricks workspace URL
- Production SQL warehouse ID
- Service account token (recommended over personal tokens)

### Security Considerations
- Use service accounts instead of personal access tokens
- Enable IP allowlisting in Databricks
- Use HTTPS for all connections
- Regularly rotate access tokens

## Contributing

1. Follow existing code patterns and component structure
2. Add unit tests for new functionality
3. Update this README for significant changes
4. Test with both mock data and live Databricks connection

## License

This project is part of the Databricks Industry Solutions digital twin repository.