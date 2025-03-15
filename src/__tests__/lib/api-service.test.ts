// @ts-nocheck
import { 
  fetchDocuments, 
  saveDocumentToServer, 
  deleteDocumentFromServer,
  renameDocumentOnServer,
  moveDocumentOnServer,
  getBacklinksFromServer,
  fetchFolders,
  saveFolderToServer,
  deleteFolderFromServer,
  renameFolderOnServer,
  moveFolderOnServer,
  fetchTemplates,
  processTemplate
} from '../../lib/api-service';
import { Document, Folder } from '../../lib/store';

// Mock fetch globally
global.fetch = jest.fn();

describe('api-service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchDocuments', () => {
    it('should fetch documents successfully', async () => {
      const mockDocuments = [
        { id: '1', name: 'Document 1', content: 'Content 1' },
        { id: '2', name: 'Document 2', content: 'Content 2' }
      ];
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockDocuments
      });

      const result = await fetchDocuments();
      
      expect(global.fetch).toHaveBeenCalledWith('/api/documents', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      expect(result).toEqual(mockDocuments);
    });

    it('should handle fetch error', async () => {
      const errorMessage = 'Network error';
      
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

      await expect(fetchDocuments()).rejects.toThrow(errorMessage);
    });

    it('should handle API error response', async () => {
      const errorResponse = {
        ok: false,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Server error' })
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce(errorResponse);

      await expect(fetchDocuments()).rejects.toThrow('Server error');
    });
  });

  describe('saveDocumentToServer', () => {
    it('should save document successfully', async () => {
      const document: Partial<Document> = {
        id: '1',
        name: 'Test Document',
        content: 'Test Content'
      };
      
      const savedDocument = { ...document, updatedAt: new Date() };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => savedDocument
      });
      const result = await saveDocumentToServer(document as Document);
      
      expect(global.fetch).toHaveBeenCalledWith('/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(document),
      });
      expect(result).toEqual(savedDocument);
    });

    it('should handle API error when saving document', async () => {
      const document: Partial<Document> = {
        id: '1',
        name: 'Test Document',
        content: 'Test Content'
      };
      
      const errorResponse = {
        ok: false,
        statusText: 'Bad Request',
        json: async () => ({ error: 'Invalid document format' })
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce(errorResponse);

      await expect(saveDocumentToServer(document as Document)).rejects.toThrow('Invalid document format');
    });
  });

  describe('deleteDocumentFromServer', () => {
    it('should delete document successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });
      await deleteDocumentFromServer('1');
      
      expect(global.fetch).toHaveBeenCalledWith('/api/documents?id=1', {
        method: 'DELETE',
      });
    });

    it('should handle API error when deleting document', async () => {
      const errorResponse = {
        ok: false,
        statusText: 'Not Found',
        json: async () => ({ error: 'Document not found' })
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce(errorResponse);

      await expect(deleteDocumentFromServer('1')).rejects.toThrow('Document not found');
    });
  });

  describe('renameDocumentOnServer', () => {
    it('should rename document successfully', async () => {
      const mockResponse = {
        document: { id: '1', name: 'New Name' },
        updatedLinks: 2
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });
      const result = await renameDocumentOnServer('1', 'New Name');
      
      expect(global.fetch).toHaveBeenCalledWith('/api/documents/rename', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: '1', newName: 'New Name' }),
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('moveDocumentOnServer', () => {
    it('should move document successfully', async () => {
      const mockDocument = { id: '1', name: 'Document', folderId: '2' };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockDocument
      });
      const result = await moveDocumentOnServer('1', '2');
      
      expect(global.fetch).toHaveBeenCalledWith('/api/documents/move', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: '1', targetFolderId: '2' }),
      });
      expect(result).toEqual(mockDocument);
    });
  });

  describe('getBacklinksFromServer', () => {
    it('should fetch backlinks successfully', async () => {
      const mockBacklinks = [
        { id: '1', name: 'Document 1' },
        { id: '2', name: 'Document 2' }
      ];
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBacklinks
      });
      const result = await getBacklinksFromServer('1');
      
      expect(global.fetch).toHaveBeenCalledWith('/api/backlinks?id=1', expect.objectContaining({
        method: 'GET',
      }));
      expect(result).toEqual(mockBacklinks);
    });
  });

  describe('fetchFolders', () => {
    it('should fetch folders successfully', async () => {
      const mockFolders = [
        { id: '1', name: 'Folder 1' },
        { id: '2', name: 'Folder 2' }
      ];
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockFolders
      });
      const result = await fetchFolders();
      
      expect(global.fetch).toHaveBeenCalledWith('/api/folders', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      expect(result).toEqual(mockFolders);
    });
  });

  describe('saveFolderToServer', () => {
    it('should save folder successfully', async () => {
      const folder: Partial<Folder> = {
        id: '1',
        name: 'Test Folder'
      };
      
      const savedFolder = { ...folder, createdAt: new Date() };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => savedFolder
      });
      const result = await saveFolderToServer(folder as Folder);
      
      expect(global.fetch).toHaveBeenCalledWith('/api/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(folder),
      });
      expect(result).toEqual(savedFolder);
    });
  });

  describe('deleteFolderFromServer', () => {
    it('should delete folder successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });
      await deleteFolderFromServer('1');
      
      expect(global.fetch).toHaveBeenCalledWith('/api/folders?id=1', {
        method: 'DELETE',
      });
    });
  });

  describe('renameFolderOnServer', () => {
    it('should rename folder successfully', async () => {
      const mockFolder = { id: '1', name: 'New Name' };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockFolder
      });
      const result = await renameFolderOnServer('1', 'New Name');
      
      expect(global.fetch).toHaveBeenCalledWith('/api/folders/rename', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: '1', newName: 'New Name' }),
      });
      expect(result).toEqual(mockFolder);
    });
  });

  describe('moveFolderOnServer', () => {
    it('should move folder successfully', async () => {
      const mockFolder = { id: '1', name: 'Folder', parentId: '2' };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockFolder
      });
      const result = await moveFolderOnServer('1', '2');
      
      expect(global.fetch).toHaveBeenCalledWith('/api/folders/move', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: '1', targetParentId: '2' }),
      });
      expect(result).toEqual(mockFolder);
    });
  });

  describe('fetchTemplates', () => {
    it('should fetch templates successfully', async () => {
      const mockTemplates = [
        { name: 'Template 1', path: '/templates/1.md' },
        { name: 'Template 2', path: '/templates/2.md' }
      ];
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTemplates
      });
      const result = await fetchTemplates();
      
      expect(global.fetch).toHaveBeenCalledWith('/api/templates');
      expect(result).toEqual(mockTemplates);
    });
  });

  describe('processTemplate', () => {
    it('should process template successfully', async () => {
      const mockContent = 'Processed template content';
      const templateName = 'test-template';
      const variables = { title: 'Test Title', author: 'Test Author' };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content: mockContent })
      });
      const result = await processTemplate(templateName, variables);
      
      expect(global.fetch).toHaveBeenCalledWith(`/api/templates?name=${encodeURIComponent(templateName)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(variables),
      });
      expect(result).toEqual(mockContent);
    });
  });
});
