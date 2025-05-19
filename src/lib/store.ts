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
  getBacklinksFromServer,
  loadFilterFromServer,
  copyFolderOnServer,
} from './api-service';
import { 
  DEFAULT_LLM_PROVIDER, 
  DEFAULT_LLM_MODEL, 
  OPENAI_API_KEY, 
  GOOGLE_API_KEY,
  ANTHROPIC_API_KEY,
  ENABLE_AI_CACHE,
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_TOKENS
} from './config';
import { fuzzySearch } from './search-utils';
import { ChatMessage, generateChatResponse } from './llm-service';
import { getAvailableAIRoles } from './ai-roles';
import { 
  SpecialDirectoryType, 
  initializeSpecialDirectories,
  SpecialDirectoryIds
} from './special-directories';

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

// Add this new interface for compositions
export interface Composition {
  id: string;
  name: string;
  content: string;
  contextDocuments: Array<{id: string; name: string; content?: string}>;
  createdAt: Date;
  updatedAt: Date;
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
  contextDocuments?: Array<{id: string; name: string; content?: string}>; // Add contextDocuments for compositions
  extension?: string; // Add extension property to track .md or .mdx
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
  compositions: Composition[]; // Add compositions array
  selectedDocumentId: string | null;
  selectedFolderId: string | null;
  comparisonDocumentIds: string[];
  selectedFolderIds: string[]; // Add selected folder IDs
  isLoading: boolean;
  error: string | null | {
    message: string;
    canRecurse?: boolean;
    folderId?: string;
    documentCount?: number;
  };
  backlinks: { id: string, name: string }[];
  
  // Document operations
  addDocument: (name: string, content: string, folderId?: string | null) => Promise<string>;
  updateDocument: (id: string, data: Partial<Document>, createVersion?: boolean, versionMessage?: string) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  deleteMultipleDocuments: (ids: string[]) => Promise<void>;
  moveDocument: (documentId: string, folderId: string | null) => Promise<void>;
  renameDocument: (documentId: string, newName: string) => Promise<void>;
  selectDocument: (id: string | null) => void;
  
  // Folder operations
  addFolder: (name: string, parentId?: string | null) => Promise<void>;
  updateFolder: (id: string, name: string, parentId?: string | null) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  deleteRecursively: (id: string) => Promise<void>; // Add method for recursive deletion
  renameFolder: (folderId: string, newName: string) => Promise<void>;
  moveFolder: (folderId: string, parentId: string | null) => Promise<void>;
  selectFolder: (id: string | null) => void;
  copyFolder: (folderId: string) => Promise<string>; // Add copyFolder operation
  
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
  toggleComparisonFolder: (folderId: string) => void; // Add toggle folder selection
  clearComparisonDocuments: () => void;
  getDocumentVersions: (id: string) => DocumentVersion[];
  
  // Data loading
  loadData: () => Promise<void>;
  setError: (error: string | null) => void;
  
  // Composition operations
  addComposition: (name: string, content: string, contextDocuments: Array<{id: string; name: string}>) => Promise<string>;
  updateComposition: (id: string, data: Partial<Composition>) => Promise<void>;
  deleteComposition: (id: string) => Promise<void>;
  loadCompositions: () => Promise<void>;
  
  // Generate a response to a user message
  generateResponse: (content: string) => Promise<string>;
  
