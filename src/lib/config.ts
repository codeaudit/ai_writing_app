// Environment variable configuration

// LLM Provider API Keys
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
export const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || '';

// Default LLM Configuration
export const DEFAULT_LLM_PROVIDER = process.env.DEFAULT_LLM_PROVIDER || 'gemini';
export const DEFAULT_LLM_MODEL = process.env.DEFAULT_LLM_MODEL || 'gemini-1.5-flash';

// LLM Provider Options
export const LLM_PROVIDERS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'gemini', label: 'Google Gemini' },
];

// LLM Model Options by Provider
export const LLM_MODELS = {
  openai: [
    { value: 'gpt-4', label: 'GPT-4' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  ],
  gemini: [
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' }
  ],
}; 