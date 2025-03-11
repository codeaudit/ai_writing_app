import { Pattern, Folder } from './pattern-store';

// Pattern API functions
export const fetchPatterns = async (): Promise<Pattern[]> => {
  try {
    const response = await fetch('/api/patterns', {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache',
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to fetch patterns: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching patterns:', error);
    throw error;
  }
};

export const savePatternToServer = async (pattern: Pattern): Promise<Pattern> => {
  try {
    const response = await fetch('/api/patterns', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pattern),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to save pattern: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error saving pattern:', error);
    throw error;
  }
};

export const deletePatternFromServer = async (id: string): Promise<void> => {
  try {
    const response = await fetch(`/api/patterns?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to delete pattern: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error deleting pattern:', error);
    throw error;
  }
};

// Folder API functions
export const fetchFolders = async (): Promise<Folder[]> => {
  try {
    const response = await fetch('/api/pattern-folders', {
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
    const response = await fetch('/api/pattern-folders', {
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
    const response = await fetch(`/api/pattern-folders?id=${encodeURIComponent(id)}`, {
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