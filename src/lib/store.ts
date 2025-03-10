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
}

interface DocumentStore {
  documents: Document[];
  selectedDocumentId: string | null;
  comparisonDocumentIds: string[]; // Array to store documents selected for comparison
  addDocument: (name: string, content: string) => void;
  updateDocument: (id: string, data: Partial<Document>, createVersion?: boolean, versionMessage?: string) => void;
  deleteDocument: (id: string) => void;
  selectDocument: (id: string | null) => void;
  toggleComparisonDocument: (id: string) => void; // Toggle a document for comparison
  clearComparisonDocuments: () => void; // Clear all comparison selections
  getDocumentVersions: (id: string) => DocumentVersion[];
}

// Initial documents
const initialDocuments: Document[] = [
  {
    id: "doc1",
    name: "Getting Started",
    content: "# Getting Started\n\nWelcome to the Markdown Writing App!",
    createdAt: new Date(),
    updatedAt: new Date(),
    versions: [],
  },
  {
    id: "doc2",
    name: "Features",
    content: "# Features\n\n- Markdown editing\n- AI assistance\n- Multiple document support",
    createdAt: new Date(),
    updatedAt: new Date(),
    versions: [],
  },
  {
    id: "doc3",
    name: "Tips & Tricks",
    content: "# Tips & Tricks\n\n1. Use keyboard shortcuts\n2. Save often\n3. Experiment with AI",
    createdAt: new Date(),
    updatedAt: new Date(),
    versions: [],
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
      selectedDocumentId: null,
      comparisonDocumentIds: [],
      
      addDocument: (name, content) => set((state) => {
        const timestamp = new Date();
        const newDocument: Document = {
          id: `doc-${timestamp.getTime()}`,
          name,
          content,
          createdAt: timestamp,
          updatedAt: timestamp,
          versions: [], // Initialize with empty array
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
        
        // Create a new version if requested
        let versions = [...(documentToUpdate.versions || [])];
        
        // Always create a version when explicitly requested, even if content hasn't changed
        if (createVersion) {
          const timestamp = new Date();
          const newVersion: DocumentVersion = {
            id: `ver-${timestamp.getTime()}`,
            content: documentToUpdate.content,
            createdAt: timestamp,
            message: versionMessage || `Version created on ${timestamp.toLocaleString()}`,
          };
          versions = [newVersion, ...versions];
          console.log('Created new version:', newVersion, 'for document:', documentToUpdate.name);
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
      
      deleteDocument: (id) => set((state) => ({
        documents: state.documents.filter((doc) => doc.id !== id),
        selectedDocumentId: state.selectedDocumentId === id 
          ? (state.documents.length > 1 
              ? state.documents.find(d => d.id !== id)?.id ?? null 
              : null) 
          : state.selectedDocumentId,
      })),
      
      selectDocument: (id) => set({ selectedDocumentId: id }),
      
      toggleComparisonDocument: (id) => set((state) => ({
        comparisonDocumentIds: state.comparisonDocumentIds.includes(id)
          ? state.comparisonDocumentIds.filter((docId) => docId !== id)
          : [...state.comparisonDocumentIds, id],
      })),
      
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
        selectedDocumentId: state.selectedDocumentId,
        comparisonDocumentIds: state.comparisonDocumentIds,
      }),
      onRehydrateStorage: () => (state) => {
        // Fix dates and ensure all documents have a versions array
        if (state && state.documents) {
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
    }
  )
); 