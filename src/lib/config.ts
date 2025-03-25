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
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'anthropic', label: 'Anthropic Claude' },
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'featherless', label: 'Featherless AI' },
];

// LLM Model Options by Provider
export const LLM_MODELS = {
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-4', label: 'GPT-4' }
  ],
  openrouter: [
    { value: 'google/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash' },
    { value: 'google/gemini-2.0-flash-lite-001', label: 'Gemini 2.0 Flash Lite' },
    { value: 'google/learnlm-1.5-pro-experimental:free', label: 'LearnLM' },
    { value: 'mistralai/mistral-small-3.1-24b-instruct', label: 'mistral 3.1 24b' },
    { value: 'google/gemma-3-27b-it', label: 'Gemma 3 27b' },
    { value: 'allenai/olmo-2-0325-32b-instruct', label: 'olmo 2 32b' },
    { value: 'deepseek/deepseek-r1:free', label: 'deepseek-r1 free' },
    { value: 'deepseek/deepseek-r1', label: 'deepseek-r1' },
    { value: 'qwen/qwq-32b:free', label: 'qwq 32b' },
    { value: 'meta-llama/llama-3.3-70b-instruct', label: 'llama 3.3 70b' },
    { value: 'nvidia/llama-3.1-nemotron-70b-instruct', label: 'nemotron 70b'}
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
  featherless : [
    { value: 'featherless-ai/Qwerky-72B', label: 'Qwerky 72B' },
    { value: 'featherless-ai/Qwerky-QwQ-32B', label: 'Qwerky QwQ 32B' },
    { value: 'deepseek-ai/DeepSeek-R1', label: 'DeepSeek R1' },
    { value: 'RWKV/v6-Finch-14B-HF', label: 'RWKV Finch 14B' },
  ],

}; 