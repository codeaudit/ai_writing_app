import { useLLMStore } from './store';

interface LLMRequestOptions {
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

interface LLMResponse {
  text: string;
  model: string;
  provider: string;
}

// OpenAI API call
const callOpenAI = async (options: LLMRequestOptions, apiKey: string): Promise<LLMResponse> => {
  const { prompt, model = 'gpt-4', temperature = 0.7, maxTokens = 1000 } = options;
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature,
      max_tokens: maxTokens,
    }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `OpenAI API error: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  return {
    text: data.choices[0].message.content,
    model,
    provider: 'openai'
  };
};

// Gemini API call
const callGemini = async (options: LLMRequestOptions, apiKey: string): Promise<LLMResponse> => {
  const { prompt, model = 'gemini-1.5-flash', temperature = 0.7, maxTokens = 1000 } = options;
  
  // Format model name for API (remove version prefix if needed)
  const apiModel = model.startsWith('gemini-') ? model : `gemini-${model}`;
  
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
      }
    }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `Gemini API error: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  // Extract text from Gemini response
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  return {
    text,
    model,
    provider: 'gemini'
  };
};

// Main LLM service function
export const generateText = async (options: LLMRequestOptions): Promise<LLMResponse> => {
  const { config, getApiKey } = useLLMStore.getState();
  const { provider } = config;
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error(`No API key found for ${provider}. Please set an API key in the settings.`);
  }
  
  // Use the model from options or fall back to the one in config
  const model = options.model || config.model;
  
  try {
    if (provider === 'gemini') {
      return await callGemini({ ...options, model }, apiKey);
    } else {
      return await callOpenAI({ ...options, model }, apiKey);
    }
  } catch (error) {
    console.error('Error generating text:', error);
    throw error;
  }
}; 