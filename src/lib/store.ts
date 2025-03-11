import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { 
  fetchDocuments, 
  fetchFolders, 
  saveDocumentToServer, 
  saveFolderToServer, 
  deleteDocumentFromServer, 
  deleteFolderFromServer 
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

export interface Document {
  id: string;
  name: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  versions: DocumentVersion[];
  folderId: string | null; // Add folder reference
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
  
  // Document operations
  addDocument: (name: string, content: string, folderId?: string | null) => Promise<void>;
  updateDocument: (id: string, data: Partial<Document>, createVersion?: boolean, versionMessage?: string) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  moveDocument: (documentId: string, folderId: string | null) => Promise<void>;
  selectDocument: (id: string | null) => void;
  
  // Folder operations
  addFolder: (name: string, parentId?: string | null) => Promise<void>;
  updateFolder: (id: string, name: string, parentId?: string | null) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  selectFolder: (id: string | null) => void;
  
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
        const state = get();
        const documentToMove = state.documents.find(doc => doc.id === documentId);
        
        if (!documentToMove) return;
        
        const updatedDoc = { ...documentToMove, folderId };
        
        // Update local state immediately
        set((state) => ({
          documents: state.documents.map((doc) =>
            doc.id === documentId
              ? updatedDoc
              : doc
          ),
        }));
        
        // Then save to server
        try {
          await saveDocumentToServer(updatedDoc);
        } catch (error) {
          console.error('Error moving document on server:', error);
          set({ error: 'Failed to move document on server. Changes may not persist.' });
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
interface LLMConfig {
  provider: string;
  apiKey: string;
  model: string;
  googleApiKey?: string;
  promptTemplate: string;
  customInstructions: string;
}

interface LLMStore {
  config: LLMConfig;
  updateConfig: (config: Partial<LLMConfig>) => void;
  getApiKey: () => string;
}

// Default prompt template
const DEFAULT_PROMPT_TEMPLATE = `{{#if contextDocuments}}
Context Documents:

{{#each contextDocuments}}
Document {{@index + 1}} Title: {{name}}
Document {{@index + 1}} Content:
{{content}}

{{/each}}
{{/if}}

User Message: {{userMessage}}

{{customInstructions}}

Please provide a helpful response based on the user request{{#if contextDocuments}} and the provided context documents{{/if}}.`;

// Default custom instructions
const DEFAULT_CUSTOM_INSTRUCTIONS = `Be concise, accurate, and helpful. If you're unsure about something, acknowledge the uncertainty.`;

export const useLLMStore = create<LLMStore>()(
  persist(
    (set, get) => ({
      config: {
        provider: DEFAULT_LLM_PROVIDER,
        apiKey: DEFAULT_LLM_PROVIDER === 'openai' ? OPENAI_API_KEY : '',
        googleApiKey: DEFAULT_LLM_PROVIDER === 'gemini' ? GOOGLE_API_KEY : '',
        model: DEFAULT_LLM_MODEL,
        promptTemplate: DEFAULT_PROMPT_TEMPLATE,
        customInstructions: DEFAULT_CUSTOM_INSTRUCTIONS,
      },
      updateConfig: (newConfig) => set((state) => ({
        config: { ...state.config, ...newConfig },
      })),
      getApiKey: () => {
        const { provider, apiKey, googleApiKey } = get().config;
        if (provider === 'gemini') {
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