import { Document, Folder } from './store';

// Document API functions
export const fetchDocuments = async (): Promise<Document[]> => {
  try {
    const response = await fetch('/api/documents', {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache',
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to fetch documents: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching documents:', error);
    throw error;
  }
};

export const saveDocumentToServer = async (document: Document): Promise<Document> => {
  try {
    const response = await fetch('/api/documents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(document),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to save document: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error saving document:', error);
    throw error;
  }
};

export const deleteDocumentFromServer = async (id: string): Promise<void> => {
  try {
    const response = await fetch(`/api/documents?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to delete document: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
};

export const renameDocumentOnServer = async (id: string, newName: string): Promise<{ document: Document, updatedLinks: number }> => {
  try {
    const response = await fetch('/api/documents/rename', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id, newName }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to rename document: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error renaming document:', error);
    throw error;
  }
};

export const moveDocumentOnServer = async (id: string, targetFolderId: string | null): Promise<Document> => {
  try {
    const response = await fetch('/api/documents/move', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id, targetFolderId }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to move document: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error moving document:', error);
    throw error;
  }
};

export const getBacklinksFromServer = async (id: string): Promise<{ id: string, name: string }[]> => {
  try {
    const response = await fetch(`/api/backlinks?id=${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache',
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to get backlinks: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting backlinks:', error);
    throw error;
  }
};

// Folder API functions
export const fetchFolders = async (): Promise<Folder[]> => {
  try {
    const response = await fetch('/api/folders', {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache',
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to fetch folders: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching folders:', error);
    throw error;
  }
};

export const saveFolderToServer = async (folder: Folder): Promise<Folder> => {
  try {
    const response = await fetch('/api/folders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(folder),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to save folder: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error saving folder:', error);
    throw error;
  }
};

export const deleteFolderFromServer = async (id: string, recursive: boolean = false): Promise<void> => {
  try {
    const response = await fetch(`/api/folders?id=${encodeURIComponent(id)}&recursive=${recursive}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to delete folder: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error deleting folder:', error);
    throw error;
  }
};

export const renameFolderOnServer = async (id: string, newName: string): Promise<Folder> => {
  try {
    const response = await fetch('/api/folders/rename', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id, newName }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to rename folder: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error renaming folder:', error);
    throw error;
  }
};

export const moveFolderOnServer = async (id: string, targetParentId: string | null): Promise<Folder> => {
  try {
    const response = await fetch('/api/folders/move', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id, targetParentId }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to move folder: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error moving folder:', error);
    throw error;
  }
};

export const copyFolderOnServer = async (
  sourceId: string, 
  targetParentId: string | null,
  newName?: string
): Promise<{ newFolderId: string }> => {
  try {
    const response = await fetch('/api/folders/copy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sourceId, targetParentId, newName }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to copy folder: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error copying folder:', error);
    throw error;
  }
};

// Fetch templates from the server
export const fetchTemplates = async (): Promise<{ name: string; path: string }[]> => {
  try {
    const response = await fetch('/api/templates');
    
    if (!response.ok) {
      throw new Error('Failed to fetch templates');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching templates:', error);
    return [];
  }
};

// Process a template with variables
export const processTemplate = async (templateName: string, variables: Record<string, string>): Promise<string> => {
  try {
    // First, get the template content
    let templateContent = "";
    
    try {
      // Get template content via preview API
      const previewResponse = await fetch(`/api/templates/preview?name=${encodeURIComponent(templateName)}`);
      if (previewResponse.ok) {
        const data = await previewResponse.json();
        templateContent = data.content;
      } else {
        throw new Error(`Could not find template: ${templateName}`);
      }
    } catch (error) {
      console.error(`Error fetching template content for ${templateName}:`, error);
      throw new Error(`Failed to get template content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Now process the template with the content and variables
    const processResponse = await fetch('/api/templates/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        template: templateContent,
        variables: variables
      }),
    });
    
    if (!processResponse.ok) {
      const errorData = await processResponse.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to process template: ${processResponse.statusText}`);
    }
    
    const data = await processResponse.json();
    return data.content;
  } catch (error) {
    console.error('Error processing template:', error);
    throw error;
  }
};

// Filter API functions
export interface FilterConfig {
  enabled: boolean;
  patterns: string[];
}

// Load filter configuration from server
export const loadFilterFromServer = async (): Promise<FilterConfig> => {
  try {
    const response = await fetch('/api/filter', {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache',
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to load filter config: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error loading filter config:', error);
    throw error;
  }
};

// Save filter configuration to server
export const saveFilterToServer = async (filterConfig: FilterConfig): Promise<FilterConfig> => {
  try {
    const response = await fetch('/api/filter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(filterConfig),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to save filter config: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result.config;
  } catch (error) {
    console.error('Error saving filter config:', error);
    throw error;
  }
}; 