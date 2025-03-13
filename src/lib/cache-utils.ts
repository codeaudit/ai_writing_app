import { mockKV } from './mock-kv';

/**
 * Utility functions for managing the AI response cache
 */

/**
 * Flushes all AI-related cache entries from the KV store
 * @returns Promise<number> The number of cache entries that were removed
 */
export async function flushAICache(): Promise<number> {
  try {
    // In a production environment, this would use the actual Vercel KV client
    // For local development, we use the mock KV implementation
    const deletedCount = await mockKV.flushCache();
    return deletedCount;
  } catch (error) {
    console.error('[Cache Utils] Error flushing cache:', error);
    throw error;
  }
} 