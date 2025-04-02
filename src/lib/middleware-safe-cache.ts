/**
 * Middleware-safe KV cache utilities
 * This file provides cache-related functions that are safe to use in Edge Runtime
 * because they don't depend on any modules that use eval() like gray-matter.
 */

import { kv } from './kv-provider';
import { isCachingEnabled } from './middleware-safe-config';

// Define an extended KV type that includes the 'del' method
interface ExtendedKV {
  get: typeof kv.get;
  set: typeof kv.set;
  keys: typeof kv.keys;
  del: (key: string) => Promise<number>;
}

/**
 * Checks if a string is a valid cache key pattern
 */
export function isCacheKey(key: string): boolean {
  return key.startsWith('ai-cache:') || 
         key.startsWith('ai-stream-cache:') || 
         key.startsWith('ai-response:');
}

/**
 * Gets a cached value if caching is enabled
 */
export async function getCachedValue<T>(key: string): Promise<T | null> {
  if (!isCachingEnabled()) {
    return null;
  }
  
  try {
    return await kv.get(key) as T | null;
  } catch (error) {
    console.error(`[Cache] Failed to get cached value for ${key}:`, error);
    return null;
  }
}

/**
 * Sets a cached value if caching is enabled
 */
export async function setCachedValue<T>(
  key: string, 
  value: T, 
  expirationSeconds?: number
): Promise<string | null> {
  if (!isCachingEnabled()) {
    return null;
  }
  
  try {
    if (expirationSeconds) {
      return await kv.set(key, value, { ex: expirationSeconds }) as string;
    } else {
      return await kv.set(key, value) as string;
    }
  } catch (error) {
    console.error(`[Cache] Failed to set cached value for ${key}:`, error);
    return null;
  }
}

/**
 * Deletes a cached value
 */
export async function deleteCachedValue(key: string): Promise<number> {
  try {
    // Use del method which is supported by both Vercel KV and our mock implementation
    return await (kv as ExtendedKV).del(key);
  } catch (error) {
    console.error(`[Cache] Failed to delete cached value for ${key}:`, error);
    return 0;
  }
}

/**
 * Flushes all cache keys
 */
export async function flushAllCache(): Promise<number> {
  try {
    // Get all cache keys
    const cacheKeys = await kv.keys('ai-*');
    
    // Delete each key
    let deletedCount = 0;
    for (const key of cacheKeys) {
      // Delete using the extended type
      const result = await (kv as ExtendedKV).del(key);
      deletedCount += result;
    }
    
    return deletedCount;
  } catch (error) {
    console.error('[Cache] Failed to flush cache:', error);
    return 0;
  }
} 