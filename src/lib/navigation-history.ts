import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface HistoryItem {
  path: string;
  isDirectory: boolean;
  timestamp: number;
  name?: string;
}

interface NavigationHistoryState {
  history: HistoryItem[];
  currentIndex: number;
  addToHistory: (path: string, isDirectory: boolean, name?: string) => void;
  canGoBack: () => boolean;
  canGoForward: () => boolean;
  goBack: () => HistoryItem | null;
  goForward: () => HistoryItem | null;
  clearHistory: () => void;
}

export const useNavigationHistory = create<NavigationHistoryState>()(
  persist(
    (set, get) => ({
      history: [],
      currentIndex: -1,
      
      addToHistory: (path, isDirectory, name) => {
        const { history, currentIndex } = get();
        const newItem: HistoryItem = {
          path,
          isDirectory,
          timestamp: Date.now(),
          name
        };
        
        // If we're not at the end of history, truncate history
        const newHistory = currentIndex < history.length - 1
          ? history.slice(0, currentIndex + 1)
          : [...history];
        
        // Don't add if it's the same as the current item
        if (currentIndex >= 0 && history[currentIndex]?.path === path) {
          return;
        }
        
        // Add new item to history
        newHistory.push(newItem);
        
        // If history gets too large, trim it
        const MAX_HISTORY = 100;
        if (newHistory.length > MAX_HISTORY) {
          newHistory.shift();
        }
        
        set({
          history: newHistory,
          currentIndex: newHistory.length - 1
        });
      },
      
      canGoBack: () => {
        const { currentIndex } = get();
        return currentIndex > 0;
      },
      
      canGoForward: () => {
        const { history, currentIndex } = get();
        return currentIndex < history.length - 1;
      },
      
      goBack: () => {
        const { history, currentIndex } = get();
        if (currentIndex <= 0) return null;
        
        const newIndex = currentIndex - 1;
        set({ currentIndex: newIndex });
        return history[newIndex];
      },
      
      goForward: () => {
        const { history, currentIndex } = get();
        if (currentIndex >= history.length - 1) return null;
        
        const newIndex = currentIndex + 1;
        set({ currentIndex: newIndex });
        return history[newIndex];
      },
      
      clearHistory: () => {
        set({ history: [], currentIndex: -1 });
      }
    }),
    {
      name: 'navigation-history',
      skipHydration: true
    }
  )
); 