import { useLLMStore } from './store';
import { generateText as aiGenerateText, streamText, wrapLanguageModel } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { GOOGLE_GENERATIVE_AI_API_KEY } from './config';
import { cacheMiddleware } from './ai-middleware';

interface LLMRequestOptions {
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  contextDocuments?: Array<{ title: string; content: string }>;
  stream?: boolean;
}

interface LLMResponse {
  text: string;
  model: string;
  provider: string;
}

// Main LLM service function
export const generateText = async (options: LLMRequestOptions): Promise<LLMResponse> => {
  const { config, getApiKey } = useLLMStore.getState();
  const { provider } = config;
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error(`No API key found for ${provider}. Please set an API key in the settings.`);
  }
  
  // Use the model from options or fall back to the one in config
  const modelName = options.model || config.model;
  const { 
    prompt, 
    temperature = 0.7, 
    maxTokens = 1000, 
    contextDocuments = [],
    stream = false
  } = options;
  
  // Build system message with context if provided
  let systemMessage = 'You are a helpful writing assistant.';
  
  if (contextDocuments && contextDocuments.length > 0) {
    systemMessage += ' Use the following additional context to inform your responses:\n\n';
    contextDocuments.forEach(doc => {
      systemMessage += `Document: ${doc.title}\n${doc.content}\n\n`;
    });
  }
  
  try {
    // Set up provider-specific model
    let baseModel;
    
    switch (provider) {
      case 'anthropic':
        baseModel = anthropic(modelName as any);
        break;
      case 'gemini':
        // For Gemini, we rely on the environment variable being set
        if (typeof process !== 'undefined' && process.env) {
          process.env.GOOGLE_GENERATIVE_AI_API_KEY = apiKey;
        }
        baseModel = google(modelName as any);
        break;
      case 'openai':
      default:
        baseModel = openai(modelName as any);
        break;
    }
    
    // Apply middleware using the wrapLanguageModel function
    const model = wrapLanguageModel({
      model: baseModel,
      middleware: cacheMiddleware
    });
    
    // Generate text with or without streaming
    if (stream) {
      const result = await streamText({
        model,
        system: systemMessage,
        prompt,
        temperature,
        maxTokens,
      });
      
      // For streaming, we return a response with the stream
      return {
        text: '', // Initial text is empty for streaming
        model: modelName,
        provider,
        stream: result.toDataStreamResponse()
      } as any;
    } else {
      // For non-streaming, we return the complete text
      const result = await aiGenerateText({
        model,
        system: systemMessage,
        prompt,
        temperature,
        maxTokens,
      });
      
      return {
        text: result.text,
        model: modelName,
        provider
      };
    }
  } catch (error) {
    console.error('Error generating text:', error);
    throw error;
  }
};

// For backward compatibility
export const generateTextWithAI = generateText; 