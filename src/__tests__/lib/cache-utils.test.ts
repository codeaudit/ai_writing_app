import { flushAICache } from '../../lib/cache-utils';
import { mockKV } from '../../lib/mock-kv';

// Mock the mock-kv module
jest.mock('../../lib/mock-kv', () => ({
  mockKV: {
    flushCache: jest.fn()
  }
}));

describe('cache-utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('flushAICache', () => {
    it('should flush the AI cache and return the number of deleted entries', async () => {
      const deletedCount = 5;
      (mockKV.flushCache as jest.Mock).mockResolvedValueOnce(deletedCount);

      const result = await flushAICache();
      
      expect(mockKV.flushCache).toHaveBeenCalled();
      expect(result).toBe(deletedCount);
    });

    it('should propagate errors from the KV store', async () => {
      const error = new Error('KV store error');
      (mockKV.flushCache as jest.Mock).mockRejectedValueOnce(error);

      await expect(flushAICache()).rejects.toThrow('KV store error');
    });
  });
});
