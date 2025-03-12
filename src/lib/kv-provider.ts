import { kv as vercelKV } from '@vercel/kv';
import { mockKV } from './mock-kv';

// Determine whether to use the mock KV implementation
const useMockKV = process.env.USE_MOCK_KV === 'true' || 
  (process.env.NODE_ENV === 'development' && 
   (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN));

// Export the appropriate KV implementation
export const kv = useMockKV ? mockKV : vercelKV;

// Log which implementation is being used
if (typeof window === 'undefined') {
  console.log(`[KV Provider] Using ${useMockKV ? 'mock' : 'Vercel'} KV implementation`);
} 