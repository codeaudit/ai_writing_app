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

export const deleteFolderFromServer = async (id: string): Promise<void> => {
  try {
    const response = await fetch(`/api/folders?id=${encodeURIComponent(id)}`, {
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