/**
 * Mock implementation of Vercel KV for local development
 * This provides in-memory storage that mimics the Vercel KV API
 */

// In-memory storage with properly typed values
const store = new Map<string, unknown>();

// Mock expiration timers
const expirations = new Map<string, NodeJS.Timeout>();

// Helper function to determine if an operation should be logged
const shouldLog = async (key: string): Promise<boolean> => {
  // Import these lazily to avoid circular dependencies
  const { isCacheKey } = await import('./middleware-safe-cache');
  const { isCachingEnabled } = await import('./middleware-safe-config');
  
  // Always log non-cache operations
  if (!isCacheKey(key)) return true;
  
  // Only log cache operations if caching is enabled
  return isCachingEnabled();
};

// Helper function to determine if a cache operation should be performed
const shouldPerformCacheOperation = async (key: string): Promise<boolean> => {
  // Import these lazily to avoid circular dependencies
  const { isCacheKey } = await import('./middleware-safe-cache');
  const { isCachingEnabled } = await import('./middleware-safe-config');
  
  // Always perform non-cache operations
  if (!isCacheKey(key)) return true;
  
  // Only perform cache operations if caching is enabled
  return isCachingEnabled();
};

// Function to check if key is a cache key (without importing)
const isLikelyCacheKey = (key: string): boolean => {
  return key.startsWith('ai-cache:') || 
         key.startsWith('ai-stream-cache:') || 
         key.startsWith('ai-response:');
};

export const mockKV = {
  // Basic operations
  get: async (key: string) => {
    if (await shouldLog(key)) {
      console.log(`[Mock KV] GET: ${key}`);
    }
    
    // Skip cache lookups if caching is disabled
    if (!await shouldPerformCacheOperation(key)) {
      return null;
    }
    
    return store.get(key) || null;
  },
  
  set: async (key: string, value: unknown, options?: { ex?: number }) => {
    if (await shouldLog(key)) {
      console.log(`[Mock KV] SET: ${key}`);
    }
    
    // Skip cache storage if caching is disabled
    if (!await shouldPerformCacheOperation(key)) {
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
        shouldLog(key).then(shouldLogResult => {
          if (shouldLogResult) {
            console.log(`[Mock KV] EXPIRED: ${key}`);
          }
        });
      }, options.ex * 1000);
      
      expirations.set(key, timeout);
    }
    
    return 'OK';
  },
  
  delete: async (key: string) => {
    if (await shouldLog(key)) {
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
    if (await shouldLog(key)) {
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
    const { isCacheKey } = await import('./middleware-safe-cache');
    const { isCachingEnabled } = await import('./middleware-safe-config');
    
    // Skip cache checks if caching is disabled
    if (isCacheKey(key) && !isCachingEnabled()) {
      return 0;
    }
    
    return store.has(key) ? 1 : 0;
  },
  
  expire: async (key: string, seconds: number) => {
    const { isCacheKey } = await import('./middleware-safe-cache');
    const { isCachingEnabled } = await import('./middleware-safe-config');
    
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
    const timeout = setTimeout(async () => {
      store.delete(key);
      expirations.delete(key);
      if (await shouldLog(key)) {
        console.log(`[Mock KV] EXPIRED: ${key}`);
      }
    }, seconds * 1000);
    
    expirations.set(key, timeout);
    return 1;
  },
  
  // Get all keys matching a pattern
  keys: async (pattern: string) => {
    if (await shouldLog(pattern)) {
      console.log(`[Mock KV] KEYS: ${pattern}`);
    }
    
    const { isCachingEnabled } = await import('./middleware-safe-config');
    
    // Skip cache pattern matching if caching is disabled and pattern is cache-related
    if (isLikelyCacheKey(pattern) && !isCachingEnabled()) {
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
      matchingKeys = matchingKeys.filter(key => !isLikelyCacheKey(key));
    }
    
    return matchingKeys;
  },
  
  // Flush all cache-related keys
  flushCache: async () => {
    console.log('[Mock KV] FLUSH CACHE: Removing all cache entries');
    
    // Get all keys
    const allKeys = Array.from(store.keys());
    
    // Filter for cache-related keys
    const cacheKeys = allKeys.filter(key => isLikelyCacheKey(key));
    
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