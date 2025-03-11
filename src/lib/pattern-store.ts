import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { 
  fetchPatterns, 
  fetchFolders as fetchPatternFolders, 
  savePatternToServer, 
  saveFolderToServer as savePatternFolderToServer, 
  deletePatternFromServer, 
  deleteFolderFromServer as deletePatternFolderFromServer 
} from './pattern-api-service';
import { 
  DEFAULT_LLM_PROVIDER, 
  DEFAULT_LLM_MODEL, 
  OPENAI_API_KEY, 
  GOOGLE_API_KEY 
} from './config';

export interface PatternVersion {
  id: string;
  content: string;
  createdAt: Date;
  message?: string;
}

export interface Pattern {
  id: string;
  name: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  versions: PatternVersion[];
  folderId: string | null; // Add folder reference
}

export interface Folder {
  id: string;
  name: string;
  createdAt: Date;
  parentId: string | null; // For nested folders
}

interface PatternStore {
  patterns: Pattern[];
  folders: Folder[];
  selectedPatternId: string | null;
  selectedFolderId: string | null;
  comparisonPatternIds: string[];
  isLoading: boolean;
  error: string | null;
  
  // Pattern operations
  addPattern: (name: string, content: string, folderId?: string | null) => Promise<void>;
  updatePattern: (id: string, data: Partial<Pattern>, createVersion?: boolean, versionMessage?: string) => Promise<void>;
  deletePattern: (id: string) => Promise<void>;
  movePattern: (patternId: string, folderId: string | null) => Promise<void>;
  selectPattern: (id: string | null) => void;
  
  // Folder operations
  addFolder: (name: string, parentId?: string | null) => Promise<void>;
  updateFolder: (id: string, name: string, parentId?: string | null) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  selectFolder: (id: string | null) => void;
  
