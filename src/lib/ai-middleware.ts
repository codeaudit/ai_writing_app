import { kv } from '@/lib/kv-provider';
import {
  type LanguageModelV1,
  type LanguageModelV1Middleware,
  type LanguageModelV1StreamPart,
  simulateReadableStream,
} from 'ai';
import { ENABLE_AI_CACHE } from './config';

// Factory function to create middleware with or without caching
export const createCacheMiddleware = (enableCache: boolean): LanguageModelV1Middleware => ({
  wrapGenerate: async ({ doGenerate, params }) => {
    // Skip cache if disabled
    if (!enableCache) {
      return await doGenerate();
    }

    // Create a cache key based on the request parameters
    const cacheKey = `ai-cache:${JSON.stringify(params)}`;

    // Check if we have a cached response
    const cached = (await kv.get(cacheKey)) as Awaited<
      ReturnType<LanguageModelV1['doGenerate']>
    > | null;

    // If cached, return the cached response
    if (cached !== null) {
      return {
        ...cached,
        response: {
          ...cached.response,
          timestamp: cached?.response?.timestamp
            ? new Date(cached?.response?.timestamp)
            : undefined,
        },
      };
    }

    // If not cached, generate a new response
    const result = await doGenerate();

    // Cache the response for 1 hour
    await kv.set(cacheKey, result, { ex: 60 * 60 });

    return result;
  },

  wrapStream: async ({ doStream, params }) => {
    // Skip cache if disabled
    if (!enableCache) {
      return await doStream();
    }

    // Create a cache key based on the request parameters
    const cacheKey = `ai-stream-cache:${JSON.stringify(params)}`;

    // Check if the result is in the cache
    const cached = await kv.get(cacheKey);

    // If cached, return a simulated ReadableStream that yields the cached result
    if (cached !== null) {
      // Format the timestamps in the cached response
      const formattedChunks = (cached as LanguageModelV1StreamPart[]).map(p => {
        if (p.type === 'response-metadata' && p.timestamp) {
          return { ...p, timestamp: new Date(p.timestamp) };
        } else return p;
      });
      
      return {
        stream: simulateReadableStream({
          initialDelayInMs: 0,
          chunkDelayInMs: 10,
          chunks: formattedChunks,
        }),
        rawCall: { rawPrompt: null, rawSettings: {} },
      };
    }

    // If not cached, proceed with streaming
    const { stream, ...rest } = await doStream();

    // Collect the full response to cache it
    const fullResponse: LanguageModelV1StreamPart[] = [];

    // Create a transform stream to capture the response chunks
    const transformStream = new TransformStream<
      LanguageModelV1StreamPart,
      LanguageModelV1StreamPart
    >({
      transform(chunk, controller) {
        fullResponse.push(chunk);
        controller.enqueue(chunk);
      },
      flush() {
        // Store the full response in the cache after streaming is complete
        kv.set(cacheKey, fullResponse, { ex: 60 * 60 }); // Cache for 1 hour
      },
    });

    return {
      stream: stream.pipeThrough(transformStream),
      ...rest,
    };
  },
});

// Export a default instance for backward compatibility
// This will be disabled by default based on the ENABLE_AI_CACHE config
export const cacheMiddleware = createCacheMiddleware(ENABLE_AI_CACHE); 