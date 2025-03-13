'use server'

import { useLLMStore } from './store';
import { generateText as aiGenerateText, streamText, wrapLanguageModel } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { GOOGLE_GENERATIVE_AI_API_KEY } from './config';
import { createCacheMiddleware } from './ai-middleware';
import { kv } from '@vercel/kv';
import { cookies } from 'next/headers';
import { formatDebugPrompt, logAIDebug } from '@/lib/ai-debug';

// Import environment variables directly
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const GOOGLE_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';

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

// Define chat-related types
export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatContextDocument {
  id?: string;
  title: string;
  name?: string; // For backward compatibility
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  context?: string;
  contextDocuments?: ChatContextDocument[];
  stream?: boolean;
}

export interface ChatResponse {
  message: ChatMessage;
  model: string;
  provider: string;
}

// Main LLM service function
export async function generateTextServerAction(options: LLMRequestOptions): Promise<LLMResponse> {
  const { config } = await getServerConfig();
  const { provider, enableCache, temperature: configTemperature, maxTokens: configMaxTokens } = config;
  
  // Debug API key information
  logApiKeyInfo(provider);
  
  // Use the model from options or fall back to the one in config
  const modelName = options.model || config.model;
  const { 
    prompt, 
    temperature = configTemperature, 
    maxTokens = configMaxTokens, 
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
    
    // Set API keys in environment variables
    switch (provider) {
      case 'anthropic':
        // Set the API key for Anthropic
        process.env.ANTHROPIC_API_KEY = ANTHROPIC_API_KEY;
        baseModel = anthropic(modelName as any);
        break;
      case 'gemini':
        // Set the API key for Google
        process.env.GOOGLE_GENERATIVE_AI_API_KEY = GOOGLE_API_KEY;
        baseModel = google(modelName as any);
        break;
      case 'openai':
      default:
        // Set the API key for OpenAI
        process.env.OPENAI_API_KEY = OPENAI_API_KEY;
        baseModel = openai(modelName as any);
        break;
    }
    
    // Apply middleware conditionally based on enableCache setting
    const model = enableCache 
      ? wrapLanguageModel({
          model: baseModel,
          middleware: createCacheMiddleware(true)
        })
      : baseModel;
    
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
}

// Helper function to get server-side config
async function getServerConfig() {
  const cookieStore = await cookies();
  const configCookie = cookieStore.get('llm-config');
  let config;
  
  if (configCookie) {
    try {
      config = JSON.parse(configCookie.value);
    } catch (e) {
      console.error('Error parsing config cookie:', e);
    }
  }
  
  // Fallback to default config if cookie parsing fails
  if (!config) {
    config = {
      provider: process.env.DEFAULT_LLM_PROVIDER || 'openai',
      model: process.env.DEFAULT_LLM_MODEL || 'gpt-4',
      enableCache: process.env.ENABLE_AI_CACHE === 'true',
      temperature: parseFloat(process.env.DEFAULT_TEMPERATURE || '0.7'),
      maxTokens: parseInt(process.env.DEFAULT_MAX_TOKENS || '1000', 10),
    };
  }
  
  // Get API keys from cookies or environment variables
  const openaiKeyCookie = cookieStore.get('openai-api-key');
  const googleKeyCookie = cookieStore.get('google-api-key');
  const anthropicKeyCookie = cookieStore.get('anthropic-api-key');
  
  // Always use environment API keys for server-side operations
  config.apiKeys = {
    openai: openaiKeyCookie?.value || OPENAI_API_KEY,
    anthropic: anthropicKeyCookie?.value || ANTHROPIC_API_KEY,
    google: googleKeyCookie?.value || GOOGLE_API_KEY
  };
  
  return { config };
}

// For backward compatibility, we'll keep the old function but make it use the server action
export const generateText = generateTextServerAction;
export const generateTextWithAI = generateTextServerAction;

// Helper function to log API key information (without revealing full keys)
function logApiKeyInfo(provider: string) {
  const openaiKey = process.env.OPENAI_API_KEY || '';
  const anthropicKey = process.env.ANTHROPIC_API_KEY || '';
  const googleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';
  
  console.log('API Key Debug Info:');
  console.log(`Provider: ${provider}`);
  console.log(`OpenAI API Key: ${openaiKey ? `${openaiKey.substring(0, 5)}...${openaiKey.substring(openaiKey.length - 4)}` : 'Not set'}`);
  console.log(`Anthropic API Key: ${anthropicKey ? `${anthropicKey.substring(0, 5)}...${anthropicKey.substring(anthropicKey.length - 4)}` : 'Not set'}`);
  console.log(`Google API Key: ${googleKey ? `${googleKey.substring(0, 5)}...${googleKey.substring(googleKey.length - 4)}` : 'Not set'}`);
}

// Server action for chat functionality
export async function generateChatResponse(request: ChatRequest): Promise<ChatResponse> {
  const { config } = await getServerConfig();
  const { provider, enableCache, temperature: configTemperature, maxTokens: configMaxTokens } = config;
  
  // Debug API key information
  logApiKeyInfo(provider);
  
  // Use the model from config
  const modelName = config.model;
  const { 
    messages, 
    context, 
    contextDocuments = [],
    stream = false
  } = request;
  
  // Get the last user message
  const lastMessage = messages[messages.length - 1];
  const userPrompt = lastMessage.content;
  
  // Build system message with context if provided
  let systemMessage = 'You are a helpful writing assistant.';
  
  if (context) {
    systemMessage += ` Use the following context to inform your responses: ${context}`;
  }
  
  if (contextDocuments && contextDocuments.length > 0) {
    systemMessage += ' Use the following additional context documents to inform your responses:\n\n';
    contextDocuments.forEach(doc => {
      systemMessage += `Document: ${doc.title}\n${doc.content}\n\n`;
    });
  }
  
  try {
    // Set up provider-specific model
    let baseModel;
    
    // Set API keys in environment variables
    switch (provider) {
      case 'anthropic':
        // Set the API key for Anthropic
        process.env.ANTHROPIC_API_KEY = ANTHROPIC_API_KEY;
        baseModel = anthropic(modelName as any);
        break;
      case 'gemini':
        // Set the API key for Google
        process.env.GOOGLE_GENERATIVE_AI_API_KEY = GOOGLE_API_KEY;
        baseModel = google(modelName as any);
        break;
      case 'openai':
      default:
        // Set the API key for OpenAI
        process.env.OPENAI_API_KEY = OPENAI_API_KEY;
        baseModel = openai(modelName as any);
        break;
    }
    
    // Apply middleware conditionally based on enableCache setting
    const model = enableCache 
      ? wrapLanguageModel({
          model: baseModel,
          middleware: createCacheMiddleware(true)
        })
      : baseModel;
    
    // Generate text with or without streaming
    if (stream) {
      // For streaming, we'll implement this later if needed
      throw new Error('Streaming is not yet supported in the server action');
    } else {
      // For non-streaming, we return the complete text
      const result = await aiGenerateText({
        model,
        system: systemMessage,
        prompt: userPrompt,
        temperature: configTemperature,
        maxTokens: configMaxTokens,
      });
      
      // Log debug information
      try {
        const cookieStore = await cookies();
        const sessionId = cookieStore.get('ai-session-id')?.value || 'unknown';
        await logAIDebug(sessionId, {
          provider,
          model: modelName,
          systemMessage,
          userPrompt,
          responseLength: result.text.length,
          responsePreview: result.text.substring(0, 100) + (result.text.length > 100 ? '...' : ''),
          contextDocumentsCount: contextDocuments.length,
        });
      } catch (logError) {
        console.error('Error logging AI debug info:', logError);
      }
      
      return {
        message: {
          role: 'assistant',
          content: result.text,
          id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
        },
        model: modelName,
        provider
      };
    }
  } catch (error) {
    console.error('Error generating chat response:', error);
    throw error;
  }
} 