  // Add special directories IDs to the store
  specialDirectoryIds: SpecialDirectoryIds;
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

// Add this helper function after the imports
const generateUniqueId = (prefix: string) => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

// Replace helper function with more generic special directories
export const ensureSpecialDirectoriesExist = async (folderList: Folder[], addFolder: (name: string, parentId?: string | null) => Promise<void>): Promise<SpecialDirectoryIds> => {
  return await initializeSpecialDirectories(folderList, addFolder);
};

export const useDocumentStore = create<DocumentStore>()(
  persist(
    (set, get) => ({
      documents: [],
      folders: [],
      compositions: [], // Initialize compositions array
      selectedDocumentId: null,
      selectedFolderId: null,
      comparisonDocumentIds: [],
      selectedFolderIds: [], // Initialize selected folder IDs
      isLoading: false,
      error: null,
      backlinks: [],
      
      // Add special directories IDs to the store
      specialDirectoryIds: {
        [SpecialDirectoryType.TRASH]: null,
        [SpecialDirectoryType.SYSTEM]: null,
        [SpecialDirectoryType.TEMPLATES]: null,
        [SpecialDirectoryType.COMPOSITION_TEMPLATES]: null
      } as SpecialDirectoryIds,
      
      setError: (error) => set({ error }),
      
      loadData: async () => {
        set({ isLoading: true, error: null });
        
        try {
          // Load documents and folders from the server
          const [documents, folders] = await Promise.all([
            fetchDocuments(),
            fetchFolders()
          ]);
          
          // Initialize the addFolder function for special directories
          const addFolderFn = async (name: string, parentId?: string | null) => {
            // Use the actual store method that's already defined
            await get().addFolder(name, parentId);
          };
          
          // Ensure special directories exist
          const specialDirIds = await ensureSpecialDirectoriesExist(folders || [], addFolderFn);
          
          // Set the data from the server, or empty arrays if none exists
          set({ 
            documents: documents || [],
            folders: folders || [],
            specialDirectoryIds: specialDirIds,
            isLoading: false 
          });
          
          // Load compositions after documents and folders are loaded
          await get().loadCompositions();
        } catch (error) {
          console.error('Error loading data from server:', error);
          set({ 
            isLoading: false,
            error: {
              message: 'Failed to load fresh data from server. Displaying locally cached data, which might be outdated.',
              type: 'LOAD_DATA_SERVER_FAILURE',
              originalError: error instanceof Error ? error.message : String(error)
            }
          });
          // Do not call loadCompositions() here as the primary data fetch failed.
        }
      },
      
      addDocument: async (name, content, folderId = null) => {
        set({ error: null });
        const timestamp = new Date();
        
        // Check if name contains file extension
        const hasExtension = name.endsWith('.md') || name.endsWith('.mdx');
        // Determine the file extension - default to .md if none specified
        const extension = hasExtension ? `.${name.split('.').pop()}` : '.md';
        // Remove extension from name if present for consistency
        const baseName = hasExtension ? name.slice(0, name.lastIndexOf('.')) : name;
        
        // Check if the content has frontmatter with contextDocuments
        let contextDocuments;
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
        if (frontmatterMatch) {
          const frontmatter = frontmatterMatch[1];
          const contextDocumentsMatch = frontmatter.match(/contextDocuments:\s*(.*)/);
          if (contextDocumentsMatch) {
            try {
              contextDocuments = JSON.parse(contextDocumentsMatch[1].trim());
            } catch (e) {
              console.error('Error parsing contextDocuments from frontmatter:', e);
            }
          }
        }
        
        const newDocument: Document = {
          id: `doc-${timestamp.getTime()}`,
          name: baseName,
          content,
          createdAt: timestamp,
          updatedAt: timestamp,
          versions: [],
          folderId,
          annotations: [],
          ...(contextDocuments && { contextDocuments }),
          extension
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
          // Rollback the optimistic update
          set((state) => ({
            documents: state.documents.filter((doc) => doc.id !== newDocument.id),
            selectedDocumentId: state.selectedDocumentId === newDocument.id ? null : state.selectedDocumentId,
            error: 'Failed to save document to server. Local changes have been reverted.',
          }));
        }
        
        return newDocument.id;
      },
      
      updateDocument: async (id, data, createVersion = false, versionMessage = "") => {
        set({ error: null });
        const state = get();
        const originalDocument = state.documents.find(doc => doc.id === id);
        if (!originalDocument) return;

        // Deep copy the original document for potential rollback
        const originalDocumentCopy = JSON.parse(JSON.stringify(originalDocument));

        try {
          let versions = [...(originalDocument.versions || [])];
          
          if (createVersion) {
            const timestamp = new Date();
            const newVersion: DocumentVersion = {
              id: `ver-${timestamp.getTime()}`,
              content: originalDocument.content, // Version should capture content before this update
              createdAt: timestamp,
              message: versionMessage || `Version created on ${timestamp.toLocaleString()}`,
            };
            versions = [newVersion, ...versions];
          }
          
          // Check if the content has frontmatter with contextDocuments
          let contextDocuments = originalDocument.contextDocuments;
          if (data.content) {
            const frontmatterMatch = data.content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
            if (frontmatterMatch) {
              const frontmatter = frontmatterMatch[1];
              const contextDocumentsMatch = frontmatter.match(/contextDocuments:\s*(.*)/);
              if (contextDocumentsMatch) {
                try {
                  contextDocuments = JSON.parse(contextDocumentsMatch[1].trim());
                } catch (e) {
                  // Log error but don't prevent update, contextDocuments might be manually edited
                  console.error('Error parsing contextDocuments from frontmatter:', e);
                }
              }
            }
          }
          
          // Check if the name is being updated with an extension
          let extension = originalDocument.extension;
          let newName = data.name;
          
          if (newName) {
            const hasExtension = newName.endsWith('.md') || newName.endsWith('.mdx');
            if (hasExtension) {
              extension = `.${newName.split('.').pop()}`;
              newName = newName.slice(0, newName.lastIndexOf('.'));
            }
          }
          
          const updatedDoc = { 
            ...originalDocument, 
            ...data,
            name: newName || originalDocument.name,
            updatedAt: new Date(),
            versions: versions,
            ...(contextDocuments && { contextDocuments }),
            extension,
          };
          
          // Update local state immediately (optimistic update)
          set((currentState) => ({
            documents: currentState.documents.map((doc) => 
              doc.id === id ? updatedDoc : doc
            ),
          }));
          
          // Then save to server
          await saveDocumentToServer(updatedDoc);

        } catch (error) {
          console.error('Error updating document:', error);
          // Rollback the optimistic update
          set((currentState) => ({
            documents: currentState.documents.map((doc) =>
              doc.id === id ? originalDocumentCopy : doc
            ),
            error: 'Failed to update document on server. Local changes have been reverted.',
          }));
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
        const state = get();
        const documentToDelete = state.documents.find(doc => doc.id === id);

        if (!documentToDelete) {
          // Document not found, maybe already deleted or an invalid ID was passed
          console.warn(`Document with id ${id} not found for deletion.`);
          return;
        }
        
        // Store a copy for potential rollback
        const originalDocumentCopy = JSON.parse(JSON.stringify(documentToDelete));
        let originalIndex = state.documents.findIndex(doc => doc.id === id); // Store original index

        // Optimistic update: Remove the document from local state
        set((currentState) => ({
          documents: currentState.documents.filter((doc) => doc.id !== id),
          selectedDocumentId: currentState.selectedDocumentId === id 
            ? (currentState.documents.filter(doc => doc.id !== id).length > 0
                ? currentState.documents.filter(doc => doc.id !== id)[0].id
                : null)
            : currentState.selectedDocumentId,
          comparisonDocumentIds: currentState.comparisonDocumentIds.filter(docId => docId !== id)
        }));
        
        // Then delete from server
        try {
          await deleteDocumentFromServer(id);
        } catch (error) {
          console.error('Error deleting document from server:', error);
          // Rollback the optimistic deletion
          set((currentState) => {
            const newDocuments = [...currentState.documents];
            // Re-insert at original position if possible, otherwise append
            if (originalIndex !== -1 && originalIndex <= newDocuments.length) {
              newDocuments.splice(originalIndex, 0, originalDocumentCopy);
            } else {
              newDocuments.push(originalDocumentCopy);
            }
            return {
              documents: newDocuments,
              // Optionally, restore selectedDocumentId if it was the one deleted.
              // For simplicity, we're not changing selectedDocumentId back here,
              // as the user might have selected something else or UI might handle it.
              // comparisonDocumentIds would also need careful handling if we were to restore it perfectly.
              error: 'Failed to delete document from server. Local changes have been reverted.',
            };
          });
        }
      },
      
      // New method to delete multiple documents at once
      deleteMultipleDocuments: async (ids: string[]) => {
        if (!ids.length) return;
        set({ error: null });
        
        // Update local state immediately
        set((state) => {
          // Filter out the deleted documents
          const updatedDocuments = state.documents.filter(doc => !ids.includes(doc.id));
          
          // Determine new selected document if current one is being deleted
          let newSelectedId = state.selectedDocumentId;
          if (state.selectedDocumentId && ids.includes(state.selectedDocumentId)) {
            newSelectedId = updatedDocuments.length > 0 ? updatedDocuments[0].id : null;
          }
          
          return {
            documents: updatedDocuments,
            selectedDocumentId: newSelectedId,
            // Remove deleted documents from comparison list
            comparisonDocumentIds: state.comparisonDocumentIds.filter((docId: string) => !ids.includes(docId))
          };
        });
        
        // Delete from server one by one
        try {
          // Use Promise.all to delete all documents in parallel
          await Promise.all(ids.map((id: string) => deleteDocumentFromServer(id)));
        } catch (error) {
          console.error('Error deleting multiple documents from server:', error);
          set({ error: 'Failed to delete some documents from server.' });
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
          // Rollback the optimistic update
          set((state) => ({
            folders: state.folders.filter((folder) => folder.id !== newFolder.id),
            error: 'Failed to save folder to server. Local changes have been reverted.',
          }));
        }
      },
      
      updateFolder: async (id, name, parentId) => {
        set({ error: null });
        const state = get();
        const originalFolder = state.folders.find(folder => folder.id === id);
        
        if (!originalFolder) {
          console.warn(`Folder with id ${id} not found for update.`);
          return;
        }

        // Deep copy the original folder for potential rollback
        const originalFolderCopy = JSON.parse(JSON.stringify(originalFolder));

        const updatedFolderData = { 
          ...originalFolder, 
          name, 
          ...(parentId !== undefined ? { parentId } : {}) 
        };
        
        // Update local state immediately (optimistic update)
        set((currentState) => ({
          folders: currentState.folders.map((folder) =>
            folder.id === id ? updatedFolderData : folder
          ),
        }));
        
        // Then save to server
        try {
          await saveFolderToServer(updatedFolderData);
        } catch (error) {
          console.error('Error updating folder on server:', error);
          // Rollback the optimistic update
          set((currentState) => ({
            folders: currentState.folders.map((folder) =>
              folder.id === id ? originalFolderCopy : folder
            ),
            error: 'Failed to update folder on server. Local changes have been reverted.',
          }));
        }
      },
      
      deleteFolder: async (id) => {
        set({ error: null });
        
        try {
          // First try non-recursive delete
          await deleteFolderFromServer(id, false);
          
          // If successful, update local state
          set(state => ({
            folders: state.folders.filter(folder => folder.id !== id),
            selectedFolderId: state.selectedFolderId === id ? null : state.selectedFolderId
          }));
        } catch (error) {
          // Check if error is due to non-empty folder
          if (error instanceof Error) {
            if (error.message.includes("subfolders") || error.message.includes("contains documents")) {
              // The folder has contents - notify the user via the error state
              // This will allow the UI to prompt the user about recursive deletion
              set({ 
                error: {
                  message: error.message,
                  canRecurse: true,
                  folderId: id
                } 
              });
            } else {
              // Some other error occurred
              console.error('Error deleting folder:', error);
              set({ error: error.message || 'Failed to delete folder from server. An unexpected error occurred.' });
            }
          } else {
            console.error('Unknown error deleting folder:', error);
            set({ error: 'Failed to delete folder from server. An unexpected error occurred.' });
          }
        }
      },
      
      // Add a new method to handle recursive deletion
      deleteRecursively: async (id) => {
        set({ error: null });
        
        try {
          // Call server with recursive=true
          await deleteFolderFromServer(id, true);
          
          // If server deletion is successful, update local folder state
          set(state => ({
            folders: state.folders.filter(folder => folder.id !== id),
            selectedFolderId: state.selectedFolderId === id ? null : state.selectedFolderId
          }));
          
          // Then, try to refresh the document list
          try {
            const documents = await fetchDocuments();
            set({ documents: fixDates(documents) });
          } catch (fetchError) {
            console.error('Folder deleted, but failed to refresh documents:', fetchError);
            set({ error: 'Folder deleted, but failed to refresh documents.' });
          }
          
        } catch (deleteError) {
          // This catch is for deleteFolderFromServer(id, true) failing
          console.error('Error deleting folder recursively from server:', deleteError);
          set({ error: deleteError instanceof Error ? deleteError.message : 'Failed to delete folder and its contents from server.' });
        }
      },
      
      selectDocument: (id) => set({ selectedDocumentId: id }),
      
      selectFolder: (id) => set({ selectedFolderId: id }),
      
      toggleComparisonDocument: (id) => set((state) => {
        const { comparisonDocumentIds } = state;
        
        if (comparisonDocumentIds.includes(id)) {
          // Remove the document from selection
          return {
            comparisonDocumentIds: comparisonDocumentIds.filter((docId) => docId !== id),
          };
        } else {
          // Add the document to selection (no limit on number of documents)
          return {
            comparisonDocumentIds: [...comparisonDocumentIds, id],
          };
        }
      }),
      
      toggleComparisonFolder: (folderId) => set((state) => {
        const { comparisonDocumentIds, documents, selectedFolderIds } = state;
        
        // Get all document IDs in this folder
        const folderDocumentIds = documents
          .filter(doc => doc.folderId === folderId)
          .map(doc => doc.id);
        
        // Check if folder is already selected (all documents in folder are selected)
        const isFolderSelected = folderDocumentIds.every(docId => 
          comparisonDocumentIds.includes(docId)
        );
        
        if (isFolderSelected) {
          // If folder is selected, remove all its documents from selection
          return {
            comparisonDocumentIds: comparisonDocumentIds.filter(
              docId => !folderDocumentIds.includes(docId)
            ),
            selectedFolderIds: selectedFolderIds.filter(id => id !== folderId)
          };
        } else {
          // If folder is not selected, add all its documents to selection
          const newComparisonIds = [...comparisonDocumentIds];
          
          // Add only documents that aren't already selected
          folderDocumentIds.forEach(docId => {
            if (!newComparisonIds.includes(docId)) {
              newComparisonIds.push(docId);
            }
          });
          
          return {
            comparisonDocumentIds: newComparisonIds,
            selectedFolderIds: [...selectedFolderIds, folderId]
          };
        }
      }),
      
      clearComparisonDocuments: () => set({ 
        comparisonDocumentIds: [],
        selectedFolderIds: []
      }),
      
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
        // Store a copy of the original document for potential rollback
        const originalDocument = JSON.parse(JSON.stringify(document));

        try {
          const documentWithNewAnnotation = { 
            ...document, 
            annotations: Array.isArray(document.annotations) ? [...document.annotations, newAnnotation] : [newAnnotation] 
          };
          await saveDocumentToServer(documentWithNewAnnotation);
        } catch (error) {
          console.error('Error saving annotation to server:', error);
          // Rollback the optimistic update by restoring the original document
          set(state => ({
            documents: state.documents.map(doc => 
              doc.id === documentId ? originalDocument : doc
            ),
            error: 'Failed to add annotation. Document save failed. Local changes reverted.',
          }));
        }
      },
      
      updateAnnotation: async (id, data) => {
        set({ error: null });
        const state = get();
        let originalDocument: Document | undefined;
        let annotationDocumentId: string = '';

        // Find the document and store its original state
        const documentsWithOriginal = state.documents.map(doc => {
          const docAnnotations = Array.isArray(doc.annotations) ? doc.annotations : [];
          if (docAnnotations.some(anno => anno.id === id)) {
            annotationDocumentId = doc.id;
            originalDocument = JSON.parse(JSON.stringify(doc)); // Deep copy for rollback
          }
          return doc;
        });

        if (!originalDocument || !annotationDocumentId) {
          console.warn(`Annotation with id ${id} or its document not found for update.`);
          return;
        }
        
        // Optimistic update
        const updatedAnnotations = (originalDocument.annotations || []).map((anno) =>
          anno.id === id ? { ...anno, ...data, updatedAt: new Date() } : anno
        );
        
        const optimisticallyUpdatedDocument = { ...originalDocument, annotations: updatedAnnotations };

        set((currentState) => ({
          documents: currentState.documents.map((doc) =>
            doc.id === annotationDocumentId ? optimisticallyUpdatedDocument : doc
          ),
        }));
        
        // Then save to server
        try {
          await saveDocumentToServer(optimisticallyUpdatedDocument);
        } catch (error) {
          console.error('Error updating annotation on server:', error);
          // Rollback the optimistic update
          set((currentState) => ({
            documents: currentState.documents.map((doc) =>
              doc.id === annotationDocumentId ? originalDocument : doc // Revert to the original document copy
            ),
            error: 'Failed to update annotation. Document save failed. Local changes reverted.',
          }));
        }
      },
      
      deleteAnnotation: async (id) => {
        set({ error: null });
        const state = get();
        let originalDocument: Document | undefined;
        let annotationDocumentId: string = '';

        // Find the document and store its original state
         state.documents.forEach(doc => {
          const docAnnotations = Array.isArray(doc.annotations) ? doc.annotations : [];
          if (docAnnotations.some(anno => anno.id === id)) {
            annotationDocumentId = doc.id;
            originalDocument = JSON.parse(JSON.stringify(doc)); // Deep copy for rollback
          }
        });

        if (!originalDocument || !annotationDocumentId) {
          console.warn(`Annotation with id ${id} or its document not found for deletion.`);
          return;
        }
        
        // Optimistic update
        const updatedAnnotations = (originalDocument.annotations || []).filter((anno) => anno.id !== id);
        const optimisticallyUpdatedDocument = { ...originalDocument, annotations: updatedAnnotations };
        
        set((currentState) => ({
          documents: currentState.documents.map((doc) =>
            doc.id === annotationDocumentId ? optimisticallyUpdatedDocument : doc
          ),
        }));
        
        // Then save to server
        try {
          await saveDocumentToServer(optimisticallyUpdatedDocument);
        } catch (error) {
          console.error('Error deleting annotation from server:', error);
          // Rollback the optimistic update
          set((currentState) => ({
            documents: currentState.documents.map((doc) =>
              doc.id === annotationDocumentId ? originalDocument : doc // Revert to the original document copy
            ),
            error: 'Failed to delete annotation. Document save failed. Local changes reverted.',
          }));
        }
      },
      
      getDocumentAnnotations: (documentId) => {
        const state = get();
        const document = state.documents.find(doc => doc.id === documentId);
        // Ensure annotations is initialized as an array
        return Array.isArray(document?.annotations) ? document.annotations : [];
      },
      
      searchAnnotations: (query) => {
        if (!query.trim()) return [];
        
        const state = get();
        // Collect all annotations from all documents
        const allAnnotations = state.documents.flatMap(doc => {
          // Ensure annotations is initialized as an array
          const docAnnotations = Array.isArray(doc.annotations) ? doc.annotations : [];
          // Add document ID and name to each annotation for reference
          return docAnnotations.map(anno => ({
            ...anno,
            documentId: doc.id,
            documentName: doc.name
          }));
        });
        
        // Use fuzzy search on the annotations
        return fuzzySearch(
          allAnnotations,
          query,
          ['content', 'tags'],
          { threshold: 0.3 }
        );
      },
      
      // Composition operations
      addComposition: async (name, content, contextDocuments) => {
        set({ error: null });
        const timestamp = new Date();
        const newComposition: Composition = {
          id: generateUniqueId('comp'),
          name,
          content,
          contextDocuments,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        
        try {
          console.log("Adding composition:", name);
          const originalCompositions = JSON.parse(JSON.stringify(get().compositions));
          let compositionsFolderId = get().folders.find(folder => folder.name === 'compositions' && folder.parentId === null)?.id;

          // 1. Ensure 'compositions' folder exists or create it
          if (!compositionsFolderId) {
            const folderTimestamp = new Date();
            const newCompositionsFolder: Folder = {
              id: generateUniqueId('folder-compositions'), // More specific ID
              name: 'compositions',
              createdAt: folderTimestamp,
              parentId: null,
            };
            
            // Optimistically add folder to local state
            const originalFolders = JSON.parse(JSON.stringify(get().folders));
            set(state => ({ folders: [...state.folders, newCompositionsFolder] }));

            try {
              await saveFolderToServer(newCompositionsFolder);
              compositionsFolderId = newCompositionsFolder.id;
            } catch (folderError) {
              console.error('Error creating compositions folder:', folderError);
              set({ 
                folders: originalFolders, // Rollback folder creation
                error: 'Failed to create compositions folder on server. Composition not added.' 
              });
              throw folderError; // Stop execution
            }
          }

          // 2. Optimistically add composition to the compositions array
          set(state => ({ compositions: [...state.compositions, newComposition] }));

          // 3. Create and save the backing Markdown document
          const compositionContent = `---
title: ${name}
date: ${timestamp.toISOString()}
id: ${newComposition.id}
contextDocuments: ${JSON.stringify(contextDocuments)}
---

${content}`;
          
          try {
            // addDocument has its own rollback for the documents array
            const documentId = await get().addDocument(name, compositionContent, compositionsFolderId);
            console.log("Composition backing document added with ID:", documentId);
            // If addDocument succeeds, the newComposition.id is returned
            return newComposition.id;
          } catch (docError) {
            console.error('Error adding composition backing document:', docError);
            // Rollback optimistic update to compositions array
            set({ 
              compositions: originalCompositions,
              error: `Failed to add composition: backing document could not be saved. ${docError instanceof Error ? docError.message : String(docError)}`
            });
            throw docError; // Re-throw to indicate failure
          }
        } catch (error) { // This outer catch handles errors from folder creation primarily
          console.error('Error in addComposition:', error);
          // Ensure compositions array is rolled back if an error occurred before document saving attempt.
          // If docError was thrown, compositions are already rolled back.
          if (!(error instanceof Error && error.message.includes("backing document"))) {
             set(state => ({ compositions: originalCompositions }));
          }
          // Set a general error if not already set by specific failures
          if (!get().error) {
            set({ error: 'Failed to add composition due to an unexpected error.' });
          }
          throw error;
        }
      },
      
      updateComposition: async (id, data) => {
        set({ error: null });
        const originalCompositions = JSON.parse(JSON.stringify(get().compositions));
        const compositionToUpdate = get().compositions.find(comp => comp.id === id);

        if (!compositionToUpdate) {
          set({ error: 'Composition not found for update.' });
          throw new Error('Composition not found');
        }
        
        const originalCompositionCopy = JSON.parse(JSON.stringify(compositionToUpdate));

        // Optimistic update for compositions array
        const updatedComposition = {
          ...compositionToUpdate,
          ...data,
          updatedAt: new Date()
        };
        set(state => ({
          compositions: state.compositions.map(comp => 
            comp.id === id ? updatedComposition : comp
          )
        }));
        
        try {
          // Find the corresponding document
          // Assuming composition name might change, so need to find by original name or ID if possible
          // For now, let's assume name or an ID stored in doc frontmatter is used for lookup
          // This part might need adjustment based on how documents are linked to compositions
          const compositionsFolderId = get().folders.find(f => f.name === 'compositions' && f.parentId === null)?.id;
          const document = get().documents.find(doc => 
            doc.name === originalCompositionCopy.name && doc.folderId === compositionsFolderId
            // Potentially, a better link would be `doc.frontmatter.compositionId === id`
          );
          
          if (document) {
            const compositionContent = `---
title: ${updatedComposition.name}
date: ${updatedComposition.updatedAt.toISOString()}
id: ${updatedComposition.id}
contextDocuments: ${JSON.stringify(updatedComposition.contextDocuments)}
---

${updatedComposition.content}`;
            
            // updateDocument handles its own rollback for the documents array
            await get().updateDocument(document.id, { 
              content: compositionContent,
              name: updatedComposition.name // Update name if it changed
            });
          } else {
            // If document not found, this is an inconsistency.
            // Rollback optimistic compositions update and throw error.
            console.error('Backing document for composition not found during update.');
            set({ compositions: originalCompositions, error: 'Failed to update composition: backing document not found.' });
            throw new Error('Backing document not found');
          }
        } catch (error) {
          console.error('Error updating composition:', error);
          // Rollback optimistic update to compositions array
          set({ 
            compositions: originalCompositions,
            error: `Failed to update composition: backing document update failed. ${error instanceof Error ? error.message : String(error)}`
          });
          throw error;
        }
      },
      
      deleteComposition: async (id) => {
        set({ error: null });
        const originalCompositions = JSON.parse(JSON.stringify(get().compositions));
        const compositionToDelete = get().compositions.find(comp => comp.id === id);

        if (!compositionToDelete) {
          set({ error: 'Composition not found for deletion.' });
          throw new Error('Composition not found');
        }

        // Optimistic removal from compositions array
        set(state => ({
          compositions: state.compositions.filter(comp => comp.id !== id)
        }));
        
        try {
          const compositionsFolderId = get().folders.find(f => f.name === 'compositions' && f.parentId === null)?.id;
          const document = get().documents.find(doc => 
            doc.name === compositionToDelete.name && doc.folderId === compositionsFolderId
            // As with update, a more robust link (e.g., frontmatter ID) would be better
          );
          
          if (document) {
            // deleteDocument handles its own rollback for the documents array
            await get().deleteDocument(document.id); 
          } else {
            // If document not found, it's an inconsistency, but the composition itself is gone.
            // Log this, but the primary goal (delete composition) is "achieved" optimistically.
            // Server state might be inconsistent if this happens.
            console.warn(`Backing document for composition ID ${id} not found during deletion. The composition entry was removed locally.`);
          }
        } catch (error) {
          console.error('Error deleting composition:', error);
          // Rollback optimistic removal from compositions array
          set({ 
            compositions: originalCompositions,
            error: `Failed to delete composition: backing document deletion failed. ${error instanceof Error ? error.message : String(error)}`
          });
          throw error;
        }
      },
      
      loadCompositions: async () => {
        set({ error: null });
        
        try {
          console.log("Loading compositions...");
          
          // Find the compositions folder
          const compositionsFolder = get().folders.find(folder => folder.name === 'compositions' && folder.parentId === null);
          
          console.log("Compositions folder:", compositionsFolder);
          
          if (!compositionsFolder) {
            console.log("No compositions folder found, setting empty compositions array");
            set({ compositions: [] });
            return;
          }
          
          // Get all documents in the compositions folder
          const compositionDocuments = get().documents.filter(doc => doc.folderId === compositionsFolder.id);
          
          console.log(`Found ${compositionDocuments.length} documents in compositions folder`);
          console.log("Documents in compositions folder:", compositionDocuments.map(doc => doc.name));
          
          // Parse each document to extract composition data
          const compositions: Composition[] = [];
          
          for (const doc of compositionDocuments) {
            try {
              console.log(`Processing document: ${doc.name} (ID: ${doc.id})`);
              
              // Use the document's contextDocuments property if it exists
              if (doc.contextDocuments && Array.isArray(doc.contextDocuments) && doc.contextDocuments.length > 0) {
                console.log(`Using document's contextDocuments property for ${doc.name}`);
                
                const composition = {
                  id: doc.id,
                  name: doc.name,
                  content: doc.content.replace(/^---[\s\S]*?---\n/, '').trim(), // Remove frontmatter from content
                  contextDocuments: doc.contextDocuments,
                  createdAt: doc.createdAt,
                  updatedAt: doc.updatedAt
                };
                
                console.log(`Added composition from document property: ${composition.name} (ID: ${composition.id})`);
                console.log(`Context documents:`, composition.contextDocuments);
                compositions.push(composition);
                continue;
              }
              
              // If no contextDocuments property, try to parse from frontmatter
              console.log(`No contextDocuments property found for ${doc.name}, parsing from frontmatter`);
              
              // Parse the frontmatter
              const content = doc.content;
              const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
              
              if (frontmatterMatch) {
                const [_, frontmatter, markdownContent] = frontmatterMatch;
                
                // Use gray-matter to parse the frontmatter properly
                const matter = await import('gray-matter');
                const { data } = matter.default(`---\n${frontmatter}\n---\n`);
                
                const title = data.title || doc.name;
                const date = data.date ? new Date(data.date) : doc.createdAt;
                const compositionId = data.id || doc.id;
                const contextDocuments = Array.isArray(data.contextDocuments) ? data.contextDocuments : [];
                
                const composition = {
                  id: compositionId,
                  name: title,
                  content: markdownContent.trim(),
                  contextDocuments,
                  createdAt: date,
                  updatedAt: date
                };
                
                console.log(`Added composition from frontmatter: ${composition.name} (ID: ${composition.id})`);
                console.log(`Context documents:`, composition.contextDocuments);
                compositions.push(composition);
              } else {
                // If no frontmatter, create a composition with document name and content
                console.log(`Document ${doc.name} has no frontmatter, using document properties`);
                
                // Ensure we have a valid Date object for createdAt and updatedAt
                const createdAt = doc.createdAt instanceof Date ? doc.createdAt : new Date();
                const updatedAt = doc.updatedAt instanceof Date ? doc.updatedAt : new Date();
                
                compositions.push({
                  id: doc.id,
                  name: doc.name,
                  content: doc.content,
                  contextDocuments: [],
                  createdAt: createdAt,
                  updatedAt: updatedAt
                });
              }
            } catch (e) {
              console.error(`Error parsing composition document ${doc.name}:`, e);
            }
          }
          
          console.log(`Loaded ${compositions.length} compositions`);
          
          // Update state with parsed compositions
          set({ compositions });
          
        } catch (error) {
          console.error('Error loading compositions:', error);
          set({ error: 'Failed to load compositions' });
        }
      },
      
      // Generate a response to a user message
      generateResponse: async (content: string): Promise<string> => {
        try {
          // Call the LLM service to generate a response
          const response = await generateChatResponse({
            messages: [{ role: 'user', content }],
            stream: false
          });
          
          return response.message.content;
        } catch (error) {
          console.error('Error generating response:', error);
          return 'Sorry, I could not generate a response at this time.';
        }
      },
      
      copyFolder: async (folderId) => {
        set({ error: null });
        
        try {
          // Call the server-side copy function directly
          const result = await copyFolderOnServer(folderId, null);
          
          // Refresh folders and documents from the server to get the copied items
          const [folders, documents] = await Promise.all([
            fetchFolders(),
            fetchDocuments()
          ]);
          
          // Update the local state with the latest data
          set({ 
            folders: fixDates(folders),
            documents: fixDates(documents)
          });
          
          // Return the new folder ID
          return result.newFolderId;
        } catch (error) {
          console.error('Error copying folder:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to copy folder' });
          throw error;
        }
      }
    }),
    {
      name: 'document-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        selectedDocumentId: state.selectedDocumentId,
        selectedFolderId: state.selectedFolderId,
        specialDirectoryIds: state.specialDirectoryIds
      }),
      onRehydrateStorage: () => {
        return (state) => {
          if (state) {
            state.documents = fixDates(state.documents);
            state.folders = fixDates(state.folders);
            state.compositions = fixDates(state.compositions);
            console.log('Document store hydrated and dates fixed for documents, folders, and compositions');
          }
        };
      }
    }
  )
);

