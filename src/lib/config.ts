// Environment variable configuration

// LLM Provider API Keys
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
export const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || '';
export const GOOGLE_GENERATIVE_AI_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY || '';
export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

// Default LLM Configuration
export const DEFAULT_LLM_PROVIDER = process.env.DEFAULT_LLM_PROVIDER || 'openai';
export const DEFAULT_LLM_MODEL = process.env.DEFAULT_LLM_MODEL || 'gpt-4o';

// AI Cache Configuration
export const ENABLE_AI_CACHE = process.env.ENABLE_AI_CACHE === 'true' ? true : false;

// AI Generation Parameters
export const DEFAULT_TEMPERATURE = parseFloat(process.env.DEFAULT_TEMPERATURE || '0.7');
export const DEFAULT_MAX_TOKENS = parseInt(process.env.DEFAULT_MAX_TOKENS || '1000', 10);

// LLM Provider Options
export const LLM_PROVIDERS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic Claude' },
  { value: 'gemini', label: 'Google Gemini' },
];

// LLM Model Options by Provider
export const LLM_MODELS = {
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-4', label: 'GPT-4' }
  ],
  anthropic: [
    { value: 'claude-3-7-sonnet-20250219', label: 'Claude 3.7 Sonnet' },
    { value: 'claude-3-5-sonnet-v2-20241022', label: 'Claude 3 Sonnet' },
    { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
  ],
  gemini: [
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite' },
    { value: 'gemini-2.0-flash-thinking-exp-01-21', label: 'Gemini 2.0 Flash Thinking' },
  ],
}; 