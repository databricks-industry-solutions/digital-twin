class RDFModelsService {
  constructor() {
    this.backendBaseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8080';
    this.apiEndpoint = `${this.backendBaseUrl}/api/rdf-models`;
  }

  async handleResponse(response) {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  async createModel(modelData) {
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(modelData)
      });
      
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error creating RDF model:', error);
      throw error;
    }
  }

  async listModels(options = {}) {
    try {
      const params = new URLSearchParams();
      
      if (options.limit) params.append('limit', options.limit);
      if (options.offset) params.append('offset', options.offset);
      if (options.category) params.append('category', options.category);
      if (options.is_template !== undefined) params.append('is_template', options.is_template);
      if (options.creator) params.append('creator', options.creator);
      if (options.search) params.append('search', options.search);
      
      const url = `${this.apiEndpoint}${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url);
      
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error listing RDF models:', error);
      throw error;
    }
  }

  async getModel(modelId) {
    try {
      const response = await fetch(`${this.apiEndpoint}/${modelId}`);
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error getting RDF model:', error);
      throw error;
    }
  }

  async getModelByName(name) {
    try {
      const response = await fetch(`${this.apiEndpoint}/by-name/${encodeURIComponent(name)}`);
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error getting RDF model by name:', error);
      throw error;
    }
  }

  async updateModel(modelId, updates) {
    try {
      const response = await fetch(`${this.apiEndpoint}/${modelId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates)
      });
      
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error updating RDF model:', error);
      throw error;
    }
  }

  async deleteModel(modelId) {
    try {
      const response = await fetch(`${this.apiEndpoint}/${modelId}`, {
        method: 'DELETE'
      });
      
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error deleting RDF model:', error);
      throw error;
    }
  }

  async duplicateModel(modelId, newName = null) {
    try {
      const body = newName ? { name: newName } : {};
      const response = await fetch(`${this.apiEndpoint}/${modelId}/duplicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      });
      
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error duplicating RDF model:', error);
      throw error;
    }
  }

  async searchModels(query, limit = 20) {
    try {
      const params = new URLSearchParams({
        q: query,
        limit: limit.toString()
      });
      
      const response = await fetch(`${this.apiEndpoint}/search?${params.toString()}`);
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error searching RDF models:', error);
      throw error;
    }
  }

  async getStatistics() {
    try {
      const response = await fetch(`${this.apiEndpoint}/statistics`);
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error getting RDF model statistics:', error);
      throw error;
    }
  }

  async bulkImportModels(modelsData) {
    try {
      const response = await fetch(`${this.apiEndpoint}/bulk-import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ models: modelsData })
      });
      
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error bulk importing RDF models:', error);
      throw error;
    }
  }

  // Convenience methods for common operations
  async getTemplates() {
    return this.listModels({ is_template: true, limit: 100 });
  }

  async getUserModels(creator = null) {
    return this.listModels({ is_template: false, creator, limit: 100 });
  }

  async getModelsByCategory(category) {
    return this.listModels({ category, limit: 100 });
  }

  // Local storage migration helper
  async migrateFromLocalStorage() {
    try {
      const localModels = localStorage.getItem('saved-rdf-models');
      if (!localModels) {
        console.log('No local models to migrate');
        return { migrated: 0, errors: [] };
      }

      const models = JSON.parse(localModels);
      if (!Array.isArray(models) || models.length === 0) {
        console.log('No valid local models to migrate');
        return { migrated: 0, errors: [] };
      }

      console.log(`Migrating ${models.length} models from localStorage to database...`);
      
      // Convert local storage format to API format
      const migratedModels = models.map(model => ({
        name: model.name,
        content: model.content,
        description: model.description || '',
        category: model.category || 'user',
        is_template: false,
        creator: 'migrated-user',
        metadata: {
          original_id: model.id,
          migrated_at: new Date().toISOString(),
          original_created_at: model.createdAt
        },
        tags: model.tags || []
      }));

      const result = await this.bulkImportModels(migratedModels);
      
      if (result.created > 0) {
        // Clear local storage after successful migration
        localStorage.removeItem('saved-rdf-models');
        console.log(`Successfully migrated ${result.created} models`);
      }

      return {
        migrated: result.created,
        errors: result.error_details || [],
        total_attempted: models.length
      };

    } catch (error) {
      console.error('Error migrating from localStorage:', error);
      throw error;
    }
  }

  // Check if backend is available
  async isBackendAvailable() {
    try {
      const response = await fetch(`${this.apiEndpoint}/statistics`);
      return response.ok;
    } catch (error) {
      console.warn('Backend not available:', error.message);
      return false;
    }
  }

  // Fallback to localStorage when backend is not available
  async getModelsWithFallback() {
    try {
      // Try backend first
      const result = await this.listModels({ limit: 100 });
      return {
        source: 'backend',
        models: result.models,
        statistics: result.statistics
      };
    } catch (error) {
      console.warn('Backend unavailable, falling back to localStorage');
      
      // Fallback to localStorage
      const localModels = localStorage.getItem('saved-rdf-models');
      const models = localModels ? JSON.parse(localModels) : [];
      
      return {
        source: 'localStorage',
        models: models,
        statistics: {
          total_models: models.length,
          template_count: 0,
          user_model_count: models.length
        }
      };
    }
  }

  // Get local templates from example-ttls directory
  async getLocalTemplates() {
    try {
      const response = await fetch(`${this.apiEndpoint}/local-templates`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching local templates:', error);
      throw error;
    }
  }

  // Enhanced getModelsWithFallback - templates are now in database, not local files
  async getModelsWithLocalTemplatesFallback() {
    try {
      // Try backend for database models (includes migrated templates)
      try {
        const result = await this.listModels({ limit: 100 });
        const databaseModels = result.models || [];

        console.log(`✅ Loaded ${databaseModels.length} models from database (includes templates)`);

        return {
          source: 'backend',
          models: databaseModels,
          statistics: {
            total_models: databaseModels.length,
            template_count: databaseModels.filter(m => m.is_template).length || 0,
            user_model_count: databaseModels.filter(m => !m.is_template).length || 0,
            local_template_count: 0  // All templates are now in database
          }
        };
      } catch (backendError) {
        console.warn('Backend unavailable, falling back to localStorage only');

        // Fallback to localStorage if backend is down
        const localModels = JSON.parse(localStorage.getItem('saved-rdf-models') || '[]');

        return {
          source: 'localStorage',
          models: localModels,
          statistics: {
            total_models: localModels.length,
            template_count: localModels.filter(m => m.is_template).length || 0,
            user_model_count: localModels.filter(m => !m.is_template).length || 0,
            local_template_count: 0
          }
        };
      }
    } catch (error) {
      console.error('Complete fallback failed:', error);

      // Final fallback: just localStorage
      const localModels = JSON.parse(localStorage.getItem('saved-rdf-models') || '[]');
      return {
        source: 'localStorage-only',
        models: localModels,
        statistics: {
          total_models: localModels.length,
          template_count: 0,
          user_model_count: localModels.length,
          local_template_count: 0
        }
      };
    }
  }

  // Save to localStorage as backup
  saveToLocalStorageBackup(model) {
    try {
      const existingModels = JSON.parse(localStorage.getItem('saved-rdf-models') || '[]');
      const updatedModels = [...existingModels, {
        id: model.id || Date.now().toString(),
        name: model.name,
        content: model.content,
        description: model.description,
        category: model.category,
        createdAt: model.created_at || new Date().toISOString(),
        isTemplate: model.is_template || false
      }];
      localStorage.setItem('saved-rdf-models', JSON.stringify(updatedModels));
    } catch (error) {
      console.warn('Failed to save localStorage backup:', error);
    }
  }
}

export default RDFModelsService;