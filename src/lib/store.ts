import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { 
  fetchDocuments, 
  fetchFolders, 
  saveDocumentToServer, 
  saveFolderToServer, 
  deleteDocumentFromServer, 
  deleteFolderFromServer,
  renameDocumentOnServer,
  moveDocumentOnServer,
  renameFolderOnServer,
  moveFolderOnServer,
  getBacklinksFromServer
} from './api-service';
import { 
  DEFAULT_LLM_PROVIDER, 
  DEFAULT_LLM_MODEL, 
  OPENAI_API_KEY, 
  GOOGLE_API_KEY 
} from './config';

export interface DocumentVersion {
  id: string;
  content: string;
  createdAt: Date;
  message?: string;
}

// Add this new interface for annotations
export interface Annotation {
  id: string;
  documentId: string;
  startOffset: number;
  endOffset: number;
  content: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
}

export interface Document {
  id: string;
  name: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  versions: DocumentVersion[];
  folderId: string | null; // Add folder reference
  annotations: Annotation[]; // Add annotations array
}

export interface Folder {
  id: string;
  name: string;
  createdAt: Date;
  parentId: string | null; // For nested folders
}

interface DocumentStore {
  documents: Document[];
  folders: Folder[];
  selectedDocumentId: string | null;
  selectedFolderId: string | null;
  comparisonDocumentIds: string[];
  isLoading: boolean;
  error: string | null;
  backlinks: { id: string, name: string }[];
  
  // Document operations
  addDocument: (name: string, content: string, folderId?: string | null) => Promise<void>;
  updateDocument: (id: string, data: Partial<Document>, createVersion?: boolean, versionMessage?: string) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  moveDocument: (documentId: string, folderId: string | null) => Promise<void>;
  renameDocument: (documentId: string, newName: string) => Promise<void>;
  selectDocument: (id: string | null) => void;
  
  // Folder operations
  addFolder: (name: string, parentId?: string | null) => Promise<void>;
  updateFolder: (id: string, name: string, parentId?: string | null) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  renameFolder: (folderId: string, newName: string) => Promise<void>;
  moveFolder: (folderId: string, parentId: string | null) => Promise<void>;
  selectFolder: (id: string | null) => void;
  
  // Annotation operations
  addAnnotation: (documentId: string, startOffset: number, endOffset: number, content: string, color?: string, tags?: string[]) => Promise<void>;
  updateAnnotation: (id: string, data: Partial<Annotation>) => Promise<void>;
  deleteAnnotation: (id: string) => Promise<void>;
  getDocumentAnnotations: (documentId: string) => Annotation[];
  searchAnnotations: (query: string) => Annotation[];
  
  // Backlinks operations
  loadBacklinks: (documentId: string) => Promise<void>;
  
  // Comparison operations
  toggleComparisonDocument: (id: string) => void;
  clearComparisonDocuments: () => void;
  getDocumentVersions: (id: string) => DocumentVersion[];
  
  // Data loading
  loadData: () => Promise<void>;
  setError: (error: string | null) => void;
}

// Helper function to fix Date objects after rehydration
const fixDates = (obj: any): any => {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Array) {
    return obj.map(fixDates);
  }

  const fixedObj = { ...obj };
  
  for (const key in fixedObj) {
    if (Object.prototype.hasOwnProperty.call(fixedObj, key)) {
      const value = fixedObj[key];
      
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
        fixedObj[key] = new Date(value);
      } else if (typeof value === 'object' && value !== null) {
        fixedObj[key] = fixDates(value);
      }
    }
  }
  
  return fixedObj;
};

