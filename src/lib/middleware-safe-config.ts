/**
 * A simplified version of configuration management for use in middleware.
 * This implementation is safe to use in Edge Runtime since it doesn't import
 * any modules that use eval() or new Function() like gray-matter.
 */

// Default LLM provider and model from environment variables
const DEFAULT_LLM_PROVIDER = process.env.DEFAULT_LLM_PROVIDER || 'openai';
const DEFAULT_LLM_MODEL = process.env.DEFAULT_LLM_MODEL || 'gpt-4o';
const DEFAULT_TEMPERATURE = parseFloat(process.env.DEFAULT_TEMPERATURE || '0.7');
const DEFAULT_MAX_TOKENS = parseInt(process.env.DEFAULT_MAX_TOKENS || '1000', 10);
const ENABLE_AI_CACHE = process.env.ENABLE_AI_CACHE !== 'false'; // Enable by default

export type LLMProvider = string;

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  enableCache: boolean;
  temperature: number;
  maxTokens: number;
  aiRole: string;
}

/**
 * Gets the default LLM configuration for use in middleware
 * This function doesn't depend on modules that use eval() or new Function()
 */
export function getDefaultLLMConfig(): LLMConfig {
  return {
    provider: DEFAULT_LLM_PROVIDER,
    model: DEFAULT_LLM_MODEL,
    enableCache: ENABLE_AI_CACHE,
    temperature: DEFAULT_TEMPERATURE,
    maxTokens: DEFAULT_MAX_TOKENS,
    aiRole: 'assistant'
  };
}

/**
 * Checks if caching is enabled based on the provided config or default settings
 */
export function isCachingEnabled(config?: Partial<LLMConfig>): boolean {
  if (config?.enableCache !== undefined) {
    return config.enableCache;
  }
  return ENABLE_AI_CACHE;
} 