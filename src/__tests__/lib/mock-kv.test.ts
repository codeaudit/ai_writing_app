import { mockKV } from '../../lib/mock-kv';
import { useLLMStore } from '../../lib/store';

// Mock the store module
jest.mock('../../lib/store', () => ({
  useLLMStore: {
    getState: jest.fn().mockReturnValue({
      config: {
        enableCache: true
      }
    })
  }
}));

describe('mock-kv', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Clear any stored values
    mockKV.keys('*').then(keys => {
      keys.forEach(key => mockKV.delete(key));
    });
    
    // Reset cache setting to enabled
    (useLLMStore.getState as jest.Mock).mockReturnValue({
      config: {
        enableCache: true
      }
    });
  });

  describe('basic operations', () => {
    it('should store and retrieve values', async () => {
      await mockKV.set('test-key', 'test-value');
      const value = await mockKV.get('test-key');
      
      expect(value).toBe('test-value');
    });

    it('should return null for non-existent keys', async () => {
      const value = await mockKV.get('non-existent-key');
      
      expect(value).toBeNull();
    });

    it('should delete values', async () => {
      await mockKV.set('test-key', 'test-value');
      await mockKV.delete('test-key');
      
      const value = await mockKV.get('test-key');
      expect(value).toBeNull();
    });

    it('should check if a key exists', async () => {
      await mockKV.set('test-key', 'test-value');
      
      const exists = await mockKV.exists('test-key');
      const nonExists = await mockKV.exists('non-existent-key');
      
      expect(exists).toBe(1);
      expect(nonExists).toBe(0);
    });
  });

  describe('expiration', () => {
    it('should set expiration when creating a key', async () => {
      jest.useFakeTimers();
      
      await mockKV.set('test-key', 'test-value', { ex: 1 });
      
      expect(await mockKV.get('test-key')).toBe('test-value');
      
      // Fast-forward time
      jest.advanceTimersByTime(1100); // 1.1 seconds
      
      expect(await mockKV.get('test-key')).toBeNull();
      
      jest.useRealTimers();
    });

    it('should update expiration for an existing key', async () => {
      jest.useFakeTimers();
      
      await mockKV.set('test-key', 'test-value');
      await mockKV.expire('test-key', 1);
      
      expect(await mockKV.get('test-key')).toBe('test-value');
      
      // Fast-forward time
      jest.advanceTimersByTime(1100); // 1.1 seconds
      
      expect(await mockKV.get('test-key')).toBeNull();
      
      jest.useRealTimers();
    });
  });

  describe('pattern matching', () => {
    it('should find keys matching a pattern', async () => {
      await mockKV.set('test:1', 'value1');
      await mockKV.set('test:2', 'value2');
      await mockKV.set('other:3', 'value3');
      
      const testKeys = await mockKV.keys('test:*');
      const allKeys = await mockKV.keys('*');
      
      expect(testKeys).toHaveLength(2);
      expect(testKeys).toContain('test:1');
      expect(testKeys).toContain('test:2');
      
      expect(allKeys).toHaveLength(3);
    });
  });

  describe('cache operations', () => {
    it('should perform cache operations when caching is enabled', async () => {
      (useLLMStore.getState as jest.Mock).mockReturnValue({
        config: {
          enableCache: true
        }
      });
      
      await mockKV.set('ai-cache:test', 'cached-value');
      
      expect(await mockKV.get('ai-cache:test')).toBe('cached-value');
    });

    it('should not perform cache operations when caching is disabled', async () => {
      (useLLMStore.getState as jest.Mock).mockReturnValue({
        config: {
          enableCache: false
        }
      });
      
      await mockKV.set('ai-cache:test', 'cached-value');
      
      expect(await mockKV.get('ai-cache:test')).toBeNull();
    });

    it('should always perform non-cache operations regardless of cache setting', async () => {
      (useLLMStore.getState as jest.Mock).mockReturnValue({
        config: {
          enableCache: false
        }
      });
      
      await mockKV.set('regular:test', 'regular-value');
      
      expect(await mockKV.get('regular:test')).toBe('regular-value');
    });

    it('should flush only cache-related keys', async () => {
      await mockKV.set('ai-cache:test1', 'cache-value1');
      await mockKV.set('ai-stream-cache:test2', 'cache-value2');
      await mockKV.set('ai-response:test3', 'cache-value3');
      await mockKV.set('regular:test4', 'regular-value');
      
      const deletedCount = await mockKV.flushCache();
      
      expect(deletedCount).toBe(3);
      expect(await mockKV.get('ai-cache:test1')).toBeNull();
      expect(await mockKV.get('ai-stream-cache:test2')).toBeNull();
      expect(await mockKV.get('ai-response:test3')).toBeNull();
      expect(await mockKV.get('regular:test4')).toBe('regular-value');
    });
  });
});