  // Comparison operations
  toggleComparisonPattern: (id: string) => void;
  clearComparisonPatterns: () => void;
  getPatternVersions: (id: string) => PatternVersion[];
  
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

export const usePatternStore = create<PatternStore>()(
  persist(
    (set, get) => ({
      patterns: [],
      folders: [],
      selectedPatternId: null,
      selectedFolderId: null,
      comparisonPatternIds: [],
      isLoading: false,
      error: null,
      
      setError: (error) => set({ error }),
      
      loadData: async () => {
        set({ isLoading: true, error: null });
        
        try {
          // Load patterns and folders from the server
          const [patterns, folders] = await Promise.all([
            fetchPatterns(),
            fetchPatternFolders()
          ]);
          
          // Set the data from the server, or empty arrays if none exists
          set({ 
            patterns: patterns || [],
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
      
      addPattern: async (name, content, folderId = null) => {
        set({ error: null });
        const timestamp = new Date();
        const newPattern: Pattern = {
          id: `pattern-${timestamp.getTime()}`,
          name,
          content,
          createdAt: timestamp,
          updatedAt: timestamp,
          versions: [],
          folderId,
        };
        
        // Create an initial version
        const initialVersion: PatternVersion = {
          id: `ver-${timestamp.getTime()}-initial`,
          content,
          createdAt: timestamp,
          message: "Initial version",
        };
        
        newPattern.versions = [initialVersion];
        
        // Update local state immediately
        set((state) => ({
          patterns: [...state.patterns, newPattern],
          selectedPatternId: newPattern.id,
        }));
        
        // Then save to server
        try {
          await savePatternToServer(newPattern);
        } catch (error) {
          console.error('Error saving pattern to server:', error);
          set({ error: 'Failed to save pattern to server. Changes may not persist.' });
        }
      },
      
      updatePattern: async (id, data, createVersion = false, versionMessage = "") => {
        set({ error: null });
        const state = get();
        const patternToUpdate = state.patterns.find(pattern => pattern.id === id);
        if (!patternToUpdate) return;
        
        let versions = [...(patternToUpdate.versions || [])];
        
        if (createVersion) {
          const timestamp = new Date();
          const newVersion: PatternVersion = {
            id: `ver-${timestamp.getTime()}`,
            content: patternToUpdate.content,
            createdAt: timestamp,
            message: versionMessage || `Version created on ${timestamp.toLocaleString()}`,
          };
          versions = [newVersion, ...versions];
        }
        
        const updatedPattern = { 
          ...patternToUpdate, 
          ...data, 
          updatedAt: new Date(),
          versions: versions
        };
        
        // Update local state immediately
        set((state) => ({
          patterns: state.patterns.map((pattern) => 
            pattern.id === id ? updatedPattern : pattern
          ),
        }));
        
        // Then save to server
        try {
          await savePatternToServer(updatedPattern);
        } catch (error) {
          console.error('Error updating pattern on server:', error);
          set({ error: 'Failed to update pattern on server. Changes may not persist.' });
        }
      },
      
      movePattern: async (patternId, folderId) => {
        set({ error: null });
        const state = get();
        const patternToMove = state.patterns.find(pattern => pattern.id === patternId);
        
        if (!patternToMove) return;
        
        const updatedPattern = { ...patternToMove, folderId };
        
        // Update local state immediately
        set((state) => ({
          patterns: state.patterns.map((pattern) =>
            pattern.id === patternId
              ? updatedPattern
              : pattern
          ),
        }));
        
        // Then save to server
        try {
          await savePatternToServer(updatedPattern);
        } catch (error) {
          console.error('Error moving pattern on server:', error);
          set({ error: 'Failed to move pattern on server. Changes may not persist.' });
        }
      },

      deletePattern: async (id) => {
        set({ error: null });
        
        // Update local state immediately
        set((state) => ({
          patterns: state.patterns.filter((pattern) => pattern.id !== id),
          selectedPatternId: state.selectedPatternId === id ? null : state.selectedPatternId,
        }));
        
        // Then delete from server
        try {
          await deletePatternFromServer(id);
        } catch (error) {
          console.error('Error deleting pattern from server:', error);
          set({ error: 'Failed to delete pattern from server.' });
        }
      },
      
      selectPattern: (id) => {
        set({ selectedPatternId: id });
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
          selectedFolderId: newFolder.id,
        }));
        
        // Then save to server
        try {
          await savePatternFolderToServer(newFolder);
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
            folder.id === id
              ? updatedFolder
              : folder
          ),
        }));
        
        // Then save to server
        try {
          await savePatternFolderToServer(updatedFolder);
        } catch (error) {
          console.error('Error updating folder on server:', error);
          set({ error: 'Failed to update folder on server. Changes may not persist.' });
        }
      },
      
      deleteFolder: async (id) => {
        set({ error: null });
        const state = get();
        
        // Get all patterns in this folder and its subfolders
        const foldersToDelete = new Set<string>([id]);
        const collectSubfolders = (folderId: string) => {
          state.folders
            .filter(folder => folder.parentId === folderId)
            .forEach(subfolder => {
              foldersToDelete.add(subfolder.id);
              collectSubfolders(subfolder.id);
            });
        };
        
        collectSubfolders(id);
        
        const patternsToDelete = state.patterns.filter(
          pattern => pattern.folderId !== null && foldersToDelete.has(pattern.folderId)
        );
        
        // Update local state immediately
        set((state) => ({
          folders: state.folders.filter(folder => !foldersToDelete.has(folder.id)),
          patterns: state.patterns.filter(pattern => 
            pattern.folderId === null || !foldersToDelete.has(pattern.folderId)
          ),
          selectedFolderId: state.selectedFolderId && foldersToDelete.has(state.selectedFolderId) 
            ? null 
            : state.selectedFolderId,
          selectedPatternId: state.selectedPatternId && patternsToDelete.some(pattern => pattern.id === state.selectedPatternId)
            ? null
            : state.selectedPatternId,
        }));
        
        // Then delete from server
        try {
          await deletePatternFolderFromServer(id);
          
          // Also delete all patterns in this folder
          for (const pattern of patternsToDelete) {
            await deletePatternFromServer(pattern.id);
          }
        } catch (error) {
          console.error('Error deleting folder from server:', error);
          set({ error: 'Failed to delete folder from server.' });
        }
      },
      
      selectFolder: (id) => {
        set({ selectedFolderId: id });
      },
      
      toggleComparisonPattern: (id) => {
        set((state) => {
          const { comparisonPatternIds } = state;
          
          if (comparisonPatternIds.includes(id)) {
            return { 
              comparisonPatternIds: comparisonPatternIds.filter(patternId => patternId !== id) 
            };
          }
          
          // Only allow selecting up to 2 patterns for comparison
          if (comparisonPatternIds.length < 2) {
            return { 
              comparisonPatternIds: [...comparisonPatternIds, id] 
            };
          }
          
          // If already have 2, replace the second one
          return { 
            comparisonPatternIds: [comparisonPatternIds[0], id] 
          };
        });
      },
      
      clearComparisonPatterns: () => {
        set({ comparisonPatternIds: [] });
      },
      
      getPatternVersions: (id) => {
        const state = get();
        const pattern = state.patterns.find(pattern => pattern.id === id);
        return pattern?.versions || [];
      },
    }),
    {
      name: 'pattern-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        ...state,
        isLoading: false,
        error: null,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Fix dates after rehydration
          state.patterns = fixDates(state.patterns);
          state.folders = fixDates(state.folders);
        }
      },
    }
  )
); 