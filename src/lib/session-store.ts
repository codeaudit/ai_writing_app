import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Document } from './store';

/**
 * Interface representing a document session
 */
export interface DocumentSession {
  id: string;
  name: string;
  description?: string;
  documentIds: string[];
  lastAccessed: Date;
  created: Date;
  color?: string;
}

/**
 * Interface for the session state store
 */
interface SessionState {
  sessions: DocumentSession[];
  activeSessionId: string | null;
  isLoading: boolean;
  error: string | null;
  lastSyncTime: number | null;
  isSyncRequired: boolean;
  
  // Session management
  createSession: (name: string, description?: string, initialDocIds?: string[], color?: string) => Promise<string>;
  updateSession: (id: string, updates: Partial<Omit<DocumentSession, 'id' | 'created'>>) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  setActiveSession: (id: string | null) => void;
  
  // Document management within sessions
  addDocumentToSession: (sessionId: string, documentId: string) => Promise<void>;
  removeDocumentFromSession: (sessionId: string, documentId: string) => Promise<void>;
  
  // Session utility functions
  getSessionDocuments: (sessionId: string, allDocuments: Document[]) => Document[];
  
  // Save and load functions
  loadSessions: () => Promise<void>;
  saveSessions: () => Promise<void>;
  
  // New sync functions
  checkSync: () => Promise<boolean>;
  refreshSessions: () => Promise<void>;
  repairSessions: () => Promise<void>;
}

/**
 * Zustand store for managing document sessions
 */
