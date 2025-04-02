/**
 * Mock implementation of Vercel KV for local development
 * This provides in-memory storage that mimics the Vercel KV API
 */

import { isCachingEnabled } from './middleware-safe-config';
import { isCacheKey } from './middleware-safe-cache';

// In-memory storage with properly typed values
const store = new Map<string, unknown>();

// Mock expiration timers
const expirations = new Map<string, NodeJS.Timeout>();

// Helper function to determine if an operation should be logged
const shouldLog = (key: string): boolean => {
  // Always log non-cache operations
  if (!isCacheKey(key)) return true;
  
  // Only log cache operations if caching is enabled
  return isCachingEnabled();
};

// Helper function to determine if a cache operation should be performed
const shouldPerformCacheOperation = (key: string): boolean => {
  // Always perform non-cache operations
  if (!isCacheKey(key)) return true;
  
  // Only perform cache operations if caching is enabled
  return isCachingEnabled();
};

export const mockKV = {
  // Basic operations
  get: async (key: string) => {
    if (shouldLog(key)) {
      console.log(`[Mock KV] GET: ${key}`);
    }
    
    // Skip cache lookups if caching is disabled
    if (!shouldPerformCacheOperation(key)) {
      return null;
    }
    
    return store.get(key) || null;
  },
  
  set: async (key: string, value: unknown, options?: { ex?: number }) => {
    if (shouldLog(key)) {
      console.log(`[Mock KV] SET: ${key}`);
    }
    
    // Skip cache storage if caching is disabled
    if (!shouldPerformCacheOperation(key)) {
      return 'OK';
    }
    
    store.set(key, value);
    
    // Handle expiration if set
    if (options?.ex) {
      // Clear any existing expiration
      if (expirations.has(key)) {
        clearTimeout(expirations.get(key)!);
      }
      
      // Set new expiration
      const timeout = setTimeout(() => {
        store.delete(key);
        expirations.delete(key);
        if (shouldLog(key)) {
          console.log(`[Mock KV] EXPIRED: ${key}`);
        }
      }, options.ex * 1000);
      
      expirations.set(key, timeout);
    }
    
    return 'OK';
  },
  
  delete: async (key: string) => {
    if (shouldLog(key)) {
      console.log(`[Mock KV] DELETE: ${key}`);
    }
    
    const existed = store.has(key);
    store.delete(key);
    
    // Clear any expiration
    if (expirations.has(key)) {
      clearTimeout(expirations.get(key)!);
      expirations.delete(key);
    }
    
    return existed ? 1 : 0;
  },
  
  // Add del method as an alias to delete for Vercel KV compatibility
  del: async (key: string) => {
    if (shouldLog(key)) {
      console.log(`[Mock KV] DEL: ${key}`);
    }
    
    const existed = store.has(key);
    store.delete(key);
    
    // Clear any expiration
    if (expirations.has(key)) {
      clearTimeout(expirations.get(key)!);
      expirations.delete(key);
    }
    
    return existed ? 1 : 0;
  },
  
  // Additional methods to match Vercel KV API
  exists: async (key: string) => {
    // Skip cache checks if caching is disabled
    if (isCacheKey(key) && !isCachingEnabled()) {
      return 0;
    }
    
    return store.has(key) ? 1 : 0;
  },
  
  expire: async (key: string, seconds: number) => {
    // Skip cache operations if caching is disabled
    if (isCacheKey(key) && !isCachingEnabled()) {
      return 0;
    }
    
    if (!store.has(key)) return 0;
    
    // Clear any existing expiration
    if (expirations.has(key)) {
      clearTimeout(expirations.get(key)!);
    }
    
    // Set new expiration
    const timeout = setTimeout(() => {
      store.delete(key);
      expirations.delete(key);
      if (shouldLog(key)) {
        console.log(`[Mock KV] EXPIRED: ${key}`);
      }
    }, seconds * 1000);
    
    expirations.set(key, timeout);
    return 1;
  },
  
  // Get all keys matching a pattern
  keys: async (pattern: string) => {
    if (shouldLog(pattern)) {
      console.log(`[Mock KV] KEYS: ${pattern}`);
    }
    
    // Skip cache pattern matching if caching is disabled and pattern is cache-related
    if (isCacheKey(pattern) && !isCachingEnabled()) {
      return [];
    }
    
    // Convert glob pattern to regex
    const regexPattern = new RegExp(
      '^' + 
      pattern
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.')
        .replace(/\[/g, '[')
        .replace(/\]/g, ']') + 
      '$'
    );
    
    // Filter keys based on the pattern
    let matchingKeys = Array.from(store.keys()).filter(key => 
      regexPattern.test(key)
    );
    
    // If caching is disabled, filter out cache-related keys
    if (!isCachingEnabled()) {
      matchingKeys = matchingKeys.filter(key => !isCacheKey(key));
    }
    
    return matchingKeys;
  },
  
  // Flush all cache-related keys
  flushCache: async () => {
    console.log('[Mock KV] FLUSH CACHE: Removing all cache entries');
    
    // Get all keys
    const allKeys = Array.from(store.keys());
    
    // Filter for cache-related keys
    const cacheKeys = allKeys.filter(key => isCacheKey(key));
    
    // Delete each cache key
    let deletedCount = 0;
    for (const key of cacheKeys) {
      store.delete(key);
      
      // Clear any expiration
      if (expirations.has(key)) {
        clearTimeout(expirations.get(key)!);
        expirations.delete(key);
      }
      
      deletedCount++;
    }
    
    console.log(`[Mock KV] FLUSH CACHE: Removed ${deletedCount} cache entries`);
    return deletedCount;
  },
  
  // Add other methods as needed to match the Vercel KV API
}; 