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
  GOOGLE_API_KEY,
  ANTHROPIC_API_KEY,
  ENABLE_AI_CACHE,
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_TOKENS
} from './config';
import { fuzzySearch } from './search-utils';
import { ChatMessage } from './llm-service';
import { getAvailableAIRoles } from './ai-roles';

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
  error: string | null;
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
          
          // Load compositions after documents and folders are loaded
          await get().loadCompositions();
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
          name,
          content,
          createdAt: timestamp,
          updatedAt: timestamp,
          versions: [],
          folderId,
          annotations: [],
          ...(contextDocuments && { contextDocuments }),
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
        
        // Return the new document ID
        return newDocument.id;
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
        
        // Check if the content has frontmatter with contextDocuments
        let contextDocuments = documentToUpdate.contextDocuments;
        if (data.content) {
          const frontmatterMatch = data.content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
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
        }
        
        const updatedDoc = { 
          ...documentToUpdate, 
          ...data, 
          updatedAt: new Date(),
          versions: versions,
          ...(contextDocuments && { contextDocuments }),
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
          // Also remove from comparison documents if present
          comparisonDocumentIds: state.comparisonDocumentIds.filter(docId => docId !== id)
        }));
        
        // Then delete from server
        try {
          await deleteDocumentFromServer(id);
        } catch (error) {
          console.error('Error deleting document from server:', error);
          set({ error: 'Failed to delete document from server.' });
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
          
          // Create compositions folder if it doesn't exist
          const compositionsFolder = get().folders.find(folder => folder.name === 'compositions' && folder.parentId === null);
          let compositionsFolderId = compositionsFolder?.id;
          
          console.log("Existing compositions folder:", compositionsFolder);
          
          if (!compositionsFolderId) {
            // Create the compositions folder
            const folderTimestamp = new Date();
            const newFolder: Folder = {
              id: generateUniqueId('folder'),
              name: 'compositions',
              createdAt: folderTimestamp,
              parentId: null,
            };
            
            console.log("Creating new compositions folder:", newFolder);
            
            // Add to local state
            set(state => ({
              folders: [...state.folders, newFolder]
            }));
            
            // Save to server
            await saveFolderToServer(newFolder);
            
            compositionsFolderId = newFolder.id;
          }
          
          // Create a markdown document for the composition
          const compositionContent = `---
title: ${name}
date: ${timestamp.toISOString()}
id: ${newComposition.id}
contextDocuments: ${JSON.stringify(contextDocuments)}
---

${content}`;
          
          console.log("Adding document to compositions folder:", compositionsFolderId);
          
          // Add the document to the compositions folder
          const documentId = await get().addDocument(name, compositionContent, compositionsFolderId);
          
          console.log("Document added with ID:", documentId);
          
          // Add to compositions array
          set(state => ({
            compositions: [...state.compositions, newComposition]
          }));
          
          // Reload compositions to ensure everything is in sync
          setTimeout(() => {
            get().loadCompositions();
          }, 500);
          
          return newComposition.id;
        } catch (error) {
          console.error('Error adding composition:', error);
          set({ error: 'Failed to add composition' });
          throw error;
        }
      },
      
      updateComposition: async (id, data) => {
        set({ error: null });
        
        try {
          // Find the composition
          const composition = get().compositions.find(comp => comp.id === id);
          if (!composition) {
            throw new Error('Composition not found');
          }
          
          // Update the composition
          const updatedComposition = {
            ...composition,
            ...data,
            updatedAt: new Date()
          };
          
          // Update in state
          set(state => ({
            compositions: state.compositions.map(comp => 
              comp.id === id ? updatedComposition : comp
            )
          }));
          
          // Find the corresponding document
          const document = get().documents.find(doc => doc.name === composition.name && doc.folderId === get().folders.find(f => f.name === 'compositions')?.id);
          
          if (document) {
            // Update the document content with the new composition data
            const compositionContent = `---
title: ${updatedComposition.name}
date: ${updatedComposition.updatedAt.toISOString()}
id: ${updatedComposition.id}
contextDocuments: ${JSON.stringify(updatedComposition.contextDocuments)}
---

${updatedComposition.content}`;
            
            await get().updateDocument(document.id, { 
              content: compositionContent,
              name: updatedComposition.name
            });
          }
          
          return;
        } catch (error) {
          console.error('Error updating composition:', error);
          set({ error: 'Failed to update composition' });
          throw error;
        }
      },
      
      deleteComposition: async (id) => {
        set({ error: null });
        
        try {
          // Find the composition
          const composition = get().compositions.find(comp => comp.id === id);
          if (!composition) {
            throw new Error('Composition not found');
          }
          
          // Delete the composition
          const updatedCompositions = get().compositions.filter(comp => comp.id !== id);
          
          // Update in state
          set(state => ({
            compositions: updatedCompositions
          }));
          
          // Find the corresponding document
          const document = get().documents.find(doc => doc.name === composition.name && doc.folderId === get().folders.find(f => f.name === 'compositions')?.id);
          
          if (document) {
            // Delete the document
            const updatedDocuments = get().documents.filter(doc => doc.id !== document.id);
            
            // Update in state
            set(state => ({
              documents: updatedDocuments
            }));
            
            // Delete from server
            await deleteDocumentFromServer(document.id);
          }
          
          return;
        } catch (error) {
          console.error('Error deleting composition:', error);
          set({ error: 'Failed to delete composition' });
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
    }),
    {
      name: 'document-store',
      storage: createJSONStorage(() => localStorage),
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
  // Message content
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  provider?: string;
  
  // Additional content fields for different roles
  systemContent?: string;
  userContent?: string;
  assistantContent?: string;
  
  // Tree structure properties
  id: string;                   // Unique identifier for this node
  parentId: string | null;      // ID of the parent node (null for root)
  childrenIds: string[];        // IDs of child nodes
  siblingIds: string[];         // IDs of sibling nodes (nodes with same parent)
  
  // Navigation metadata
  isActive: boolean;            // Whether this node is in the active thread
  threadPosition: number;       // Position in the active thread (for ordering)
}

