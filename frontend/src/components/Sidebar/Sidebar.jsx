import React, { useState } from 'react';
import './Sidebar.css';
import databricksLogo from '../../assets/databricks-logo.svg';

const Sidebar = ({ activeModule, onModuleChange, onToggle, isCollapsed }) => {
  const [expandedSections, setExpandedSections] = useState({
    modeling: true,
    visualization: true,
    analysis: true,
    monitoring: true
  });

  const moduleSelected = (item_id) =>{
      onModuleChange(item_id)
  
  }

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const menuItems = [
    {
      section: 'modeling',
      title: 'Data Modeling',
      icon: '🏗️',
      items: [
        { id: 'rdf-editor', label: 'RDF Model Editor', icon: '📝', description: 'Define and edit RDF models' },
        { id: 'model-library', label: 'Model Library', icon: '📚', description: 'Saved model templates' }
      ]
    },
    {
      section: 'visualization',
      title: 'Visualization',
      icon: '📊',
      items: [
        { id: 'graph', label: 'Graph Editor', icon: '🔗', description: 'Interactive graph visualization' },
        { id: 'graph-view', label: 'Graph Viewer', icon: '🏞️', description: 'View the latest state of the graph.' },
        { id: '3d', label: '3D Viewer', icon: '🏭', description: '3D factory model' },
        { id: 'dashboard', label: 'Dashboard', icon: '📈', description: 'Custom dashboards' }
      ]
    },
    {
      section: 'analysis',
      title: 'Analysis & Query',
      icon: '🔍',
      items: [
        { id: 'sparql', label: 'SPARQL Query', icon: '🔍', description: 'Query RDF data' },
        { id: 'analytics', label: 'Analytics', icon: '📊', description: 'Data analytics tools' }
      ]
    },
    {
      section: 'monitoring',
      title: 'Monitoring',
      icon: '📡',
      items: [
        { id: 'telemetry', label: 'Telemetry', icon: '📈', description: 'Real-time sensor data' },
        { id: 'alerts', label: 'Alerts', icon: '🚨', description: 'System alerts' },
        { id: 'logs', label: 'System Logs', icon: '📋', description: 'Application logs' }
      ]
    }
  ];

  const MenuItem = ({ item, section }) => (
    <div
      className={`menu-item ${activeModule === item.id ? 'active' : ''}`}
      onClick={() => moduleSelected(item.id)}
      title={isCollapsed ? `${item.label} - ${item.description}` : item.description}
    >
      <div className="menu-item-content">
        <span className="menu-icon">{item.icon}</span>
        {!isCollapsed && (
          <div className="menu-text">
            <span className="menu-label">{item.label}</span>
            <span className="menu-description">{item.description}</span>
          </div>
        )}
      </div>
      {!isCollapsed && activeModule === item.id && (
        <span className="active-indicator">●</span>
      )}
    </div>
  );

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="logo-section">
          <img src={databricksLogo} alt="Databricks" className="sidebar-logo" />
          {!isCollapsed && (
            <div className="app-title">
              <h3>Digital Twin</h3>
              <span className="app-subtitle">Manufacturing System</span>
            </div>
          )}
        </div>
        <button className="toggle-btn" onClick={onToggle}>
          {isCollapsed ? '→' : '←'}
        </button>
      </div>

      <div className="sidebar-content">
        <div className="menu-sections">
          {menuItems.map(section => (
            <div key={section.section} className="menu-section">
              <div 
                className="section-header"
                onClick={() => !isCollapsed && toggleSection(section.section)}
              >
                <div className="section-info">
                  <span className="section-icon">{section.icon}</span>
                  {!isCollapsed && (
                    <>
                      <span className="section-title">{section.title}</span>
                      <span className={`expand-icon ${expandedSections[section.section] ? 'expanded' : ''}`}>
                        ▼
                      </span>
                    </>
                  )}
                </div>
              </div>
              
              {(isCollapsed || expandedSections[section.section]) && (
                <div className="section-items">
                  {section.items.map(item => (
                    <MenuItem key={item.id} item={item} section={section.section} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="sidebar-footer">
        {!isCollapsed && (
          <div className="status-info">
            <div className="status-item">
              <span className="status-dot online"></span>
              <span>System Online</span>
            </div>
            <div className="status-item">
              <span className="status-dot"></span>
              <span>Last Update: {new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;