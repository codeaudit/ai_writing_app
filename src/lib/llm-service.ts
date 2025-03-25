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
import { OpenAI } from 'openai';
import { LanguageModelV1ObjectGenerationMode } from 'ai';
import { getAIRoleSystemPrompt, AIRole, DEFAULT_PROMPTS } from './ai-roles';

// Import environment variables directly
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const GOOGLE_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';

// Create OpenRouter client
const openRouterClient = new OpenAI({
  apiKey: OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': 'https://github.com/yourusername/writing_app',
    'X-Title': 'Writing App'
  }
});

interface LLMRequestOptions {
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  contextDocuments?: Array<{ title: string; content: string }>;
  stream?: boolean;
  aiRole: string;
}

interface LLMResponse {
  text: string;
  model: string;
  provider: string;
}

// Define chat-related types
export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  provider?: string;
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
  debugPrompt?: string;
}

// Helper function to get system message based on AI role
async function getSystemMessageForRole(aiRole: string = 'assistant'): Promise<string> {
  try {
    // Get the system prompt from the API
    return await getAIRoleSystemPrompt(aiRole);
  } catch (error) {
    console.error(`Error fetching system prompt for role "${aiRole}":`, error);
    // Fall back to DEFAULT_PROMPTS if API fails
    return DEFAULT_PROMPTS[aiRole as AIRole] || DEFAULT_PROMPTS.assistant;
  }
}

