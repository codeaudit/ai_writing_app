// @ts-nocheck
import { mockKV } from '../../lib/mock-kv';

// Mock the vercel/kv module
jest.mock('@vercel/kv', () => ({
  kv: {
    // Mock Vercel KV methods
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn()
  }
}));

// Mock the mock-kv module
jest.mock('../../lib/mock-kv', () => ({
  mockKV: {
    // Mock our mock KV methods
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn()
  }
}));

describe('kv-provider', () => {
  // Store original env variables
  const originalEnv = process.env;
  
  beforeEach(() => {
    jest.resetModules();
    
    // Mock console.log to prevent output during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  
  afterAll(() => {
    // Restore original env variables
    process.env = originalEnv;
  });

  it('should use mock KV in development without KV credentials', async () => {
    // Set up environment for development without KV credentials
    const testEnv = {
      ...process.env,
      NODE_ENV: 'development',
      KV_REST_API_URL: '',
      KV_REST_API_TOKEN: ''
    };
    
    // Mock process.env
    process.env = testEnv;
    
    // Clear module cache to ensure environment changes take effect
    jest.resetModules();
    
    // Re-import the module to apply the new environment variables
    const { kv } = require('../../lib/kv-provider');
    
    // Verify that the exported kv has the same methods as mockKV
    expect(typeof kv.get).toBe('function');
    expect(typeof kv.set).toBe('function');
    expect(typeof kv.delete).toBe('function');
    
    // Verify it's not using Vercel KV
    expect(kv).not.toBe(require('@vercel/kv').kv);
  });

  it('should use mock KV when USE_MOCK_KV is true', async () => {
    // Set up environment to explicitly use mock KV
    const testEnv = {
      ...process.env,
      USE_MOCK_KV: 'true',
      NODE_ENV: 'production',
      KV_REST_API_URL: 'https://example.com',
      KV_REST_API_TOKEN: 'fake-token'
    };
    
    // Mock process.env
    process.env = testEnv;
    
    // Clear module cache to ensure environment changes take effect
    jest.resetModules();
    
    // Re-import the module to apply the new environment variables
    const { kv } = require('../../lib/kv-provider');
    
    // Verify that the exported kv has the same methods as mockKV
    expect(typeof kv.get).toBe('function');
    expect(typeof kv.set).toBe('function');
    expect(typeof kv.delete).toBe('function');
    
    // Verify it's not using Vercel KV
    expect(kv).not.toBe(require('@vercel/kv').kv);
  });

  it('should use Vercel KV in production with KV credentials', async () => {
    // Set up environment for production with KV credentials
    const testEnv = {
      ...process.env,
      USE_MOCK_KV: 'false',
      NODE_ENV: 'production',
      KV_REST_API_URL: 'https://example.com',
      KV_REST_API_TOKEN: 'fake-token'
    };
    
    // Mock process.env
    process.env = testEnv;
    
    // Clear module cache to ensure environment changes take effect
    jest.resetModules();
    
    // Re-import the module to apply the new environment variables
    const { kv } = require('../../lib/kv-provider');
    
    // Verify that the exported kv is not the mockKV (it should be vercelKV)
    expect(kv).not.toBe(mockKV);
  });
});
