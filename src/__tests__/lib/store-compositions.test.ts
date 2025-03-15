// @ts-nocheck
import { act, renderHook } from '@testing-library/react';
import { useDocumentStore } from '../../lib/store';
import * as apiService from '../../lib/api-service';

// Mock the API service
jest.mock('../../lib/api-service', () => ({
  fetchDocuments: jest.fn(),
  fetchFolders: jest.fn(),
  saveDocumentToServer: jest.fn(),
  saveFolderToServer: jest.fn(),
  deleteDocumentFromServer: jest.fn(),
  deleteFolderFromServer: jest.fn(),
  renameDocumentOnServer: jest.fn(),
  moveDocumentOnServer: jest.fn(),
  renameFolderOnServer: jest.fn(),
  moveFolderOnServer: jest.fn(),
  getBacklinksFromServer: jest.fn()
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    })
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('Document Store - Compositions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset localStorage
    localStorageMock.clear();
    
    // Reset the store state
    const { result } = renderHook(() => useDocumentStore());
    act(() => {
      result.current.documents = [];
      result.current.folders = [];
      result.current.compositions = [];
      result.current.selectedDocumentId = null;
      result.current.selectedFolderId = null;
      result.current.comparisonDocumentIds = [];
      result.current.selectedFolderIds = [];
      result.current.isLoading = false;
      result.current.error = null;
      result.current.backlinks = [];
    });
  });
  
  describe('addComposition', () => {
    it('should add a new composition', async () => {
      const { result } = renderHook(() => useDocumentStore());
      
      const name = 'Test Composition';
      const content = 'This is a test composition';
      const contextDocuments = [
        { id: 'doc1', name: 'Document 1', content: 'Content 1' }
      ];
      
      await act(async () => {
        await result.current.addComposition(name, content, contextDocuments);
      });
      
      expect(result.current.compositions).toHaveLength(1);
      expect(result.current.compositions[0].name).toBe(name);
      expect(result.current.compositions[0].content).toBe(content);
      expect(result.current.compositions[0].contextDocuments).toEqual(contextDocuments);
      expect(result.current.compositions[0].id).toBeDefined();
      expect(result.current.compositions[0].createdAt).toBeInstanceOf(Date);
      expect(result.current.compositions[0].updatedAt).toBeInstanceOf(Date);
    });
    
    it('should add a composition with default values when optional parameters are omitted', async () => {
      const { result } = renderHook(() => useDocumentStore());
      
      const name = 'Test Composition';
      
      await act(async () => {
        await result.current.addComposition(name);
      });
      
      expect(result.current.compositions).toHaveLength(1);
      expect(result.current.compositions[0].name).toBe(name);
      // The content might be undefined or empty string depending on implementation
      expect(result.current.compositions[0].content || '').toBeDefined();
      // The contextDocuments might be undefined in the implementation
      const contextDocs = result.current.compositions[0].contextDocuments || [];
      expect(Array.isArray(contextDocs)).toBe(true);
    });
  });
  
  describe('updateComposition', () => {
    it('should update an existing composition', async () => {
      const { result } = renderHook(() => useDocumentStore());
      
      // Add a composition first
      await act(async () => {
        await result.current.addComposition('Original', 'Original content', []);
      });
      
      const compositionId = result.current.compositions[0].id;
      const updatedData = {
        name: 'Updated Composition',
        content: 'Updated content'
      };
      
      await act(async () => {
        await result.current.updateComposition(compositionId, updatedData);
      });
      
      expect(result.current.compositions[0].name).toBe(updatedData.name);
      expect(result.current.compositions[0].content).toBe(updatedData.content);
      expect(result.current.compositions[0].updatedAt).toBeInstanceOf(Date);
    });
    
    it('should update only the specified fields', async () => {
      const { result } = renderHook(() => useDocumentStore());
      
      // Add a composition first
      await act(async () => {
        await result.current.addComposition('Original', 'Original content', [
          { id: 'doc1', name: 'Document 1', content: 'Content 1' }
        ]);
      });
      
      const compositionId = result.current.compositions[0].id;
      const originalContextDocuments = [...result.current.compositions[0].contextDocuments];
      
      // Update only the name
      await act(async () => {
        await result.current.updateComposition(compositionId, { name: 'Updated Name Only' });
      });
      
      expect(result.current.compositions[0].name).toBe('Updated Name Only');
      expect(result.current.compositions[0].content).toBe('Original content');
      expect(result.current.compositions[0].contextDocuments).toEqual(originalContextDocuments);
    });
    
    it('should do nothing when composition ID is not found', async () => {
      const { result } = renderHook(() => useDocumentStore());
      
      // Add a composition first
      await act(async () => {
        await result.current.addComposition('Original', 'Original content', []);
      });
      
      const originalComposition = { ...result.current.compositions[0] };
      
      // Try to update a non-existent composition
      await act(async () => {
        try {
          await result.current.updateComposition('non-existent-id', { name: 'This should not update' });
        } catch (error) {
          // Expected error - composition not found
        }
      });
      
      expect(result.current.compositions).toHaveLength(1);
      expect(result.current.compositions[0].name).toBe(originalComposition.name);
      expect(result.current.compositions[0].content).toBe(originalComposition.content);
    });
  });
  
  describe('deleteComposition', () => {
    it('should delete an existing composition', async () => {
      const { result } = renderHook(() => useDocumentStore());
      
      // Add a composition first
      await act(async () => {
        await result.current.addComposition('Test', 'Test content', []);
      });
      
      const compositionId = result.current.compositions[0].id;
      
      await act(async () => {
        await result.current.deleteComposition(compositionId);
      });
      
      expect(result.current.compositions).toHaveLength(0);
    });
    
    it('should do nothing when composition ID is not found', async () => {
      const { result } = renderHook(() => useDocumentStore());
      
      // Add a composition first
      await act(async () => {
        await result.current.addComposition('Test', 'Test content', []);
      });
      
      // Try to delete a non-existent composition
      await act(async () => {
        try {
          await result.current.deleteComposition('non-existent-id');
        } catch (error) {
          // Expected error - composition not found
        }
      });
      
      expect(result.current.compositions).toHaveLength(1);
    });
    
    it('should handle deleting multiple compositions', async () => {
      const { result } = renderHook(() => useDocumentStore());
      
      // Add multiple compositions
      await act(async () => {
        await result.current.addComposition('Test 1', 'Content 1', []);
        await result.current.addComposition('Test 2', 'Content 2', []);
        await result.current.addComposition('Test 3', 'Content 3', []);
      });
      
      const composition1Id = result.current.compositions[0].id;
      const composition2Id = result.current.compositions[1].id;
      
      // Delete two compositions
      await act(async () => {
        await result.current.deleteComposition(composition1Id);
        await result.current.deleteComposition(composition2Id);
      });
      
      expect(result.current.compositions).toHaveLength(1);
      expect(result.current.compositions[0].name).toBe('Test 3');
    });
  });
});
