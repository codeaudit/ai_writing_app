// Environment variable configuration

// LLM Provider API Keys
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
export const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || '';

// Default LLM Configuration
export const DEFAULT_LLM_PROVIDER = 'openai';
export const DEFAULT_LLM_MODEL = 'gpt-4o';

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
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite' },
    { value: 'gemini-2.0-flash-thinking-exp-01-21', label: 'Gemini 2.0 Flash Thinking' },
  ],
}; 