export interface ChatTree {
  nodes: Record<string, ChatMessageNode>;  // Map of node IDs to nodes
  rootId: string | null;                   // ID of the root node
  activeThread: string[];                  // Ordered list of node IDs in the active thread
}

interface AIChatStore {
  // Tree-based structure
  chatTree: ChatTree;
  
  // Tree operations
  setChatTree: (chatTree: ChatTree) => void;
  addNode: (node: ChatMessageNode) => void;
  updateNode: (nodeId: string, updates: Partial<ChatMessageNode>) => void;
  deleteNode: (nodeId: string) => void;
  setActiveThread: (threadNodeIds: string[]) => void;
  createSiblingNode: (originalNodeId: string, newContent: string) => string;
  addResponseNode: (parentNodeId: string, content: string, model?: string, provider?: string) => string;
  
  // Utils
  navigateToThread: (nodeId: string) => void;
  clearAll: () => void;
}

// Helper function to generate a unique node ID
const generateNodeId = () => `node-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

// Create an empty chat tree
const createEmptyChatTree = (): ChatTree => ({
  nodes: {},
  rootId: null,
  activeThread: []
});

export const useAIChatStore = create<AIChatStore>(
  persist(
    (set, get) => ({
      chatTree: createEmptyChatTree(),
      
      setChatTree: (chatTree) => set({ chatTree }),
      
      addNode: (node) => set((state) => {
        const chatTree = { ...state.chatTree };
        const nodes = { ...chatTree.nodes };
        
        // Initialize arrays if they don't exist
        node.childrenIds = node.childrenIds || [];
        node.siblingIds = node.siblingIds || [];
        
        // Set default values
        node.isActive = node.isActive !== undefined ? node.isActive : true;
        node.threadPosition = node.threadPosition || 0;
        
        // Add the node to our nodes map
        nodes[node.id] = node;
        
        // If this is a root node (no parent)
        if (!node.parentId) {
          if (!chatTree.rootId) {
            chatTree.rootId = node.id;
          }
        } else {
          // This is a child node
          const parentNode = nodes[node.parentId];
          if (parentNode) {
            // Add this node to parent's children
            if (!parentNode.childrenIds.includes(node.id)) {
              parentNode.childrenIds = [...parentNode.childrenIds, node.id];
            }
            
            // Update siblings
            if (parentNode.childrenIds.length > 1) {
              parentNode.childrenIds.forEach(childId => {
                if (childId !== node.id) {
                  // Add current node as sibling to other children
                  const sibling = nodes[childId];
                  if (sibling) {
                    sibling.siblingIds = Array.from(new Set([...sibling.siblingIds, node.id]));
                  }
                  
                  // Add other children as siblings to current node
                  node.siblingIds = Array.from(new Set([...node.siblingIds, childId]));
                }
              });
            }
          }
        }
        
        // Update active thread if this node is active
        if (node.isActive) {
          chatTree.activeThread = [...chatTree.activeThread, node.id];
        }
        
        return { chatTree: { ...chatTree, nodes } };
      }),
      
      updateNode: (nodeId, updates) => set((state) => {
        const chatTree = { ...state.chatTree };
        const nodes = { ...chatTree.nodes };
        
        if (!nodes[nodeId]) return state;
        
        nodes[nodeId] = { ...nodes[nodeId], ...updates };
        
        return { chatTree: { ...chatTree, nodes } };
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
        
        // Remove this node from its siblings' siblingIds lists
        nodeToDelete.siblingIds.forEach(siblingId => {
          if (nodes[siblingId]) {
            nodes[siblingId].siblingIds = nodes[siblingId].siblingIds.filter(
              id => id !== nodeId
            );
          }
        });
        
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
        
        // Deactivate all nodes
        Object.values(nodes).forEach(node => {
          node.isActive = false;
          node.threadPosition = 0;
        });
        
        // Activate nodes in the new thread
        threadNodeIds.forEach((nodeId, index) => {
          if (nodes[nodeId]) {
            nodes[nodeId].isActive = true;
            nodes[nodeId].threadPosition = index;
          }
        });
        
        return {
          chatTree: {
            ...chatTree,
            nodes,
            activeThread: threadNodeIds
          }
        };
      }),
      
      createSiblingNode: (originalNodeId, newContent) => {
        const state = get();
        const chatTree = state.chatTree;
        const nodes = chatTree.nodes;
        
        if (!nodes[originalNodeId]) {
          console.error("Original node not found:", originalNodeId);
          return originalNodeId;
        }
        
        const originalNode = nodes[originalNodeId];
        const parentNodeId = originalNode.parentId;
        const parentNode = parentNodeId ? nodes[parentNodeId] : null;
        
        // Get existing siblings
        const existingSiblings = parentNode
          ? parentNode.childrenIds.filter(id => id !== originalNodeId && nodes[id])
          : [];
        
        // Include original node as sibling
        const allSiblingIds = [originalNodeId, ...existingSiblings];
        
        // Create new sibling node
        const newNodeId = generateNodeId();
        const newNode: ChatMessageNode = {
          ...originalNode,
          id: newNodeId,
          content: newContent,
          userContent: newContent,
          childrenIds: [],
          siblingIds: allSiblingIds,
          isActive: true
        };
        
        // Update the tree
        set(state => {
          const updatedNodes = { ...state.chatTree.nodes };
          
          // Add new node
          updatedNodes[newNodeId] = newNode;
          
          // Update siblings
          allSiblingIds.forEach(siblingId => {
            if (updatedNodes[siblingId]) {
              updatedNodes[siblingId] = {
                ...updatedNodes[siblingId],
                siblingIds: Array.from(new Set([...updatedNodes[siblingId].siblingIds, newNodeId])),
                isActive: false
              };
            }
          });
          
          // Update parent
          if (parentNodeId && updatedNodes[parentNodeId]) {
            updatedNodes[parentNodeId] = {
              ...updatedNodes[parentNodeId],
              childrenIds: [...updatedNodes[parentNodeId].childrenIds, newNodeId],
              isActive: true
            };
          }
          
          return {
            chatTree: {
              ...state.chatTree,
              nodes: updatedNodes
            }
          };
        });
        
        // Navigate to the new branch
        get().navigateToThread(newNodeId);
        
        return newNodeId;
      },
      
      addResponseNode: (parentNodeId, content, model, provider) => {
        const state = get();
        const chatTree = state.chatTree;
        const nodes = chatTree.nodes;
        
        if (!nodes[parentNodeId]) {
          console.error("Parent node not found:", parentNodeId);
          return parentNodeId;
        }
        
        const parentNode = nodes[parentNodeId];
        const existingSiblings = parentNode.childrenIds
          .map(id => nodes[id])
          .filter(Boolean);
        
        // Create new response node
        const newNodeId = generateNodeId();
        const newNode: ChatMessageNode = {
          id: newNodeId,
          role: 'assistant',
          content: content,
          assistantContent: content,
          model,
          provider,
          parentId: parentNodeId,
          childrenIds: [],
          siblingIds: existingSiblings.map(node => node.id),
          isActive: true,
          threadPosition: parentNode.threadPosition + 1
        };
        
        // Update the tree
        set(state => {
          const updatedNodes = { ...state.chatTree.nodes };
          
          // Add new node
          updatedNodes[newNodeId] = newNode;
          
          // Update parent's children
          if (updatedNodes[parentNodeId]) {
            updatedNodes[parentNodeId] = {
              ...updatedNodes[parentNodeId],
              childrenIds: [...updatedNodes[parentNodeId].childrenIds, newNodeId]
            };
          }
          
          // Update active thread
          return {
            chatTree: {
              ...state.chatTree,
              nodes: updatedNodes,
              activeThread: [...state.chatTree.activeThread, newNodeId]
            }
          };
        });
        
        return newNodeId;
      },
      
      navigateToThread: (nodeId) => {
        const state = get();
        const chatTree = state.chatTree;
        const nodes = chatTree.nodes;
        
        if (!nodes[nodeId]) {
          console.error("Node not found:", nodeId);
          return;
        }
        
        // Build thread from root to this node
        const newThread: string[] = [];
        let currentNodeId: string | null = nodeId;
        
        while (currentNodeId && nodes[currentNodeId]) {
          newThread.unshift(currentNodeId);
          currentNodeId = nodes[currentNodeId].parentId;
        }
        
        // Update active thread and node states
        get().setActiveThread(newThread);
      },
      
      clearAll: () => set({
        chatTree: createEmptyChatTree()
      })
    }),
    {
      name: 'ai-chat-store'
    }
  )
); 