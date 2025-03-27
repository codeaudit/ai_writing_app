import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { trpc } from '@/utils/trpc';

// Types from the original store
export interface DocumentVersion {
  id: string;
  content: string;
  createdAt: Date;
  message?: string;
}

export interface Annotation {
  id: string;
  startOffset: number;
  endOffset: number;
  content: string;
  color?: string;
  tags?: string[];
  createdAt: Date;
}

export interface Document {
  id: string;
  name: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  versions: DocumentVersion[];
  folderId: string | null;
  annotations: Annotation[];
  contextDocuments?: Array<{id: string; name: string; content?: string}>;
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
}

export interface Composition {
  id: string;
  name: string;
  content: string;
  contextDocuments: Array<{id: string; name: string; content?: string}>;
  createdAt: Date;
  updatedAt: Date;
}

// Define the store state
interface DocumentStore {
  documents: Document[];
  folders: Folder[];
  compositions: Composition[];
  selectedDocumentId: string | null;
  selectedFolderId: string | null;
  comparisonDocumentIds: string[];
  selectedFolderIds: string[];
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
  
  // Data loading
  loadData: () => Promise<void>;
  loadBacklinks: (documentId: string) => Promise<void>;
  
  // Comparison operations
  toggleComparisonDocument: (id: string) => void;
  clearComparisonDocuments: () => void;
}