export const useDocumentStore = create<DocumentStore>()(
  persist(
    (set, get) => ({
      documents: [],
      folders: [],
      selectedDocumentId: null,
      selectedFolderId: null,
      comparisonDocumentIds: [],
      isLoading: false,
      error: null,
      backlinks: [],
      
      setError: (error) => set({ error }),
      
      loadData: async () => {
        set({ isLoading: true, error: null });
        
        try {
          // Load documents and folders from the server
          const [documents, folders] = await Promise.all([
            fetchDocuments(),
            fetchFolders()
          ]);
          
          // Set the data from the server, or empty arrays if none exists
          set({ 
            documents: documents || [],
            folders: folders || [],
            isLoading: false 
          });
        } catch (error) {
          console.error('Error loading data:', error);
          set({ 
            isLoading: false,
            error: 'Failed to load data from server. Using local data instead.'
          });
        }
      },
      
      addDocument: async (name, content, folderId = null) => {
        set({ error: null });
        const timestamp = new Date();
        const newDocument: Document = {
          id: `doc-${timestamp.getTime()}`,
          name,
          content,
          createdAt: timestamp,
          updatedAt: timestamp,
          versions: [],
          folderId,
          annotations: [],
        };
        
        // Create an initial version
        const initialVersion: DocumentVersion = {
          id: `ver-${timestamp.getTime()}-initial`,
          content,
          createdAt: timestamp,
          message: "Initial version",
        };
        
        newDocument.versions = [initialVersion];
        
        // Update local state immediately
        set((state) => ({
          documents: [...state.documents, newDocument],
          selectedDocumentId: newDocument.id,
        }));
        
        // Then save to server
        try {
          await saveDocumentToServer(newDocument);
        } catch (error) {
          console.error('Error saving document to server:', error);
          set({ error: 'Failed to save document to server. Changes may not persist.' });
        }
      },
      
      updateDocument: async (id, data, createVersion = false, versionMessage = "") => {
        set({ error: null });
        const state = get();
        const documentToUpdate = state.documents.find(doc => doc.id === id);
        if (!documentToUpdate) return;
        
        let versions = [...(documentToUpdate.versions || [])];
        
        if (createVersion) {
          const timestamp = new Date();
          const newVersion: DocumentVersion = {
            id: `ver-${timestamp.getTime()}`,
            content: documentToUpdate.content,
            createdAt: timestamp,
            message: versionMessage || `Version created on ${timestamp.toLocaleString()}`,
          };
          versions = [newVersion, ...versions];
        }
        
        const updatedDoc = { 
          ...documentToUpdate, 
          ...data, 
          updatedAt: new Date(),
          versions: versions
        };
        
        // Update local state immediately
        set((state) => ({
          documents: state.documents.map((doc) => 
            doc.id === id ? updatedDoc : doc
          ),
        }));
        
        // Then save to server
        try {
          await saveDocumentToServer(updatedDoc);
        } catch (error) {
          console.error('Error updating document on server:', error);
          set({ error: 'Failed to update document on server. Changes may not persist.' });
        }
      },
      
      moveDocument: async (documentId, folderId) => {
        set({ error: null });
        
        try {
          const document = await moveDocumentOnServer(documentId, folderId);
          
          // Update local state
          set((state) => ({
            documents: state.documents.map((doc) => 
              doc.id === documentId ? document : doc
            ),
          }));
        } catch (error) {
          console.error('Error moving document:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to move document' });
        }
      },

      deleteDocument: async (id) => {
        set({ error: null });
        
        // Update local state immediately
        set((state) => ({
          documents: state.documents.filter((doc) => doc.id !== id),
          selectedDocumentId: state.selectedDocumentId === id 
            ? (state.documents.length > 1 
                ? state.documents.find(d => d.id !== id)?.id ?? null 
                : null) 
            : state.selectedDocumentId,
        }));
        
        // Then delete from server
        try {
          await deleteDocumentFromServer(id);
        } catch (error) {
          console.error('Error deleting document from server:', error);
          set({ error: 'Failed to delete document from server.' });
        }
      },
      
      addFolder: async (name, parentId = null) => {
        set({ error: null });
        const timestamp = new Date();
        const newFolder: Folder = {
          id: `folder-${timestamp.getTime()}`,
          name,
          createdAt: timestamp,
          parentId,
        };
        
        // Update local state immediately
        set((state) => ({
          folders: [...state.folders, newFolder],
        }));
        
        // Then save to server
        try {
          await saveFolderToServer(newFolder);
        } catch (error) {
          console.error('Error saving folder to server:', error);
          set({ error: 'Failed to save folder to server. Changes may not persist.' });
        }
      },
      
      updateFolder: async (id, name, parentId) => {
        set({ error: null });
        const state = get();
        const folderToUpdate = state.folders.find(folder => folder.id === id);
        
        if (!folderToUpdate) return;
        
        const updatedFolder = { 
          ...folderToUpdate, 
          name, 
          ...(parentId !== undefined ? { parentId } : {}) 
        };
        
        // Update local state immediately
        set((state) => ({
          folders: state.folders.map((folder) =>
            folder.id === id ? updatedFolder : folder
          ),
        }));
        
        // Then save to server
        try {
          await saveFolderToServer(updatedFolder);
        } catch (error) {
          console.error('Error updating folder on server:', error);
          set({ error: 'Failed to update folder on server. Changes may not persist.' });
        }
      },
      
      deleteFolder: async (id) => {
        set({ error: null });
        const state = get();
        
        // Move documents in the deleted folder to root in local state
        const documentsToUpdate = state.documents.filter(doc => doc.folderId === id);
        
        for (const doc of documentsToUpdate) {
          // Update local state immediately
          set((state) => ({
            documents: state.documents.map((d) =>
              d.id === doc.id
                ? { ...d, folderId: null }
                : d
            ),
          }));
          
          // Then save to server
          try {
            await saveDocumentToServer({ ...doc, folderId: null });
          } catch (error) {
            console.error('Error updating document on server:', error);
          }
        }
        
        // Update local state immediately
        set((state) => ({
          folders: state.folders.filter((folder) => folder.id !== id),
          selectedFolderId: state.selectedFolderId === id ? null : state.selectedFolderId,
        }));
        
        // Then delete from server
        try {
          await deleteFolderFromServer(id);
        } catch (error) {
          console.error('Error deleting folder from server:', error);
          set({ error: 'Failed to delete folder from server.' });
        }
      },
      
      selectDocument: (id) => set({ selectedDocumentId: id }),
      
      selectFolder: (id) => set({ selectedFolderId: id }),
      
      toggleComparisonDocument: (id) => set((state) => {
        const { comparisonDocumentIds } = state;
        
        if (comparisonDocumentIds.includes(id)) {
          return {
            comparisonDocumentIds: comparisonDocumentIds.filter((docId) => docId !== id),
          };
        } else {
          // Only allow up to 2 documents for comparison
          const newComparisonIds = [...comparisonDocumentIds, id].slice(-2);
          return {
            comparisonDocumentIds: newComparisonIds,
          };
        }
      }),
      
      clearComparisonDocuments: () => set({ comparisonDocumentIds: [] }),
      
      getDocumentVersions: (id) => {
        const state = get();
        const document = state.documents.find(doc => doc.id === id);
        return document?.versions || [];
      },
      
      // Add new methods for Obsidian-like features
      renameDocument: async (documentId, newName) => {
        set({ error: null });
        
        try {
          const { document, updatedLinks } = await renameDocumentOnServer(documentId, newName);
          
          // Update local state
          set((state) => ({
            documents: state.documents.map((doc) => 
              doc.id === documentId ? document : doc
            ),
          }));
          
          // Show success message if links were updated
          if (updatedLinks > 0) {
            set({ error: `Updated ${updatedLinks} links to this document` });
          }
        } catch (error) {
          console.error('Error renaming document:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to rename document' });
        }
      },
      
      renameFolder: async (folderId, newName) => {
        set({ error: null });
        
        try {
          const folder = await renameFolderOnServer(folderId, newName);
          
          // Update local state
          set((state) => ({
            folders: state.folders.map((f) => 
              f.id === folderId ? folder : f
            ),
          }));
        } catch (error) {
          console.error('Error renaming folder:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to rename folder' });
        }
      },
      
      moveFolder: async (folderId, parentId) => {
        set({ error: null });
        
        try {
          const folder = await moveFolderOnServer(folderId, parentId);
          
          // Update local state
          set((state) => ({
            folders: state.folders.map((f) => 
              f.id === folderId ? folder : f
            ),
          }));
        } catch (error) {
          console.error('Error moving folder:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to move folder' });
        }
      },
      
      loadBacklinks: async (documentId) => {
        set({ isLoading: true, error: null });
        
        try {
          const backlinks = await getBacklinksFromServer(documentId);
          set({ backlinks, isLoading: false });
        } catch (error) {
          console.error('Error loading backlinks:', error);
          set({ 
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to load backlinks',
            backlinks: []
          });
        }
      },
      
      // Annotation operations
      addAnnotation: async (documentId, startOffset, endOffset, content, color = "", tags = []) => {
        set({ error: null });
        const timestamp = new Date();
        const state = get();
        const document = state.documents.find(doc => doc.id === documentId);
        if (!document) return;
        
        const newAnnotation: Annotation = {
          id: `anno-${timestamp.getTime()}`,
          documentId,
          startOffset,
          endOffset,
          content,
          color,
          createdAt: timestamp,
          updatedAt: timestamp,
          tags,
        };
        
        // Ensure annotations is initialized as an array
        const existingAnnotations = Array.isArray(document.annotations) ? document.annotations : [];
        
        // Update local state immediately
        set((state) => ({
          documents: state.documents.map((doc) =>
            doc.id === documentId ? { ...doc, annotations: [...existingAnnotations, newAnnotation] } : doc
          ),
        }));
        
        // Then save to server
        try {
          await saveDocumentToServer({ 
            ...document, 
            annotations: Array.isArray(document.annotations) ? [...document.annotations, newAnnotation] : [newAnnotation] 
          });
        } catch (error) {
          console.error('Error saving annotation to server:', error);
          set({ error: 'Failed to save annotation to server. Changes may not persist.' });
        }
      },
      
      updateAnnotation: async (id, data) => {
        set({ error: null });
        const state = get();
        // Find the document containing this annotation
        let targetDocument: Document | undefined;
        let annotationDocumentId: string = '';
        
        for (const doc of state.documents) {
          // Ensure annotations is initialized as an array
          const docAnnotations = Array.isArray(doc.annotations) ? doc.annotations : [];
          const foundAnnotation = docAnnotations.find(anno => anno.id === id);
          if (foundAnnotation) {
            targetDocument = doc;
            annotationDocumentId = doc.id;
            break;
          }
        }
        
        if (!targetDocument) return;
        
        // Ensure annotations is initialized as an array
        const targetAnnotations = Array.isArray(targetDocument.annotations) ? targetDocument.annotations : [];
        
        const updatedAnnotations = targetAnnotations.map((anno) =>
          anno.id === id ? { ...anno, ...data, updatedAt: new Date() } : anno
        );
        
        // Update local state immediately
        set((state) => ({
          documents: state.documents.map((doc) =>
            doc.id === annotationDocumentId ? { ...doc, annotations: updatedAnnotations } : doc
          ),
        }));
        
        // Then save to server
        try {
          await saveDocumentToServer({ ...targetDocument, annotations: updatedAnnotations });
        } catch (error) {
          console.error('Error updating annotation on server:', error);
          set({ error: 'Failed to update annotation on server. Changes may not persist.' });
        }
      },
      
      deleteAnnotation: async (id) => {
        set({ error: null });
        const state = get();
        // Find the document containing this annotation
        let targetDocument: Document | undefined;
        let annotationDocumentId: string = '';
        
        for (const doc of state.documents) {
          // Ensure annotations is initialized as an array
          const docAnnotations = Array.isArray(doc.annotations) ? doc.annotations : [];
          const foundAnnotation = docAnnotations.find(anno => anno.id === id);
          if (foundAnnotation) {
            targetDocument = doc;
            annotationDocumentId = doc.id;
            break;
          }
        }
        
        if (!targetDocument) return;
        
        // Ensure annotations is initialized as an array
        const targetAnnotations = Array.isArray(targetDocument.annotations) ? targetDocument.annotations : [];
        
        const updatedAnnotations = targetAnnotations.filter((anno) => anno.id !== id);
        
        // Update local state immediately
        set((state) => ({
          documents: state.documents.map((doc) =>
            doc.id === annotationDocumentId ? { ...doc, annotations: updatedAnnotations } : doc
          ),
        }));
        
        // Then save to server
        try {
          await saveDocumentToServer({ ...targetDocument, annotations: updatedAnnotations });
        } catch (error) {
          console.error('Error deleting annotation from server:', error);
          set({ error: 'Failed to delete annotation from server. Changes may not persist.' });
        }
      },
      
      getDocumentAnnotations: (documentId) => {
        const state = get();
        const document = state.documents.find(doc => doc.id === documentId);
        // Ensure annotations is initialized as an array
        return Array.isArray(document?.annotations) ? document.annotations : [];
      },
      
      searchAnnotations: (query) => {
        const state = get();
        const results = state.documents.flatMap(doc => {
          // Ensure annotations is initialized as an array
          const docAnnotations = Array.isArray(doc.annotations) ? doc.annotations : [];
          return docAnnotations.filter(anno =>
            anno.content.toLowerCase().includes(query.toLowerCase())
          );
        });
        return results;
      },
    }),
    {
      name: 'document-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        documents: state.documents,
        folders: state.folders,
        selectedDocumentId: state.selectedDocumentId,
        selectedFolderId: state.selectedFolderId,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Fix dates after rehydration
          state.documents = fixDates(state.documents);
          state.folders = fixDates(state.folders);
          
          // Load data from server
          state.loadData();
        }
      },
    }
  )
);

