// @ts-nocheck
import { act, renderHook } from '@testing-library/react';
import { useDocumentStore } from '../../lib/store';
import * as apiService from '../../lib/api-service';

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

describe('Document Store - Multiple Document Operations', () => {
  beforeEach(() => {
    // Clear all mocks before each test
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

  describe('deleteMultipleDocuments', () => {
    it('should delete multiple documents', async () => {
      // Setup test documents
      const documents = [
        { id: 'doc1', name: 'Document 1', content: 'Content 1', createdAt: new Date(), updatedAt: new Date(), versions: [], folderId: null, annotations: [] },
        { id: 'doc2', name: 'Document 2', content: 'Content 2', createdAt: new Date(), updatedAt: new Date(), versions: [], folderId: null, annotations: [] },
        { id: 'doc3', name: 'Document 3', content: 'Content 3', createdAt: new Date(), updatedAt: new Date(), versions: [], folderId: null, annotations: [] }
      ];
      
      // Mock API response
      (apiService.deleteDocumentFromServer as jest.Mock).mockResolvedValue(undefined);
      
      const { result } = renderHook(() => useDocumentStore());
      
      // Initialize store with test documents
      act(() => {
        result.current.documents = documents;
        result.current.selectedDocumentId = 'doc1';
        result.current.comparisonDocumentIds = ['doc1', 'doc2'];
      });
      
      // Delete multiple documents
      await act(async () => {
        await result.current.deleteMultipleDocuments(['doc1', 'doc2']);
      });
      
      // Verify documents were removed from store
      expect(result.current.documents).toHaveLength(1);
      expect(result.current.documents[0].id).toBe('doc3');
      
      // Verify API was called for each document
      expect(apiService.deleteDocumentFromServer).toHaveBeenCalledTimes(2);
      expect(apiService.deleteDocumentFromServer).toHaveBeenCalledWith('doc1');
      expect(apiService.deleteDocumentFromServer).toHaveBeenCalledWith('doc2');
      
      // Verify selected document was updated
      expect(result.current.selectedDocumentId).toBe('doc3');
      
      // Verify comparison documents were updated
      expect(result.current.comparisonDocumentIds).toEqual([]);
    });
    
    it('should handle errors when deleting multiple documents', async () => {
      // Setup test documents
      const documents = [
        { id: 'doc1', name: 'Document 1', content: 'Content 1', createdAt: new Date(), updatedAt: new Date(), versions: [], folderId: null, annotations: [] },
        { id: 'doc2', name: 'Document 2', content: 'Content 2', createdAt: new Date(), updatedAt: new Date(), versions: [], folderId: null, annotations: [] }
      ];
      
      // Mock API error
      (apiService.deleteDocumentFromServer as jest.Mock).mockRejectedValue(new Error('Failed to delete'));
      
      const { result } = renderHook(() => useDocumentStore());
      
      // Initialize store with test documents
      act(() => {
        result.current.documents = documents;
      });
      
      // Attempt to delete documents
      await act(async () => {
        await result.current.deleteMultipleDocuments(['doc1', 'doc2']);
      });
      
      // Verify error was set
      expect(result.current.error).toBe('Failed to delete some documents from server.');
    });
    
    it('should handle empty array of document IDs', async () => {
      const { result } = renderHook(() => useDocumentStore());
      
      // Call with empty array
      await act(async () => {
        await result.current.deleteMultipleDocuments([]);
      });
      
      // Verify API was not called
      expect(apiService.deleteDocumentFromServer).not.toHaveBeenCalled();
    });
    
    it('should update selected document ID when current selection is deleted', async () => {
      // Setup test documents
      const documents = [
        { id: 'doc1', name: 'Document 1', content: 'Content 1', createdAt: new Date(), updatedAt: new Date(), versions: [], folderId: null, annotations: [] },
        { id: 'doc2', name: 'Document 2', content: 'Content 2', createdAt: new Date(), updatedAt: new Date(), versions: [], folderId: null, annotations: [] }
      ];
      
      // Mock API response
      (apiService.deleteDocumentFromServer as jest.Mock).mockResolvedValue(undefined);
      
      const { result } = renderHook(() => useDocumentStore());
      
      // Initialize store with test documents
      act(() => {
        result.current.documents = documents;
        result.current.selectedDocumentId = 'doc1';
      });
      
      // Delete the selected document
      await act(async () => {
        await result.current.deleteMultipleDocuments(['doc1']);
      });
      
      // Verify selected document was updated to the remaining document
      expect(result.current.selectedDocumentId).toBe('doc2');
    });
    
    it('should set selected document ID to null when all documents are deleted', async () => {
      // Setup test documents
      const documents = [
        { id: 'doc1', name: 'Document 1', content: 'Content 1', createdAt: new Date(), updatedAt: new Date(), versions: [], folderId: null, annotations: [] }
      ];
      
      // Mock API response
      (apiService.deleteDocumentFromServer as jest.Mock).mockResolvedValue(undefined);
      
      const { result } = renderHook(() => useDocumentStore());
      
      // Initialize store with test documents
      act(() => {
        result.current.documents = documents;
        result.current.selectedDocumentId = 'doc1';
      });
      
      // Delete all documents
      await act(async () => {
        await result.current.deleteMultipleDocuments(['doc1']);
      });
      
      // Verify selected document was set to null
      expect(result.current.selectedDocumentId).toBeNull();
      expect(result.current.documents).toHaveLength(0);
    });
  });
});