// Create the store with tRPC integration
export const useTrpcDocumentStore = create<DocumentStore>()(
  persist(
    (set, get) => ({
      documents: [],
      folders: [],
      compositions: [],
      selectedDocumentId: null,
      selectedFolderId: null,
      comparisonDocumentIds: [],
      selectedFolderIds: [],
      isLoading: false,
      error: null,
      backlinks: [],
      
      // Data loading
      loadData: async () => {
        set({ isLoading: true, error: null });
        
        try {
          const utils = trpc.useUtils?.() || null;
          
          if (utils) {
            // Load documents and folders using tRPC
            const [documents, folders] = await Promise.all([
              utils.client.document.getDocuments.query(),
              utils.client.folders.getFolders.query()
            ]);
            
            set({ 
              documents,
              folders,
              isLoading: false 
            });
          } else {
            // Fallback for non-component context
            const [documentsRes, foldersRes] = await Promise.all([
              fetch('/api/trpc/document.getDocuments'),
              fetch('/api/trpc/folders.getFolders')
            ]);
            
            const [documentsData, foldersData] = await Promise.all([
              documentsRes.json(),
              foldersRes.json()
            ]);
            
            set({ 
              documents: documentsData.result.data || [],
              folders: foldersData.result.data || [],
              isLoading: false 
            });
          }
        } catch (error) {
          console.error('Error loading data:', error);
          set({ 
            isLoading: false,
            error: 'Failed to load data. Please try again.' 
          });
        }
      },
      
      // Document operations
      addDocument: async (name, content, folderId = null) => {
        set({ error: null });
        
        try {
          const utils = trpc.useUtils?.() || null;
          let newDocumentId: string;
          
          if (utils) {
            // Use tRPC mutation to create document
            const result = await utils.client.document.createDocument.mutate({
              title: name,
              content,
              folderId: folderId || null
            });
            
            newDocumentId = result.id;
            
            // Invalidate the document query cache to refresh document list
            utils.document.getDocuments.invalidate();
          } else {
            // Fallback using fetch for non-component context
            const response = await fetch('/api/trpc/document.createDocument', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                json: { title: name, content, folderId: folderId || null }
              }),
            });
            
            const data = await response.json();
            newDocumentId = data.result.data.id;
            
            // We need to manually fetch documents since we can't invalidate cache
            await get().loadData();
          }
          
          // Select the new document
          set({ selectedDocumentId: newDocumentId });
          return newDocumentId;
        } catch (error) {
          console.error('Error creating document:', error);
          set({ error: 'Failed to create document. Please try again.' });
          return '';
        }
      },
      
      updateDocument: async (id, data, createVersion = false, versionMessage = "") => {
        set({ error: null });
        
        try {
          const utils = trpc.useUtils?.() || null;
          const currentDoc = get().documents.find(doc => doc.id === id);
          
          if (!currentDoc) {
            throw new Error('Document not found');
          }
          
          if (utils) {
            // Use tRPC mutation to update document
            await utils.client.document.updateDocument.mutate({
              id,
              content: data.content || currentDoc.content,
              title: data.name || currentDoc.name,
              createVersion,
              versionMessage
            });
            
            // Invalidate the document query cache
            utils.document.getDocuments.invalidate();
            if (data.content) {
              utils.document.getDocument.invalidate({ id });
            }
          } else {
            // Fallback using fetch for non-component context
            await fetch('/api/trpc/document.updateDocument', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                json: {
                  id,
                  content: data.content || currentDoc.content,
                  title: data.name || currentDoc.name,
                  createVersion,
                  versionMessage
                }
              }),
            });
            
            // Update the local state
            set(state => ({
              documents: state.documents.map(doc => 
                doc.id === id 
                  ? { 
                      ...doc, 
                      ...data,
                      updatedAt: new Date()
                    } 
                  : doc
              )
            }));
          }
        } catch (error) {
          console.error('Error updating document:', error);
          set({ error: 'Failed to update document. Please try again.' });
        }
      },
      
      deleteDocument: async (id) => {
        set({ error: null });
        
        try {
          const utils = trpc.useUtils?.() || null;
          
          // Update UI state immediately for better UX
          set(state => ({
            documents: state.documents.filter(doc => doc.id !== id),
            selectedDocumentId: state.selectedDocumentId === id 
              ? (state.documents.length > 1 
                  ? state.documents.find(d => d.id !== id)?.id ?? null 
                  : null) 
              : state.selectedDocumentId,
            comparisonDocumentIds: state.comparisonDocumentIds.filter(docId => docId !== id)
          }));
          
          if (utils) {
            // Use tRPC mutation to delete document
            await utils.client.document.deleteDocument.mutate({ id });
            
            // Invalidate the document query cache
            utils.document.getDocuments.invalidate();
          } else {
            // Fallback using fetch for non-component context
            await fetch('/api/trpc/document.deleteDocument', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                json: { id }
              }),
            });
          }
        } catch (error) {
          console.error('Error deleting document:', error);
          set({ error: 'Failed to delete document. Please try again.' });
          
          // Reload data to restore state if the deletion failed
          await get().loadData();
        }
      },
      
      deleteMultipleDocuments: async (ids) => {
        set({ error: null });
        
        try {
          // Update UI state immediately for better UX
          set(state => ({
            documents: state.documents.filter(doc => !ids.includes(doc.id)),
            selectedDocumentId: ids.includes(state.selectedDocumentId || '') 
              ? null 
              : state.selectedDocumentId,
            comparisonDocumentIds: state.comparisonDocumentIds.filter(docId => !ids.includes(docId))
          }));
          
          // Delete each document in sequence
          for (const id of ids) {
            const utils = trpc.useUtils?.() || null;
            
            if (utils) {
              await utils.client.document.deleteDocument.mutate({ id });
            } else {
              await fetch('/api/trpc/document.deleteDocument', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  json: { id }
                }),
              });
            }
          }
          
          // Invalidate the document query cache
          const utils = trpc.useUtils?.() || null;
          if (utils) {
            utils.document.getDocuments.invalidate();
          }
        } catch (error) {
          console.error('Error deleting multiple documents:', error);
          set({ error: 'Failed to delete all documents. Please try again.' });
          
          // Reload data to restore state if any deletion failed
          await get().loadData();
        }
      },
      
      moveDocument: async (documentId, folderId) => {
        set({ error: null });
        
        try {
          const utils = trpc.useUtils?.() || null;
          
          if (utils) {
            // Use tRPC mutation to move document
            await utils.client.document.updateDocument.mutate({
              id: documentId,
              folderId: folderId
            });
            
            // Invalidate the document query cache
            utils.document.getDocuments.invalidate();
          } else {
            // Fallback using fetch for non-component context
            await fetch('/api/trpc/document.updateDocument', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                json: {
                  id: documentId,
                  folderId: folderId
                }
              }),
            });
            
            // Update the local state
            set(state => ({
              documents: state.documents.map(doc => 
                doc.id === documentId 
                  ? { ...doc, folderId } 
                  : doc
              )
            }));
          }
        } catch (error) {
          console.error('Error moving document:', error);
          set({ error: 'Failed to move document. Please try again.' });
        }
      },
      
      renameDocument: async (documentId, newName) => {
        set({ error: null });
        
        try {
          const utils = trpc.useUtils?.() || null;
          
          if (utils) {
            // Use tRPC mutation to rename document
            await utils.client.document.updateDocument.mutate({
              id: documentId,
              title: newName
            });
            
            // Invalidate the document query cache
            utils.document.getDocuments.invalidate();
          } else {
            // Fallback using fetch for non-component context
            await fetch('/api/trpc/document.updateDocument', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                json: {
                  id: documentId,
                  title: newName
                }
              }),
            });
            
            // Update the local state
            set(state => ({
              documents: state.documents.map(doc => 
                doc.id === documentId 
                  ? { ...doc, name: newName } 
                  : doc
              )
            }));
          }
        } catch (error) {
          console.error('Error renaming document:', error);
          set({ error: 'Failed to rename document. Please try again.' });
        }
      },
      
      selectDocument: (id) => {
        set({ selectedDocumentId: id });
      },
      
      // Folder operations
      addFolder: async (name, parentId = null) => {
        set({ error: null });
        
        try {
          const utils = trpc.useUtils?.() || null;
          
          if (utils) {
            // Use tRPC mutation to create folder
            await utils.client.folders.createFolder.mutate({
              name,
              parentId: parentId || undefined
            });
            
            // Invalidate the folders query cache
            utils.folders.getFolders.invalidate();
          } else {
            // Fallback using fetch for non-component context
            await fetch('/api/trpc/folders.createFolder', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                json: {
                  name,
                  parentId: parentId || undefined
                }
              }),
            });
            
            // Reload folders to update state
            await get().loadData();
          }
        } catch (error) {
          console.error('Error creating folder:', error);
          set({ error: 'Failed to create folder. Please try again.' });
        }
      },
      
      updateFolder: async (id, name, parentId = null) => {
        set({ error: null });
        
        try {
          const utils = trpc.useUtils?.() || null;
          
          if (utils) {
            // Use tRPC mutation to update folder
            await utils.client.folders.updateFolder.mutate({
              id,
              name,
              parentId: parentId || undefined
            });
            
            // Invalidate the folders query cache
            utils.folders.getFolders.invalidate();
          } else {
            // Fallback using fetch for non-component context
            await fetch('/api/trpc/folders.updateFolder', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                json: {
                  id,
                  name,
                  parentId: parentId || undefined
                }
              }),
            });
            
            // Update the local state
            set(state => ({
              folders: state.folders.map(folder => 
                folder.id === id 
                  ? { ...folder, name, parentId } 
                  : folder
              )
            }));
          }
        } catch (error) {
          console.error('Error updating folder:', error);
          set({ error: 'Failed to update folder. Please try again.' });
        }
      },
      
      deleteFolder: async (id) => {
        set({ error: null });
        
        try {
          const utils = trpc.useUtils?.() || null;
          
          // Update UI state immediately for better UX
          set(state => ({
            folders: state.folders.filter(folder => folder.id !== id),
            selectedFolderId: state.selectedFolderId === id ? null : state.selectedFolderId,
            selectedFolderIds: state.selectedFolderIds.filter(folderId => folderId !== id)
          }));
          
          if (utils) {
            // Use tRPC mutation to delete folder
            await utils.client.folders.deleteFolder.mutate({
              id,
              recursive: true
            });
            
            // Invalidate both folders and documents query caches
            utils.folders.getFolders.invalidate();
            utils.document.getDocuments.invalidate();
          } else {
            // Fallback using fetch for non-component context
            await fetch('/api/trpc/folders.deleteFolder', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                json: {
                  id,
                  recursive: true
                }
              }),
            });
            
            // Reload data to get updated documents and folders
            await get().loadData();
          }
        } catch (error) {
          console.error('Error deleting folder:', error);
          set({ error: 'Failed to delete folder. Please try again.' });
          
          // Reload data to restore state if the deletion failed
          await get().loadData();
        }
      },
      
      renameFolder: async (folderId, newName) => {
        set({ error: null });
        
        try {
          const utils = trpc.useUtils?.() || null;
          const folder = get().folders.find(f => f.id === folderId);
          
          if (!folder) {
            throw new Error('Folder not found');
          }
          
          if (utils) {
            // Use tRPC mutation to rename folder
            await utils.client.folders.updateFolder.mutate({
              id: folderId,
              name: newName
            });
            
            // Invalidate the folders query cache
            utils.folders.getFolders.invalidate();
          } else {
            // Fallback using fetch for non-component context
            await fetch('/api/trpc/folders.updateFolder', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                json: {
                  id: folderId,
                  name: newName
                }
              }),
            });
            
            // Update the local state
            set(state => ({
              folders: state.folders.map(f => 
                f.id === folderId 
                  ? { ...f, name: newName } 
                  : f
              )
            }));
          }
        } catch (error) {
          console.error('Error renaming folder:', error);
          set({ error: 'Failed to rename folder. Please try again.' });
        }
      },
      
      moveFolder: async (folderId, parentId) => {
        set({ error: null });
        
        try {
          const utils = trpc.useUtils?.() || null;
          
          if (utils) {
            // Use tRPC mutation to move folder
            await utils.client.folders.moveFolder.mutate({
              id: folderId,
              newParentId: parentId
            });
            
            // Invalidate the folders query cache
            utils.folders.getFolders.invalidate();
          } else {
            // Fallback using fetch for non-component context
            await fetch('/api/trpc/folders.moveFolder', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                json: {
                  id: folderId,
                  newParentId: parentId
                }
              }),
            });
            
            // Update the local state
            set(state => ({
              folders: state.folders.map(folder => 
                folder.id === folderId 
                  ? { ...folder, parentId } 
                  : folder
              )
            }));
          }
        } catch (error) {
          console.error('Error moving folder:', error);
          set({ error: 'Failed to move folder. Please try again.' });
        }
      },
      
      selectFolder: (id) => {
        set({ selectedFolderId: id });
      },
      
      // Backlinks operations
      loadBacklinks: async (documentId) => {
        set({ error: null });
        
        try {
          const utils = trpc.useUtils?.() || null;
          
          if (utils) {
            // Use tRPC query to get backlinks
            const backlinks = await utils.client.backlinks.getBacklinks.query({
              documentId
            });
            
            set({ 
              backlinks: backlinks.map(link => ({ 
                id: link.id, 
                name: link.title 
              })) 
            });
          } else {
            // Fallback using fetch for non-component context
            const response = await fetch(`/api/trpc/backlinks.getBacklinks?input=${encodeURIComponent(JSON.stringify({ documentId }))}`);
            const data = await response.json();
            
            if (data.result.data) {
              set({ 
                backlinks: data.result.data.map((link: any) => ({ 
                  id: link.id, 
                  name: link.title 
                }))
              });
            }
          }
        } catch (error) {
          console.error('Error loading backlinks:', error);
          set({ 
            error: 'Failed to load backlinks. Please try again.',
            backlinks: []
          });
        }
      },
      
      // Comparison operations
      toggleComparisonDocument: (id) => {
        set(state => {
          const { comparisonDocumentIds } = state;
          const isSelected = comparisonDocumentIds.includes(id);
          
          if (isSelected) {
            return {
              comparisonDocumentIds: comparisonDocumentIds.filter(docId => docId !== id)
            };
          } else {
            return {
              comparisonDocumentIds: [...comparisonDocumentIds, id]
            };
          }
        });
      },
      
      clearComparisonDocuments: () => {
        set({ 
          comparisonDocumentIds: [],
          selectedFolderIds: []
        });
      },
    }),
    {
      name: 'trpc-document-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
); 