/**
 * Mock implementation of Vercel KV for local development
 * This provides in-memory storage that mimics the Vercel KV API
 */

// In-memory storage
const store = new Map<string, any>();

// Mock expiration timers
const expirations = new Map<string, NodeJS.Timeout>();

export const mockKV = {
  // Basic operations
  get: async (key: string) => {
    console.log(`[Mock KV] GET: ${key}`);
    return store.get(key) || null;
  },
  
  set: async (key: string, value: any, options?: { ex?: number }) => {
    console.log(`[Mock KV] SET: ${key}`);
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
        console.log(`[Mock KV] EXPIRED: ${key}`);
      }, options.ex * 1000);
      
      expirations.set(key, timeout);
    }
    
    return 'OK';
  },
  
  delete: async (key: string) => {
    console.log(`[Mock KV] DELETE: ${key}`);
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
    return store.has(key) ? 1 : 0;
  },
  
  expire: async (key: string, seconds: number) => {
    if (!store.has(key)) return 0;
    
    // Clear any existing expiration
    if (expirations.has(key)) {
      clearTimeout(expirations.get(key)!);
    }
    
    // Set new expiration
    const timeout = setTimeout(() => {
      store.delete(key);
      expirations.delete(key);
      console.log(`[Mock KV] EXPIRED: ${key}`);
    }, seconds * 1000);
    
    expirations.set(key, timeout);
    return 1;
  },
  
  // Get all keys matching a pattern
  keys: async (pattern: string) => {
    console.log(`[Mock KV] KEYS: ${pattern}`);
    
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
    const matchingKeys = Array.from(store.keys()).filter(key => 
      regexPattern.test(key)
    );
    
    return matchingKeys;
  },
  
  // Add other methods as needed to match the Vercel KV API
}; 