// LLM Provider Store
type LLMProvider = string;

interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  model: string;
  googleApiKey?: string;
  anthropicApiKey?: string;
  enableCache: boolean;
  temperature: number;
  maxTokens: number;
  aiRole: string;
}

interface LLMStore {
  config: LLMConfig;
  updateConfig: (config: Partial<LLMConfig>) => void;
  getApiKey: () => string;
  loadServerConfig: () => Promise<void>;
  saveToCookies: () => void;
  initializeAIRole: () => Promise<void>;
}

export const useLLMStore = create<LLMStore>()(
  persist(
    (set, get) => ({
      config: {
        provider: DEFAULT_LLM_PROVIDER,
        apiKey: '',
        model: DEFAULT_LLM_MODEL,
        googleApiKey: '',
        anthropicApiKey: '',
        enableCache: ENABLE_AI_CACHE,
        temperature: DEFAULT_TEMPERATURE || 0.7,
        maxTokens: DEFAULT_MAX_TOKENS || 1000,
        aiRole: 'assistant', // Default role is assistant
      },
      updateConfig: (newConfig) => {
        set((state) => {
          const updatedConfig = { ...state.config, ...newConfig };
          
          // Save to cookies for server-side access
          const cookieConfig = {
            provider: updatedConfig.provider,
            model: updatedConfig.model,
            enableCache: updatedConfig.enableCache,
            temperature: updatedConfig.temperature,
            maxTokens: updatedConfig.maxTokens,
            aiRole: updatedConfig.aiRole,
          };
          
          // Set cookie if in browser environment
          if (typeof document !== 'undefined') {
            document.cookie = `llm-config=${JSON.stringify(cookieConfig)};path=/;max-age=2592000;SameSite=Lax`;
          }
          
          return { config: updatedConfig };
        });
      },
      getApiKey: () => {
        const state = get();
        const provider = state.config.provider;
        
        switch (provider) {
          case 'openai':
            return state.config.apiKey;
          case 'gemini':
            return state.config.googleApiKey || '';
          case 'anthropic':
            return state.config.anthropicApiKey || '';
          default:
            return state.config.apiKey;
        }
      },
      loadServerConfig: async () => {
        try {
          const response = await fetch('/api/config');
          if (!response.ok) {
            console.error('Failed to load server config');
            return;
          }
          
          const serverConfig = await response.json();
          
          if (serverConfig) {
            set((state) => ({
              config: {
                ...state.config,
                ...serverConfig,
              }
            }));
          }
        } catch (error) {
          console.error('Error loading server config:', error);
        }
      },
      saveToCookies: () => {
        const state = get();
        const cookieConfig = {
          provider: state.config.provider,
          model: state.config.model,
          enableCache: state.config.enableCache,
          temperature: state.config.temperature,
          maxTokens: state.config.maxTokens,
          aiRole: state.config.aiRole,
        };
        
        // Set cookie if in browser environment
        if (typeof document !== 'undefined') {
          document.cookie = `llm-config=${JSON.stringify(cookieConfig)};path=/;max-age=2592000;SameSite=Lax`;
        }
      },
      initializeAIRole: async () => {
        try {
          // Get available roles from the API
          const availableRoles = await getAvailableAIRoles();
          
          // If current aiRole is not in available roles, set to default (first available role or 'assistant')
          const currentRole = get().config.aiRole;
          
          if (availableRoles.length > 0 && !availableRoles.includes(currentRole)) {
            set((state) => ({
              config: {
                ...state.config,
                aiRole: availableRoles[0] || 'assistant',
              }
            }));
            
            // Also update cookies
            get().saveToCookies();
          }
        } catch (error) {
          console.error('Error initializing AI role:', error);
        }
      }
    }),
    {
      name: 'llm-storage',
      partialize: (state) => ({ 
        config: {
          provider: state.config.provider,
          apiKey: state.config.apiKey,
          model: state.config.model,
          googleApiKey: state.config.googleApiKey,
          anthropicApiKey: state.config.anthropicApiKey,
          enableCache: state.config.enableCache,
          temperature: state.config.temperature,
          maxTokens: state.config.maxTokens,
          aiRole: state.config.aiRole,
        }
      }),
    }
  )
);