// Main LLM service function
export async function generateTextServerAction(options: LLMRequestOptions): Promise<LLMResponse> {
  const { config } = await getServerConfig();
  const { provider, enableCache, temperature: configTemperature, maxTokens: configMaxTokens, aiRole = 'assistant' } = config;
  
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
  
  // Set system message based on the AI role
  const systemMessage = await getSystemMessageForRole(aiRole);
  
  let userPrompt: string = ""
  if (contextDocuments && contextDocuments.length > 0) {
    userPrompt += ' Use the following additional context to inform your responses:\n\n';
    contextDocuments.forEach(doc => {
      userPrompt += `Document: ${doc.title}\n${doc.content}\n\n`;
    });
  }

  userPrompt += prompt;
  
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
      case 'openrouter':
        // Use OpenRouter client directly
        baseModel = {
          provider: 'openrouter',
          specificationVersion: 'v1' as const,
          modelId: modelName,
          defaultObjectGenerationMode: 'text' as LanguageModelV1ObjectGenerationMode,
          async doGenerate(options: any) {
            const { prompt, temperature = 0.7, maxTokens = 1000 } = options;
            const messages = typeof prompt === 'string' 
              ? [{ role: 'user', content: prompt }]
              : prompt.map((msg: any) => ({
                  role: msg.role,
                  content: Array.isArray(msg.content) 
                    ? msg.content.map((part: any) => part.type === 'text' ? part.text : '').join('')
                    : msg.content
                }));

            const response = await openRouterClient.chat.completions.create({
              model: modelName,
              messages,
              temperature,
              max_tokens: maxTokens,
            });

            return {
              text: response.choices[0]?.message?.content ?? '',
              model: modelName,
              provider: 'openrouter',
              finishReason: response.choices[0]?.finish_reason ?? 'stop',
              usage: {
                promptTokens: response.usage?.prompt_tokens ?? 0,
                completionTokens: response.usage?.completion_tokens ?? 0
              }
            };
          },
          async doStream(options: any) {
            const { prompt, temperature = 0.7, maxTokens = 1000 } = options;
            const messages = typeof prompt === 'string' 
              ? [{ role: 'user', content: prompt }]
              : prompt.map((msg: any) => ({
                  role: msg.role,
                  content: Array.isArray(msg.content) 
                    ? msg.content.map((part: any) => part.type === 'text' ? part.text : '').join('')
                    : msg.content
                }));

            const stream = await openRouterClient.chat.completions.create({
              model: modelName,
              messages,
              temperature,
              max_tokens: maxTokens,
              stream: true
            });

            return {
              stream: stream.toReadableStream()
            };
          }
        };
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
        prompt: userPrompt,
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
        prompt: userPrompt,
        temperature,
        maxTokens,
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
  const { provider, enableCache, temperature: configTemperature, maxTokens: configMaxTokens, aiRole = 'assistant' } = config;
  
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
  
  // Check if there are any messages
  if (!messages || messages.length === 0) {
    throw new Error("No messages provided to generate a response from");
  }
  
  // Get the last user message
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || !lastMessage.content) {
    throw new Error("The last message is invalid or missing content");
  }
  
  let userPrompt = '';
  
  // Build system message with context if provided
  const systemMessage = await getSystemMessageForRole(aiRole);
  
  if (context) {
    userPrompt += ` Use the following context to inform your responses: <context>${context}</context>`;
  }
  
  if (contextDocuments && contextDocuments.length > 0) {
    userPrompt += ' Use the following additional context documents to inform your responses:\n\n';
    contextDocuments.forEach(doc => {
      userPrompt += `Document: ${doc.title || doc.name || "Untitled"}\n${doc.content}\n\n`;
    });
  }

  userPrompt += lastMessage.content
  
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
      case 'openrouter':
        // Use OpenRouter client directly
        baseModel = {
          provider: 'openrouter',
          specificationVersion: 'v1' as const,
          modelId: modelName,
          defaultObjectGenerationMode: 'text' as LanguageModelV1ObjectGenerationMode,
          async doGenerate(options: any) {
            const { prompt, temperature = 0.7, maxTokens = 1000 } = options;
            const messages = typeof prompt === 'string' 
              ? [{ role: 'user', content: prompt }]
              : prompt.map((msg: any) => ({
                  role: msg.role,
                  content: Array.isArray(msg.content) 
                    ? msg.content.map((part: any) => part.type === 'text' ? part.text : '').join('')
                    : msg.content
                }));

            const response = await openRouterClient.chat.completions.create({
              model: modelName,
              messages,
              temperature,
              max_tokens: maxTokens,
            });

            return {
              text: response.choices[0]?.message?.content ?? '',
              model: modelName,
              provider: 'openrouter',
              finishReason: response.choices[0]?.finish_reason ?? 'stop',
              usage: {
                promptTokens: response.usage?.prompt_tokens ?? 0,
                completionTokens: response.usage?.completion_tokens ?? 0
              }
            };
          },
          async doStream(options: any) {
            const { prompt, temperature = 0.7, maxTokens = 1000 } = options;
            const messages = typeof prompt === 'string' 
              ? [{ role: 'user', content: prompt }]
              : prompt.map((msg: any) => ({
                  role: msg.role,
                  content: Array.isArray(msg.content) 
                    ? msg.content.map((part: any) => part.type === 'text' ? part.text : '').join('')
                    : msg.content
                }));

            const stream = await openRouterClient.chat.completions.create({
              model: modelName,
              messages,
              temperature,
              max_tokens: maxTokens,
              stream: true
            });

            return {
              stream: stream.toReadableStream()
            };
          }
        };
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
      // For streaming, return a streamed response
      const result = await streamText({
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
          responseLength: 0, // Length unknown for streaming
          responsePreview: 'Streaming response',
          contextDocumentsCount: contextDocuments.length,
        });
      } catch (logError) {
        console.error('Error logging AI debug info:', logError);
      }
      
      // For streaming responses, we need to handle the async text property
      const streamedText = await result.text || 'Streamed response';
      
      return {
        message: {
          role: 'assistant',
          content: streamedText,
          id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
        },
        model: modelName,
        provider,
        debugPrompt: formatDebugPrompt(systemMessage, userPrompt, provider, modelName)
      };
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
        provider,
        debugPrompt: formatDebugPrompt(systemMessage, userPrompt, provider, modelName)
      };
    }
  } catch (error) {
    console.error('Error generating chat response:', error);
    throw error;
  }
} 