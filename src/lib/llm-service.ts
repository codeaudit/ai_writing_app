import { useLLMStore } from './store';

// Create a safe logging function that doesn't break if console is unavailable
const safeLog = (message: string, error?: any) => {
  try {
    if (typeof console !== 'undefined' && console.error) {
      if (error) {
        console.error(message, error);
      } else {
        console.error(message);
      }
    }
  } catch (e) {
    // Silently fail if console logging isn't available
  }
};

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
  
  if (!prompt || prompt.trim() === '') {
    safeLog("Empty prompt provided to OpenAI API");
    throw new Error("Empty prompt provided to OpenAI API");
  }
  
  safeLog(`Calling OpenAI API with model: ${model}, prompt length: ${prompt.length}`);
  
  try {
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
      safeLog(`OpenAI API error: ${response.status} ${response.statusText}`, error);
      throw new Error(error.error?.message || `OpenAI API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    safeLog(`OpenAI API response received, length: ${data.choices[0].message.content.length}`);
    
    return {
      text: data.choices[0].message.content,
      model,
      provider: 'openai'
    };
  } catch (error) {
    safeLog("Error calling OpenAI API:", error);
    throw error;
  }
};

// Gemini API call
const callGemini = async (options: LLMRequestOptions, apiKey: string): Promise<LLMResponse> => {
  const { prompt, model = 'gemini-1.5-flash', temperature = 0.7, maxTokens = 1000 } = options;
  
  if (!prompt || prompt.trim() === '') {
    safeLog("Empty prompt provided to Gemini API");
    throw new Error("Empty prompt provided to Gemini API");
  }
  
  safeLog(`Calling Gemini API with model: ${model}, prompt length: ${prompt.length}`);
  
  try {
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
      safeLog(`Gemini API error: ${response.status} ${response.statusText}`, error);
      throw new Error(error.error?.message || `Gemini API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Extract text from Gemini response
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    safeLog(`Gemini API response received, length: ${text.length}`);
    
    return {
      text,
      model,
      provider: 'gemini'
    };
  } catch (error) {
    safeLog("Error calling Gemini API:", error);
    throw error;
  }
};

// Main LLM service function
export const generateText = async (options: LLMRequestOptions): Promise<LLMResponse> => {
  const { config, getApiKey } = useLLMStore.getState();
  const { provider } = config;
  const apiKey = getApiKey();
  
  safeLog(`generateText called with provider: ${provider}, prompt length: ${options.prompt?.length || 0}`);
  
  // Validate prompt
  if (!options.prompt || options.prompt.trim() === '') {
    safeLog("Empty prompt provided to generateText");
    throw new Error("Cannot generate text with an empty prompt");
  }
  
  // Validate API key
  if (!apiKey) {
    safeLog(`No API key found for ${provider}`);
    throw new Error(`No API key found for ${provider}. Please set an API key in the settings.`);
  }
  
  // Use the model from options or fall back to the one in config
  const model = options.model || config.model;
  safeLog(`Using model: ${model}`);
  
  try {
    let response: LLMResponse;
    
    if (provider === 'gemini') {
      safeLog("Calling Gemini provider");
      response = await callGemini({ ...options, model }, apiKey);
    } else {
      safeLog("Calling OpenAI provider");
      response = await callOpenAI({ ...options, model }, apiKey);
    }
    
    safeLog(`Response received from ${provider}, text length: ${response.text.length}`);
    return response;
  } catch (error) {
    safeLog('Error generating text:', error);
    throw error;
  }
}; 