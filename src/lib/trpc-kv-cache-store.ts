import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { trpc } from '@/utils/trpc';

// Define cache statistics interface
export interface CacheStats {
  totalEntries: number;
  sizeInBytes: number;
  hitRate: number;
  avgResponseTime: number;
}

// Define debug info interface
export interface CacheDebugInfo {
  sessionId: string;
  timestamp: string;
  provider: string;
  model: string;
  systemMessage: string;
  userPrompt: string;
  responseLength: number;
  tokensUsed: number;
}

// Define the store state
interface KVCacheStore {
  cacheEnabled: boolean;
  cacheStats: CacheStats | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  flushCache: () => Promise<number>;
  getCacheStats: () => Promise<CacheStats>;
  getDebugInfo: (sessionId: string) => Promise<CacheDebugInfo>;
  toggleCache: (enabled: boolean) => void;
}

// Create the store with tRPC integration
export const useTrpcKVCacheStore = create<KVCacheStore>()(
  persist(
    (set) => ({
      cacheEnabled: true,
      cacheStats: null,
      isLoading: false,
      error: null,
      
      // Flush all cache entries
      flushCache: async () => {
        set({ isLoading: true, error: null });
        
        try {
          const utils = trpc.useUtils?.() || null;
          
          if (utils) {
            // Use tRPC mutation to flush cache
            const result = await utils.client.kvCache.flushCache.mutate();
            
            set({ 
              isLoading: false,
              cacheStats: null // Reset stats as they're now invalid
            });
            
            return result.entriesRemoved;
          } else {
            // Fallback using fetch for non-component context
            const response = await fetch('/api/trpc/kvCache.flushCache', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ json: {} })
            });
            
            const data = await response.json();
            
            set({ 
              isLoading: false,
              cacheStats: null // Reset stats as they're now invalid
            });
            
            if (data.result?.data) {
              return data.result.data.entriesRemoved;
            }
            
            return 0;
          }
        } catch (error) {
          console.error('Error flushing cache:', error);
          set({ 
            isLoading: false,
            error: 'Failed to flush cache. Please try again.' 
          });
          
          return 0;
        }
      },
      
      // Get cache statistics
      getCacheStats: async () => {
        set({ isLoading: true, error: null });
        
        try {
          const utils = trpc.useUtils?.() || null;
          
          if (utils) {
            // Use tRPC query to get cache stats
            const stats = await utils.client.kvCache.getCacheStats.query();
            
            set({ 
              cacheStats: stats,
              isLoading: false 
            });
            
            return stats;
          } else {
            // Fallback using fetch for non-component context
            const response = await fetch('/api/trpc/kvCache.getCacheStats');
            const data = await response.json();
            
            if (data.result?.data) {
              const stats: CacheStats = data.result.data;
              
              set({ 
                cacheStats: stats,
                isLoading: false 
              });
              
              return stats;
            }
            
            // Return default stats if fetch fails
            const defaultStats: CacheStats = {
              totalEntries: 0,
              sizeInBytes: 0,
              hitRate: 0,
              avgResponseTime: 0
            };
            
            set({
              cacheStats: defaultStats,
              isLoading: false
            });
            
            return defaultStats;
          }
        } catch (error) {
          console.error('Error getting cache statistics:', error);
          
          const defaultStats: CacheStats = {
            totalEntries: 0,
            sizeInBytes: 0,
            hitRate: 0,
            avgResponseTime: 0
          };
          
          set({ 
            isLoading: false,
            error: 'Failed to get cache statistics. Please try again.',
            cacheStats: defaultStats
          });
          
          return defaultStats;
        }
      },
      
      // Get debug info for a session
      getDebugInfo: async (sessionId: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const utils = trpc.useUtils?.() || null;
          
          if (utils) {
            // Use tRPC query to get debug info
            const debugInfo = await utils.client.kvCache.getDebugInfo.query({
              sessionId
            });
            
            set({ isLoading: false });
            return debugInfo;
          } else {
            // Fallback using fetch for non-component context
            const response = await fetch(`/api/trpc/kvCache.getDebugInfo?input=${encodeURIComponent(JSON.stringify({ sessionId }))}`);
            const data = await response.json();
            
            set({ isLoading: false });
            
            if (data.result?.data) {
              return data.result.data;
            }
            
            // Return default debug info if fetch fails
            return {
              sessionId,
              timestamp: new Date().toISOString(),
              provider: 'unknown',
              model: 'unknown',
              systemMessage: 'Not available',
              userPrompt: 'Not available',
              responseLength: 0,
              tokensUsed: 0
            };
          }
        } catch (error) {
          console.error(`Error getting debug info for session "${sessionId}":`, error);
          set({ 
            isLoading: false,
            error: `Failed to get debug info for session "${sessionId}". Please try again.`
          });
          
          // Return default debug info if API call fails
          return {
            sessionId,
            timestamp: new Date().toISOString(),
            provider: 'unknown',
            model: 'unknown',
            systemMessage: 'Not available',
            userPrompt: 'Not available',
            responseLength: 0,
            tokensUsed: 0
          };
        }
      },
      
      // Toggle cache enabled/disabled
      toggleCache: (enabled: boolean) => {
        set({ cacheEnabled: enabled });
      }
    }),
    {
      name: 'trpc-kv-cache-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        cacheEnabled: state.cacheEnabled
      })
    }
  )
); 