// Chat tree types
export interface ChatMessageNode {
  id: string;
  userContent?: string;
  assistantContent?: string;
  systemContent?: string;
  model?: string;
  parentId: string | null;
  childrenIds: string[];
  isActive: boolean;
  threadPosition: number;
}

export interface ChatTree {
  nodes: Record<string, ChatMessageNode>;  // Map of node IDs to nodes
  rootId: string | null;                   // ID of the root node
  activeThread: string[];                  // Ordered list of node IDs in the active thread
}

export interface AIChatStore {
  chatTree: ChatTree;
  setChatTree: (tree: ChatTree) => void;
  addNode: (node: ChatMessageNode) => void;
  updateNode: (nodeId: string, updates: Partial<ChatMessageNode>) => void;
  deleteNode: (nodeId: string) => void;
  setActiveThread: (thread: string[]) => void;
  createSiblingNode: (parentId: string, content: string) => void;
  addResponseNode: (parentId: string, content: string, model?: string) => void;
  navigateToThread: (thread: string[]) => void;
  clearAll: () => void;
  ensureActiveThread: () => void;
  generateResponse: (content: string) => Promise<string>;
}

// Helper function to generate a unique node ID
const generateNodeId = () => `node-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

// Create an empty chat tree
const createEmptyChatTree = (): ChatTree => ({
  nodes: {},
  rootId: null,
  activeThread: []
});

// Selectors for derived state
const selectActiveMessages = (state: AIChatStore) => 
  state.chatTree.activeThread
    .map(id => state.chatTree.nodes[id])
    .filter(Boolean);

const selectThreadMetadata = (state: AIChatStore) => ({
  hasSiblings: (nodeId: string) => {
    const node = state.chatTree.nodes[nodeId];
    if (!node?.parentId) return false;
    const parent = state.chatTree.nodes[node.parentId];
    return parent?.childrenIds.length > 1;
  },
  getSiblingCount: (nodeId: string) => {
    const node = state.chatTree.nodes[nodeId];
    if (!node?.parentId) return 0;
    const parent = state.chatTree.nodes[node.parentId];
    return parent?.childrenIds.length || 0;
  },
  getCurrentBranchIndex: (nodeId: string) => {
    const node = state.chatTree.nodes[nodeId];
    if (!node?.parentId) return 0;
    const parent = state.chatTree.nodes[node.parentId];
    return parent?.childrenIds.indexOf(nodeId) || 0;
  }
});

export const useAIChatStore = create<AIChatStore>()(
  persist(
    (set, get) => ({
      chatTree: {
        nodes: {},
        rootId: null,
        activeThread: []
      },
      setChatTree: (tree) => set({ chatTree: tree }),
      addNode: (node) => set((state) => {
        const newNodes = { ...state.chatTree.nodes };
        newNodes[node.id] = node;

        // Update parent's children
        if (node.parentId && newNodes[node.parentId]) {
          newNodes[node.parentId].childrenIds.push(node.id);
        }

        return {
          chatTree: {
            ...state.chatTree,
            nodes: newNodes,
            rootId: state.chatTree.rootId || node.id
          }
        };
      }),
      updateNode: (nodeId, updates) => set((state) => {
        const node = state.chatTree.nodes[nodeId];
        if (!node) return state;

        const updatedNode = {
          ...node,
          ...updates
        };

        return {
          chatTree: {
            ...state.chatTree,
            nodes: {
              ...state.chatTree.nodes,
              [nodeId]: updatedNode
            }
          }
        };
      }),
      deleteNode: (nodeId) => set((state) => {
        const chatTree = { ...state.chatTree };
        const nodes = { ...chatTree.nodes };
        
        if (!nodes[nodeId]) return state;
        
        const nodeToDelete = nodes[nodeId];
        
        // Remove this node from its parent's children
        if (nodeToDelete.parentId && nodes[nodeToDelete.parentId]) {
          nodes[nodeToDelete.parentId].childrenIds = nodes[nodeToDelete.parentId].childrenIds.filter(
            id => id !== nodeId
          );
        }
        
        // Check if this is the root node
        if (chatTree.rootId === nodeId) {
          chatTree.rootId = null;
        }
        
        // Remove from active thread if needed
        if (nodeToDelete.isActive) {
          chatTree.activeThread = chatTree.activeThread.filter(id => id !== nodeId);
        }
        
        // Delete the node
        delete nodes[nodeId];
        
        return { chatTree: { ...chatTree, nodes } };
      }),
      setActiveThread: (threadNodeIds) => set((state) => {
        const chatTree = { ...state.chatTree };
        const nodes = { ...chatTree.nodes };
        
        // Deactivate all nodes first
        Object.values(nodes).forEach(node => {
          node.isActive = false;
          node.threadPosition = 0;
        });
        
        // Activate nodes in the new thread
        threadNodeIds.forEach((nodeId, index) => {
          if (nodes[nodeId]) {
            // Activate the current node
            nodes[nodeId].isActive = true;
            nodes[nodeId].threadPosition = index;
            
            // If this node has children, activate the first child
            if (nodes[nodeId].childrenIds.length > 0) {
              const firstChildId = nodes[nodeId].childrenIds[0];
              if (nodes[firstChildId]) {
                nodes[firstChildId].isActive = true;
                nodes[firstChildId].threadPosition = 0;
              }
            }
          }
        });
        
        // Ensure the selected node is active and in the thread
        const selectedNodeId = threadNodeIds[threadNodeIds.length - 1];
        if (selectedNodeId && nodes[selectedNodeId]) {
          nodes[selectedNodeId].isActive = true;
          nodes[selectedNodeId].threadPosition = threadNodeIds.length - 1;
        }
        
        return {
          chatTree: {
            ...chatTree,
            nodes,
            activeThread: threadNodeIds
          }
        };
      }),
      createSiblingNode: (parentId, content) => {
        const state = get();
        const chatTree = state.chatTree;
        const nodes = chatTree.nodes;
        
        if (!nodes[parentId]) {
          console.error("Parent node not found:", parentId);
          return;
        }
        
        const parentNode = nodes[parentId];
        const existingSiblings = parentNode.childrenIds
          .map(id => nodes[id])
          .filter(Boolean);
        
        // Include parent node as sibling
        const allSiblingIds = [parentId, ...existingSiblings.map(node => node.id)];
        
        // Create new sibling node
        const newNodeId = generateNodeId();
        const newNode: ChatMessageNode = {
          id: newNodeId,
          userContent: content,
          parentId: parentId,
          childrenIds: [],
          isActive: true,
          threadPosition: existingSiblings.length
        };
        
        // Add the new node
        nodes[newNodeId] = newNode;
        
        // Update siblings
        existingSiblings.forEach(sibling => {
          sibling.childrenIds.push(newNodeId);
        });
        
        // Update parent's children
        nodes[parentId].childrenIds.push(newNodeId);
        
        // Navigate to the new branch
        get().navigateToThread(allSiblingIds);
      },
      addResponseNode: (parentId, content, model) => {
        const state = get();
        const chatTree = state.chatTree;
        const nodes = chatTree.nodes;
        
        if (!nodes[parentId]) {
          console.error("Parent node not found:", parentId);
          return;
        }
        
        const parentNode = nodes[parentId];
        const existingSiblings = parentNode.childrenIds
          .map(id => nodes[id])
          .filter(Boolean);
        
        // Create new response node
        const newNodeId = generateNodeId();
        const newNode: ChatMessageNode = {
          id: newNodeId,
          assistantContent: content,
          model,
          parentId: parentId,
          childrenIds: [],
          isActive: true,
          threadPosition: existingSiblings.length
        };
        
        // Update all nodes
        const updatedNodes = { ...nodes };
        updatedNodes[newNodeId] = newNode;
        
        // Update siblings
        existingSiblings.forEach(sibling => {
          sibling.childrenIds.push(newNodeId);
        });
        
        // Update parent's children
        if (updatedNodes[parentId]) {
          updatedNodes[parentId] = {
            ...updatedNodes[parentId],
            childrenIds: [...updatedNodes[parentId].childrenIds, newNodeId]
          };
        }
        
        // Update the chat tree
        set({
          chatTree: {
            ...chatTree,
            nodes: updatedNodes
          }
        });
        
        // Navigate to the new response
        get().navigateToThread([...chatTree.activeThread, newNodeId]);
      },
      navigateToThread: (threadNodeIds) => {
        const state = get();
        const chatTree = state.chatTree;
        const nodes = chatTree.nodes;
        
        if (!nodes[threadNodeIds[0]]) {
          console.error("Node not found:", threadNodeIds[0]);
          return;
        }
        
        // Build thread from root to this node
        const newThread: string[] = [];
        let currentNodeId: string | null = threadNodeIds[0];
        
        while (currentNodeId && nodes[currentNodeId]) {
          newThread.unshift(currentNodeId);
          currentNodeId = nodes[currentNodeId].parentId;
        }
        
        // Update active thread and node states
        get().setActiveThread(newThread);
      },
      clearAll: () => set({
        chatTree: createEmptyChatTree()
      }),
      ensureActiveThread: () => set((state) => {
        const chatTree = { ...state.chatTree };
        const nodes = { ...chatTree.nodes };
        const newActiveThread: string[] = [];
        
        // Helper function to traverse and activate nodes
        function traverseAndActivate(nodeId: string, position: number) {
          const node = nodes[nodeId];
          if (!node) return;
          
          // Activate current node
          node.isActive = true;
          node.threadPosition = position;
          newActiveThread.push(nodeId);
          
          // If node has children, activate the last active child or the last child
          if (node.childrenIds.length > 0) {
            const activeChild = node.childrenIds.find(childId => nodes[childId]?.isActive);
            const childToActivate = activeChild || node.childrenIds[node.childrenIds.length - 1];
            traverseAndActivate(childToActivate, position + 1);
          }
        }
        
        // Start from root
        if (chatTree.rootId) {
          traverseAndActivate(chatTree.rootId, 0);
        }
        
        // Deactivate nodes not in the new active thread
        Object.values(nodes).forEach(node => {
          if (!newActiveThread.includes(node.id)) {
            node.isActive = false;
            node.threadPosition = 0;
          }
        });
        
        return {
          chatTree: {
            ...chatTree,
            nodes,
            activeThread: newActiveThread
          }
        };
      }),
      // Add selectors to the store
      selectActiveMessages: () => selectActiveMessages(get()),
      selectThreadMetadata: () => selectThreadMetadata(get()),
      
      // Generate a response to a user message
      generateResponse: async (content: string): Promise<string> => {
        try {
          // Call the LLM service to generate a response
          const response = await generateChatResponse({
            messages: [{ role: 'user', content }],
            stream: false
          });
          
          return response.message.content;
        } catch (error) {
          console.error('Error generating response:', error);
          return 'Sorry, I could not generate a response at this time.';
        }
      },
    }),
    {
      name: 'ai-chat-storage'
    }
  )
); 