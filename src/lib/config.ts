// Environment variable configuration

// LLM Provider API Keys
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
export const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || '';
export const GOOGLE_GENERATIVE_AI_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY || '';
export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

// Default LLM Configuration
export const DEFAULT_LLM_PROVIDER = process.env.DEFAULT_LLM_PROVIDER || 'openai';
export const DEFAULT_LLM_MODEL = process.env.DEFAULT_LLM_MODEL || 'gpt-4o';

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
    { value: 'gpt-4', label: 'GPT-4' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  ],
  anthropic: [
    { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
    { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
    { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
    { value: 'claude-2.1', label: 'Claude 2.1' },
  ],
  gemini: [
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite' },
    { value: 'gemini-2.0-flash-thinking-exp-01-21', label: 'Gemini 2.0 Flash Thinking' },
  ],
}; 