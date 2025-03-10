import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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
  
  // Document operations
  addDocument: (name: string, content: string, folderId?: string | null) => void;
  updateDocument: (id: string, data: Partial<Document>, createVersion?: boolean, versionMessage?: string) => void;
  deleteDocument: (id: string) => void;
  moveDocument: (documentId: string, folderId: string | null) => void;
  selectDocument: (id: string | null) => void;
  
  // Folder operations
  addFolder: (name: string, parentId?: string | null) => void;
  updateFolder: (id: string, name: string, parentId?: string | null) => void;
  deleteFolder: (id: string) => void;
  selectFolder: (id: string | null) => void;
  
  // Comparison operations
  toggleComparisonDocument: (id: string) => void;
  clearComparisonDocuments: () => void;
  getDocumentVersions: (id: string) => DocumentVersion[];
}

// Initial folders
const initialFolders: Folder[] = [
  {
    id: "folder-1",
    name: "Getting Started",
    createdAt: new Date(),
    parentId: null,
  }
];

// Initial documents
const initialDocuments: Document[] = [
  {
    id: "doc1",
    name: "Welcome",
    content: "# Getting Started\n\nWelcome to the Markdown Writing App!",
    createdAt: new Date(),
    updatedAt: new Date(),
    versions: [],
    folderId: "folder-1",
  },
  {
    id: "doc2",
    name: "Features",
    content: "# Features\n\n- Markdown editing\n- AI assistance\n- Multiple document support",
    createdAt: new Date(),
    updatedAt: new Date(),
    versions: [],
    folderId: null,
  },
  {
    id: "doc3",
    name: "Tips & Tricks",
    content: "# Tips & Tricks\n\n1. Use keyboard shortcuts\n2. Save often\n3. Experiment with AI",
    createdAt: new Date(),
    updatedAt: new Date(),
    versions: [],
    folderId: null,
  },
];

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
      documents: initialDocuments,
      folders: initialFolders,
      selectedDocumentId: null,
      selectedFolderId: null,
      comparisonDocumentIds: [],
      
      addDocument: (name, content, folderId = null) => set((state) => {
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
        
        return {
          documents: [...state.documents, newDocument],
          selectedDocumentId: newDocument.id,
        };
      }),
      
      updateDocument: (id, data, createVersion = false, versionMessage = "") => set((state) => {
        const documentToUpdate = state.documents.find(doc => doc.id === id);
        if (!documentToUpdate) return state;
        
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
        
        return {
          documents: state.documents.map((doc) => 
            doc.id === id 
              ? { 
                  ...doc, 
                  ...data, 
                  updatedAt: new Date(),
                  versions: versions
                } 
              : doc
          ),
        };
      }),
      
      moveDocument: (documentId, folderId) => set((state) => ({
        documents: state.documents.map((doc) =>
          doc.id === documentId
            ? { ...doc, folderId }
            : doc
        ),
      })),

      deleteDocument: (id) => set((state) => ({
        documents: state.documents.filter((doc) => doc.id !== id),
        selectedDocumentId: state.selectedDocumentId === id 
          ? (state.documents.length > 1 
              ? state.documents.find(d => d.id !== id)?.id ?? null 
              : null) 
          : state.selectedDocumentId,
      })),
      
      addFolder: (name, parentId = null) => set((state) => {
        const timestamp = new Date();
        const newFolder: Folder = {
          id: `folder-${timestamp.getTime()}`,
          name,
          createdAt: timestamp,
          parentId,
        };
        
        return {
          folders: [...state.folders, newFolder],
          // Don't automatically select the new folder
        };
      }),
      
      updateFolder: (id, name, parentId) => set((state) => ({
        folders: state.folders.map((folder) =>
          folder.id === id
            ? { ...folder, name, ...(parentId !== undefined ? { parentId } : {}) }
            : folder
        ),
      })),
      
      deleteFolder: (id) => set((state) => {
        // Move documents in the deleted folder to root
        const updatedDocuments = state.documents.map((doc) =>
          doc.folderId === id
            ? { ...doc, folderId: null }
            : doc
        );
        
        // Remove the folder and its children
        const folderIdsToRemove = new Set<string>();
        const addFolderAndChildren = (folderId: string) => {
          folderIdsToRemove.add(folderId);
          state.folders
            .filter(f => f.parentId === folderId)
            .forEach(child => addFolderAndChildren(child.id));
        };
        addFolderAndChildren(id);
        
        return {
          folders: state.folders.filter((folder) => !folderIdsToRemove.has(folder.id)),
          documents: updatedDocuments,
          selectedFolderId: state.selectedFolderId === id ? null : state.selectedFolderId,
        };
      }),
      
      selectDocument: (id) => set({ selectedDocumentId: id }),
      selectFolder: (id) => set({ selectedFolderId: id }),
      
      toggleComparisonDocument: (id) => set((state) => {
        // If document is already selected, remove it
        if (state.comparisonDocumentIds.includes(id)) {
          return {
            comparisonDocumentIds: state.comparisonDocumentIds.filter((docId) => docId !== id)
          };
        }
        
        // If we already have 2 documents selected and trying to add a new one, don't add it
        if (state.comparisonDocumentIds.length >= 2) {
          return state;
        }
        
        // Otherwise add the document to the selection
        return {
          comparisonDocumentIds: [...state.comparisonDocumentIds, id]
        };
      }),
      
      clearComparisonDocuments: () => set({ comparisonDocumentIds: [] }),
      
      getDocumentVersions: (id) => {
        const document = get().documents.find(doc => doc.id === id);
        return document?.versions || [];
      },
    }),
    {
      name: 'document-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        documents: state.documents,
        folders: state.folders,
        selectedDocumentId: state.selectedDocumentId,
        selectedFolderId: state.selectedFolderId,
        comparisonDocumentIds: state.comparisonDocumentIds,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (state.documents) {
            state.documents = state.documents.map(doc => ({
              ...doc,
              createdAt: new Date(doc.createdAt),
              updatedAt: new Date(doc.updatedAt),
              versions: (doc.versions || []).map(ver => ({
                ...ver,
                createdAt: new Date(ver.createdAt)
              }))
            }));
          }
          if (state.folders) {
            state.folders = state.folders.map(folder => ({
              ...folder,
              createdAt: new Date(folder.createdAt)
            }));
          }
        }
        console.log('Rehydrated state:', state);
      }
    }
  )
);

// LLM Provider Store
interface LLMConfig {
  provider: string;
  apiKey: string;
  model: string;
}

interface LLMStore {
  config: LLMConfig;
  updateConfig: (config: Partial<LLMConfig>) => void;
}

export const useLLMStore = create<LLMStore>()(
  persist(
    (set) => ({
      config: {
        provider: 'openai',
        apiKey: '',
        model: 'gpt-4',
      },
      updateConfig: (newConfig) => set((state) => ({
        config: { ...state.config, ...newConfig },
      })),
    }),
    {
      name: 'llm-config',
      storage: createJSONStorage(() => localStorage),
    }
  )
); 