// LLM Provider Store
type LLMProvider = 'openai' | 'gemini' | string;

interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  model: string;
  googleApiKey?: string;
}

interface LLMStore {
  config: LLMConfig;
  updateConfig: (config: Partial<LLMConfig>) => void;
  getApiKey: () => string;
}

export const useLLMStore = create<LLMStore>()(
  persist(
    (set, get) => ({
      config: {
        provider: DEFAULT_LLM_PROVIDER as LLMProvider,
        apiKey: DEFAULT_LLM_PROVIDER === 'openai' ? OPENAI_API_KEY : '',
        googleApiKey: DEFAULT_LLM_PROVIDER === 'gemini' ? GOOGLE_API_KEY : '',
        model: DEFAULT_LLM_MODEL,
      } as {
        provider: string;
        apiKey: string;
        googleApiKey?: string;
        model: string;
      },
      updateConfig: (newConfig) => set((state) => ({
        config: { ...state.config, ...newConfig },
      })),
      getApiKey: () => {
        const { provider, apiKey, googleApiKey } = get().config;
        if (typeof provider === 'string' && provider.toLowerCase() === 'gemini') {
          return googleApiKey || GOOGLE_API_KEY || '';
        }
        return apiKey || OPENAI_API_KEY || '';
      },
    }),
    {
      name: 'llm-config',
      storage: createJSONStorage(() => localStorage),
    }
  )
); 