export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      sessions: [],
      activeSessionId: null,
      isLoading: false,
      error: null,
      lastSyncTime: null,
      isSyncRequired: false,
      
      createSession: async (name, description, initialDocIds = [], color) => {
        set({ isLoading: true, error: null });
        
        try {
          const id = `session-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;
          const newSession: DocumentSession = {
            id,
            name,
            description,
            documentIds: initialDocIds,
            lastAccessed: new Date(),
            created: new Date(),
            color,
          };
          
          set((state) => ({
            sessions: [...state.sessions, newSession],
            activeSessionId: id,
            isLoading: false,
            lastSyncTime: Date.now(),
          }));
          
          // Save sessions to API
          await get().saveSessions();
          
          return id;
        } catch (error) {
          console.error('Error creating session:', error);
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : 'Failed to create session',
            isSyncRequired: true
          });
          throw error;
        }
      },
      
      updateSession: async (id, updates) => {
        set({ isLoading: true, error: null });
        
        try {
          set((state) => ({
            sessions: state.sessions.map((session) => 
              session.id === id 
                ? { 
                    ...session, 
                    ...updates, 
                    lastAccessed: new Date() 
                  } 
                : session
            ),
            isLoading: false,
            lastSyncTime: Date.now(),
          }));
          
          // Update session via API
          const response = await fetch(`/api/sessions`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              id,
              updates: {
                ...updates,
                lastAccessed: new Date()
              }
            })
          });
          
          if (!response.ok) {
            throw new Error(`Failed to update session: ${response.statusText}`);
          }
        } catch (error) {
          console.error('Error updating session:', error);
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : 'Failed to update session',
            isSyncRequired: true
          });
        }
      },
      
      deleteSession: async (id) => {
        set({ isLoading: true, error: null });
        
        try {
          set((state) => ({
            sessions: state.sessions.filter((session) => session.id !== id),
            activeSessionId: state.activeSessionId === id ? null : state.activeSessionId,
            isLoading: false,
            lastSyncTime: Date.now(),
          }));
          
          // Delete session via API
          const response = await fetch(`/api/sessions?id=${id}`, {
            method: 'DELETE'
          });
          
          if (!response.ok) {
            throw new Error(`Failed to delete session: ${response.statusText}`);
          }
        } catch (error) {
          console.error('Error deleting session:', error);
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : 'Failed to delete session',
            isSyncRequired: true
          });
        }
      },
      
      setActiveSession: (id) => {
        // Update lastAccessed timestamp when switching to a session
        if (id) {
          set((state) => ({
            sessions: state.sessions.map((session) => 
              session.id === id 
                ? { ...session, lastAccessed: new Date() } 
                : session
            ),
            activeSessionId: id,
          }));
        } else {
          set({ activeSessionId: null });
        }
      },
      
      addDocumentToSession: async (sessionId, documentId) => {
        set({ isLoading: true, error: null });
        
        try {
          // First check if this session already has this document
          const sessionExists = get().sessions.find(s => s.id === sessionId);
          if (!sessionExists) {
            console.log(`Session ${sessionId} not found`);
            set({ isLoading: false });
            return;
          }
          
          // Don't add if document is already in the session
          if (sessionExists.documentIds.includes(documentId)) {
            console.log(`Document ${documentId} already in session ${sessionId}`);
            set({ isLoading: false });
            return;
          }
          
          // Update the state with the new document
          set((state) => ({
            sessions: state.sessions.map((session) => {
              if (session.id === sessionId) {
                return { 
                  ...session, 
                  documentIds: [...session.documentIds, documentId],
                  lastAccessed: new Date()
                };
              }
              return session;
            }),
            isLoading: false,
            lastSyncTime: Date.now(),
          }));
          
          // Use the dedicated API endpoint for adding documents to sessions
          const response = await fetch(`/api/sessions/documents`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              sessionId,
              documentId
            })
          });
          
          if (!response.ok) {
            throw new Error(`Failed to add document to session: ${response.statusText}`);
          }
        } catch (error) {
          console.error('Error adding document to session:', error);
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : 'Failed to add document to session',
            isSyncRequired: true
          });
        }
      },
      
      removeDocumentFromSession: async (sessionId, documentId) => {
        set({ isLoading: true, error: null });
        
        try {
          set((state) => ({
            sessions: state.sessions.map((session) => {
              if (session.id === sessionId) {
                return { 
                  ...session, 
                  documentIds: session.documentIds.filter(id => id !== documentId),
                  lastAccessed: new Date()
                };
              }
              return session;
            }),
            isLoading: false,
            lastSyncTime: Date.now(),
          }));
          
          // Use the dedicated API endpoint for removing documents from sessions
          const response = await fetch(`/api/sessions/documents?sessionId=${sessionId}&documentId=${documentId}`, {
            method: 'DELETE'
          });
          
          if (!response.ok) {
            throw new Error(`Failed to remove document from session: ${response.statusText}`);
          }
        } catch (error) {
          console.error('Error removing document from session:', error);
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : 'Failed to remove document from session',
            isSyncRequired: true
          });
        }
      },
      
      getSessionDocuments: (sessionId, allDocuments) => {
        const session = get().sessions.find(s => s.id === sessionId);
        if (!session) return [];
        
        return allDocuments.filter(doc => session.documentIds.includes(doc.id));
      },
      
      loadSessions: async () => {
        try {
          set({ isLoading: true, error: null });
          
          // Fetch sessions from API
          const response = await fetch('/api/sessions');
          
          if (!response.ok) {
            throw new Error(`Failed to load sessions: ${response.statusText}`);
          }
          
          const sessions = await response.json();
          
          // Fix dates since they're serialized as strings in JSON
          const sessionsWithDates = sessions.map((session: {
            id: string;
            name: string;
            description?: string;
            documentIds: string[];
            lastAccessed: string;
            created: string;
            color?: string;
          }) => ({
            ...session,
            created: new Date(session.created),
            lastAccessed: new Date(session.lastAccessed)
          }));
          
          set({ 
            sessions: sessionsWithDates,
            isLoading: false,
            lastSyncTime: Date.now(),
            isSyncRequired: false
          });
        } catch (error) {
          console.error('Error loading sessions:', error);
          set({ 
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to load sessions',
            sessions: [], // Reset to empty array on error
            isSyncRequired: true
          });
        }
      },
      
      saveSessions: async () => {
        try {
          set({ error: null, isLoading: true });
          const { sessions } = get();
          
          // Save sessions via API
          const response = await fetch('/api/sessions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ sessions })
          });
          
          if (!response.ok) {
            throw new Error(`Failed to save sessions: ${response.statusText}`);
          }
          
          // Log success
          console.log('Sessions saved successfully via API');
          set({ 
            isLoading: false,
            lastSyncTime: Date.now(),
            isSyncRequired: false
          });
        } catch (error) {
          console.error('Error saving sessions:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Failed to save sessions',
            isLoading: false,
            isSyncRequired: true
          });
        }
      },
      
      // Check if the server and client are in sync
      checkSync: async () => {
        try {
          // Get current sessions from server
          const response = await fetch('/api/sessions');
          
          if (!response.ok) {
            throw new Error(`Failed to check session sync: ${response.statusText}`);
          }
          
          const serverSessions = await response.json();
          const { sessions: clientSessions } = get();
          
          // Basic sync check - just compare the number of sessions and IDs
          const serverIds = new Set(serverSessions.map((s: {id: string}) => s.id));
          
          // Check if all client IDs exist on server
          const isSynced = clientSessions.length === serverSessions.length && 
            clientSessions.every(s => serverIds.has(s.id));
          
          // Update sync status
          set({ 
            isSyncRequired: !isSynced,
            lastSyncTime: isSynced ? Date.now() : get().lastSyncTime
          });
          
          return isSynced;
        } catch (error) {
          console.error('Error checking session sync:', error);
          set({ isSyncRequired: true });
          return false;
        }
      },
      
      // Force reload sessions from server
      refreshSessions: async () => {
        await get().loadSessions();
      },
      
      // Repair sessions by forcing a complete sync from client to server
      repairSessions: async () => {
        try {
          set({ isLoading: true, error: null });
          
          // First load latest data from server
          await get().loadSessions();
          
          // Then force save the current state back to server
          await get().saveSessions();
          
          set({
            isLoading: false,
            isSyncRequired: false,
            lastSyncTime: Date.now(),
            error: null
          });
        } catch (error) {
          console.error('Error repairing sessions:', error);
          set({ 
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to repair sessions',
            isSyncRequired: true
          });
        }
      }
    }),
    {
      name: 'document-sessions',
      skipHydration: true
    }
  )
); 