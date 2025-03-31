'use server'

import { OpenAI } from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';
import { GoogleGenerativeAI, GenerativeModel, Content, Part } from '@google/generative-ai';
import { kv } from '@/lib/kv-provider';
import { cookies } from 'next/headers';
import { formatDebugPrompt, logAIDebug } from '@/lib/ai-debug';
import { getAIRoleSystemPrompt, AIRole, DEFAULT_PROMPTS } from './ai-roles';
import type { ChatCompletionMessageParam } from 'openai/resources/chat';
import { experimental_createMCPClient } from "ai";

// Tool support types
export interface Tool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ChatMessageWithTools extends ChatMessage {
  tool_calls?: ToolCall[];
}

export interface ChatRequestWithTools extends ChatRequest {
  tools?: Tool[];
  tool_choice?: string | { type: 'function'; function: { name: string } };
}

export interface MCPStep {
  name: string;
  prompt: string;
  model: string;
  temperature?: number;
}

export interface MCPOperation {
  name: string;
  steps: MCPStep[];
  metadata?: Record<string, unknown>;
}

// Import environment variables directly
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const GOOGLE_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const FEATHERLESS_API_KEY = process.env.FEATHERLESS_API_KEY || '';
const MCP_API_KEY = process.env.MCP_API_KEY || '';
const MCP_PROJECT_ID = process.env.MCP_PROJECT_ID || '';

// Create OpenRouter client
const openRouterClient = new OpenAI({
  apiKey: OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': 'https://github.com/yourusername/writing_app',
    'X-Title': 'Writing App'
  }
});

// Create Featherless client
const featherlessClient = new OpenAI({
  apiKey: FEATHERLESS_API_KEY,
  baseURL: 'https://api.featherless.ai/v1'
});

// Create OpenAI client
const openaiClient = new OpenAI({
  apiKey: OPENAI_API_KEY
});

// Create Anthropic client
const anthropicClient = new Anthropic({
  apiKey: ANTHROPIC_API_KEY
});

// Create Google Generative AI client
const geminiClient = new GoogleGenerativeAI(GOOGLE_API_KEY);

// Define MCP client interface
interface MCPClient {
  tools: () => Promise<Record<string, unknown>>;
  executeOperation?: (operation: MCPOperation) => Promise<Record<string, unknown>>;
  close: () => Promise<void>;
}

// Create MCP client
let mcpClient: MCPClient | null = null;

if (MCP_API_KEY && MCP_PROJECT_ID) {
  try {
    // Initialize the MCP client with SSE transport
    experimental_createMCPClient({
      transport: {
        type: 'sse',
        url: `https://api.mcp.vercel.ai/api/v1/projects/${MCP_PROJECT_ID}/sse`,
        headers: {
          'Authorization': `Bearer ${MCP_API_KEY}`
        }
      },
    }).then(client => {
      mcpClient = client;
      console.log('MCP client initialized successfully');
    }).catch(error => {
      console.error('Error initializing MCP client:', error);
    });
  } catch (error) {
    console.error('Error setting up MCP client:', error);
  }
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

// Interface for allowed message roles in Anthropic API
interface AnthropicMessageParam {
  role: 'user' | 'assistant';
  content: string;
}

// TypeScript types for message formatting - simplified
interface FormattedMessages {
  [key: string]: unknown;
}

interface AnthropicFormattedMessages {
  systemPrompt: string;
  messages: AnthropicMessageParam[];
}

type OpenAIFormattedMessages = ChatCompletionMessageParam[];

interface GeminiMessage {
  role: 'user' | 'model';
  parts: Part[];
}

type GeminiFormattedMessages = Content[];

// Helper function to generate a unique ID
function generateId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Logs API key information for debugging purposes
 */
function logApiKeyInfo(provider: string): void {
  console.log(`Using ${provider} API`);
  
  switch (provider) {
    case 'openai':
      console.log(`OpenAI API Key available: ${!!OPENAI_API_KEY}`);
      break;
    case 'anthropic':
      console.log(`Anthropic API Key available: ${!!ANTHROPIC_API_KEY}`);
      break;
    case 'gemini':
      console.log(`Google API Key available: ${!!GOOGLE_API_KEY}`);
      break;
    case 'openrouter':
      console.log(`OpenRouter API Key available: ${!!OPENROUTER_API_KEY}`);
      break;
    case 'featherless':
      console.log(`Featherless API Key available: ${!!FEATHERLESS_API_KEY}`);
      break;
  }
}

/**
 * Converts chat history for the appropriate provider format
 */
function formatMessagesForProvider(
  messages: ChatMessage[], 
  systemMessage: string, 
  provider: string
): FormattedMessages {
  // Ensure we have a system message at the beginning
  const hasSystemMessage = messages.some(msg => msg.role === 'system');
  const formattedMessages = [...messages];
  
  if (!hasSystemMessage) {
    formattedMessages.unshift({
      role: 'system',
      content: systemMessage
    });
  }
  
  // Format messages based on provider
  switch (provider) {
    case 'anthropic': {
      // Anthropic uses a specific format with system prompt as a separate parameter
      // Filter out system messages and convert to Anthropic format
      const anthropicMessages: AnthropicMessageParam[] = formattedMessages
        .filter(msg => msg.role !== 'system')
        .map(msg => ({
          role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
          content: msg.content
        }));
      
      const result: AnthropicFormattedMessages = {
        systemPrompt: systemMessage,
        messages: anthropicMessages
      };
      return result;
    }
      
    case 'gemini': {
      // Gemini doesn't support system messages directly, so we need to convert them to user messages
      const geminiContents: Content[] = formattedMessages.map(msg => {
        // Convert system messages to user messages with a special prefix
        if (msg.role === 'system') {
          return {
            role: 'user',
            parts: [{ text: `System Instructions: ${msg.content}` }]
          };
        } else if (msg.role === 'user') {
          return {
            role: 'user',
            parts: [{ text: msg.content }]
          };
        } else { // assistant
          return {
            role: 'model',
            parts: [{ text: msg.content }]
          };
        }
      });
      
      return geminiContents;
    }
        
    case 'openai':
    case 'openrouter':
    case 'featherless':
    default: {
      // Convert to OpenAI's specific message format
      const openAIMessages: ChatCompletionMessageParam[] = formattedMessages.map(msg => {
        // Validate that the role is one of OpenAI's supported roles
        if (msg.role === 'system' || msg.role === 'user' || msg.role === 'assistant') {
          return {
            role: msg.role,
            content: msg.content
          };
        }
        // Default to user role for any unsupported roles
        return {
          role: 'user',
          content: msg.content
        };
      });
      
      return openAIMessages;
    }
  }
}

/**
 * Create a cache key for the request
 */
function createCacheKey(provider: string, model: string, messages: FormattedMessages): string {
  // Create a cache key based on provider, model, and stringified messages
  return `llm-cache:${provider}:${model}:${JSON.stringify(messages)}`;
}

/**
 * Check if a response is cached
 */
async function getFromCache(cacheKey: string, enableCache: boolean): Promise<ChatResponse | null> {
  if (!enableCache) return null;
  
  try {
    const cached = await kv.get(cacheKey) as ChatResponse | null;
    if (cached) {
      console.log('Cache hit for', cacheKey);
      return cached;
    }
  } catch (error) {
    console.error('Error reading from cache:', error);
  }
  
  return null;
}

/**
 * Store a response in the cache
 */
async function storeInCache(cacheKey: string, response: ChatResponse, enableCache: boolean): Promise<void> {
  if (!enableCache) return;
  
  try {
    await kv.set(cacheKey, response, { ex: 60 * 60 }); // Cache for 1 hour
    console.log('Stored in cache:', cacheKey);
  } catch (error) {
    console.error('Error writing to cache:', error);
  }
}

/**
 * Execute a multi-step operation using MCP
 */
export async function executeMCPOperation(operation: MCPOperation): Promise<Record<string, unknown>> {
  if (!mcpClient) {
    throw new Error("MCP client is not configured or still initializing. Please set MCP_API_KEY and MCP_PROJECT_ID.");
  }
  
  try {
    console.log(`Executing MCP operation: ${operation.name}`);
    
    // First get available tools from the MCP client
    const tools = await mcpClient.tools();
    
    // Check if the client supports executeOperation
    if (!mcpClient.executeOperation) {
      throw new Error("This MCP client does not support executeOperation method");
    }
    
    // Then use the tools to execute the operation
    const result = await mcpClient.executeOperation(operation);
    
    return result || { success: true, message: "Operation executed but no result returned" };
  } catch (error) {
    console.error('Error executing MCP operation:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      operation: operation.name
    };
  }
}

// Server action for chat functionality
export async function generateChatResponse(request: ChatRequest | ChatRequestWithTools): Promise<ChatResponse> {
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
  
  // Extract tools if provided
  const toolsRequest = request as ChatRequestWithTools;
  const tools = toolsRequest.tools || [];
  const toolChoice = toolsRequest.tool_choice || 'auto';
  
  // Check if there are any messages
  if (!messages || messages.length === 0) {
    throw new Error("No messages provided to generate a response from");
  }
  
  // Get the last user message
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || !lastMessage.content) {
    throw new Error("The last message is invalid or missing content");
  }
  
  // Build system message with context
  const systemMessage = await getSystemMessageForRole(aiRole);
  let enhancedSystemMessage = systemMessage;
  
  // Add context to system message if provided
  if (context) {
    enhancedSystemMessage += `\n\nUse the following context to inform your responses: <context>${context}</context>`;
  }
  
  if (contextDocuments && contextDocuments.length > 0) {
    enhancedSystemMessage += '\n\nUse the following additional context documents to inform your responses:\n\n';
    contextDocuments.forEach(doc => {
      enhancedSystemMessage += `Document: ${doc.title || doc.name || "Untitled"}\n${doc.content}\n\n`;
    });
  }
  
  // Format messages for the model
  const formattedMessages = formatMessagesForProvider(messages, enhancedSystemMessage, provider);
  
  // Check if response is in cache
  const cacheKey = createCacheKey(provider, modelName, formattedMessages);
  const cachedResponse = await getFromCache(cacheKey, enableCache);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    let responseText = '';
    let toolCalls: ToolCall[] | undefined;
    
    // Generate response based on provider
    switch (provider) {
      case 'anthropic': {
        if (!ANTHROPIC_API_KEY) {
          throw new Error("Anthropic API key is not set");
        }
        
        // Extract system prompt and messages from formatted messages
        const { systemPrompt, messages } = formattedMessages as unknown as AnthropicFormattedMessages;
        
        if (stream) {
          const response = await anthropicClient.messages.create({
            model: modelName,
            system: systemPrompt,
            messages,
            max_tokens: configMaxTokens,
            temperature: configTemperature,
            stream: true
          });
          
          // Handle streaming response
          for await (const chunk of response) {
            if (chunk.type === 'content_block_delta' && chunk.delta.text) {
              responseText += chunk.delta.text;
            }
          }
        } else {
          const response = await anthropicClient.messages.create({
            model: modelName,
            system: systemPrompt,
            messages,
            max_tokens: configMaxTokens,
            temperature: configTemperature
          });
          
          // Extract text from the response
          responseText = response.content.reduce((text, item) => {
            if (item.type === 'text') {
              return text + item.text;
            }
            return text;
          }, '');
        }
        break;
      }
      
      case 'gemini': {
        if (!GOOGLE_API_KEY) {
          throw new Error("Google API key is not set");
        }
        
        // Get the Gemini model
        const model: GenerativeModel = geminiClient.getGenerativeModel({ model: modelName });
        
        if (stream) {
          const response = await model.generateContentStream({
            contents: formattedMessages as unknown as Content[],
            generationConfig: {
              temperature: configTemperature,
              maxOutputTokens: configMaxTokens,
            }
          });
          
          // Use our safe helper function for streaming
          for await (const chunk of response.stream) {
            const text = safeGetTextFromGeminiChunk(chunk);
            if (text) {
              responseText += text;
            }
          }
        } else {
          const response = await model.generateContent({
            contents: formattedMessages as unknown as Content[],
            generationConfig: {
              temperature: configTemperature,
              maxOutputTokens: configMaxTokens,
            }
          });
          
          // Extract text from the response safely
          try {
            // Try the standard text accessor first
            if (response.response.text) {
              responseText = response.response.text();
            } else {
              // Fallback to manually extracting text from parts if available
              responseText = Array.isArray(response.response.candidates?.[0]?.content?.parts) 
                ? response.response.candidates[0].content.parts
                    .filter(part => typeof part === 'object' && part && 'text' in part)
                    .map(part => part.text || '')
                    .join('') 
                : '';
            }
          } catch (error) {
            console.warn('Error extracting text from Gemini response:', error);
            // If all else fails, try to toString the response or return empty
            responseText = response.response.toString().trim() || '';
          }
        }
        break;
      }
      
      case 'openrouter': {
        if (!OPENROUTER_API_KEY) {
          throw new Error("OpenRouter API key is not set");
        }
        
        if (stream) {
            const response = await openRouterClient.chat.completions.create({
              model: modelName,
            messages: formattedMessages as unknown as ChatCompletionMessageParam[],
            temperature: configTemperature,
            max_tokens: configMaxTokens,
            stream: true
          });
          
          // Handle streaming response
          for await (const chunk of response) {
            if (chunk.choices[0]?.delta?.content) {
              responseText += chunk.choices[0].delta.content;
            }
          }
        } else {
          const response = await openRouterClient.chat.completions.create({
              model: modelName,
            messages: formattedMessages as unknown as ChatCompletionMessageParam[],
            temperature: configTemperature,
            max_tokens: configMaxTokens
          });
          
          responseText = response.choices[0]?.message?.content || '';
        }
        break;
      }
      
      case 'featherless': {
        if (!FEATHERLESS_API_KEY) {
          throw new Error("Featherless API key is not set");
        }
        
        // Make sure model name includes provider prefix
        const fullModelName = modelName.includes('/') ? modelName : `featherless-ai/${modelName}`;
        
        try {
          if (stream) {
            const response = await featherlessClient.chat.completions.create({
              model: fullModelName,
              messages: formattedMessages as unknown as ChatCompletionMessageParam[],
              temperature: configTemperature,
              max_tokens: Math.min(configMaxTokens, 4096), // Limit max tokens to 4096
              stream: true
            });

            // Handle streaming response
            for await (const chunk of response) {
              if (chunk.choices[0]?.delta?.content) {
                responseText += chunk.choices[0].delta.content;
              }
            }
          } else {
            const response = await featherlessClient.chat.completions.create({
              model: fullModelName,
              messages: formattedMessages as unknown as ChatCompletionMessageParam[],
              temperature: configTemperature,
              max_tokens: Math.min(configMaxTokens, 4096) // Limit max tokens to 4096
            });
            
            responseText = response.choices[0]?.message?.content || '';
          }
        } catch (error: unknown) {
          const err = error as { status?: number };
          // If we get a validation error, try with fewer tokens
          if (err.status === 422) {
            console.log('Featherless API validation error. Retrying with fewer tokens.');
            const response = await featherlessClient.chat.completions.create({
              model: fullModelName,
              messages: formattedMessages as unknown as ChatCompletionMessageParam[],
              temperature: configTemperature,
              max_tokens: 2048 // Reduce max tokens as fallback
            });
            
            responseText = response.choices[0]?.message?.content || '';
          } else {
            throw error;
          }
        }
        break;
      }
      
      case 'openai':
      default: {
        if (!OPENAI_API_KEY) {
          throw new Error("OpenAI API key is not set");
        }
        
        // Prepare OpenAI options with tools support
        const openAIOptions: any = {
          model: modelName,
          messages: formattedMessages as unknown as ChatCompletionMessageParam[],
          temperature: configTemperature,
          max_tokens: configMaxTokens,
        };
        
        // Add tools if provided and we're using a supported model (e.g., gpt-4-turbo, gpt-3.5-turbo)
        if (tools.length > 0 && ['gpt-4-turbo', 'gpt-4-1106-preview', 'gpt-4-0613', 'gpt-3.5-turbo-0613'].some(model => modelName.includes(model))) {
          openAIOptions.tools = tools;
          
          if (toolChoice !== 'auto') {
            openAIOptions.tool_choice = toolChoice;
          }
        }
        
        if (stream) {
          // Add streaming option
          openAIOptions.stream = true;
          
          const response = await openaiClient.chat.completions.create(openAIOptions);
          
          // Handle streaming response
          for await (const chunk of response) {
            if (chunk.choices[0]?.delta?.content) {
              responseText += chunk.choices[0].delta.content;
            }
            
            // Handle tool calls in streaming
            if (chunk.choices[0]?.delta?.tool_calls) {
              if (!toolCalls) {
                toolCalls = [];
              }
              
              // Process each tool call in the chunk
              for (const toolCallDelta of chunk.choices[0].delta.tool_calls) {
                const id = toolCallDelta.index;
                const existingCall = toolCalls.find(call => call.id === id);
                
                if (existingCall) {
                  // Update function arguments if they exist
                  if (toolCallDelta.function?.arguments) {
                    existingCall.function.arguments += toolCallDelta.function.arguments;
                  }
                } else if (toolCallDelta.function) {
                  // Create new tool call
                  toolCalls.push({
                    id: id || `call-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                    type: 'function',
                    function: {
                      name: toolCallDelta.function.name || '',
                      arguments: toolCallDelta.function.arguments || ''
                    }
                  });
                }
              }
            }
          }
        } else {
          const response = await openaiClient.chat.completions.create(openAIOptions);
          
          responseText = response.choices[0]?.message?.content || '';
          
          // Handle tool calls in non-streaming
          if (response.choices[0]?.message?.tool_calls) {
            toolCalls = response.choices[0].message.tool_calls.map(call => ({
              id: call.id,
              type: 'function',
              function: {
                name: call.function.name,
                arguments: call.function.arguments
              }
            }));
          }
        }
        break;
      }
    }
    
    // Prepare the response
    const chatResponse: ChatResponse = {
      message: {
        role: 'assistant',
        content: responseText,
        id: generateId(),
        tool_calls: toolCalls
      } as ChatMessageWithTools,
      model: modelName,
      provider,
      debugPrompt: formatDebugPrompt(enhancedSystemMessage, lastMessage.content, provider, modelName)
    };
      
      // Log debug information
      try {
        const cookieStore = await cookies();
        const sessionId = cookieStore.get('ai-session-id')?.value || 'unknown';
        await logAIDebug(sessionId, {
          provider,
          model: modelName,
        systemMessage: enhancedSystemMessage,
        userPrompt: lastMessage.content,
        responseLength: responseText.length,
        responsePreview: responseText.substring(0, 100) + (responseText.length > 100 ? '...' : ''),
          contextDocumentsCount: contextDocuments.length,
        });
      } catch (logError) {
        console.error('Error logging AI debug info:', logError);
      }
      
    // Cache the response if caching is enabled
    await storeInCache(cacheKey, chatResponse, enableCache);
    
    return chatResponse;
  } catch (error) {
    console.error('Error generating chat response:', error);
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
  
  return { config };
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

// For backward compatibility
export interface LLMRequestOptions {
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  contextDocuments?: Array<{ title: string; content: string }>;
  stream?: boolean;
  aiRole: string;
}

export interface LLMResponse {
  text: string;
  model: string;
  provider: string;
}

// For backward compatibility
export async function generateTextServerAction(options: LLMRequestOptions): Promise<LLMResponse> {
  const { prompt, contextDocuments = [], aiRole = 'assistant', model, temperature, maxTokens, stream } = options;
  
  // Convert to ChatRequest format
  const chatRequest: ChatRequest = {
    messages: [{ role: 'user', content: prompt }],
    contextDocuments: contextDocuments.map(doc => ({
      title: doc.title,
      content: doc.content
    })),
    stream
  };
  
  // Call generateChatResponse
  const response = await generateChatResponse(chatRequest);
  
  // Convert to LLMResponse format
            return {
    text: response.message.content,
    model: response.model,
    provider: response.provider
  };
}

// For backward compatibility, export alternate names
export const generateText = generateTextServerAction;
export const generateTextWithAI = generateTextServerAction;

/**
 * Execute a tool call and return the result
 */
export async function executeToolCall(toolCall: ToolCall, availableTools: Record<string, Function>): Promise<string> {
  try {
    const { function: { name, arguments: argsString } } = toolCall;
    
    // Check if the function exists
    if (!availableTools[name]) {
      throw new Error(`Function ${name} is not implemented`);
    }
    
    // Parse the arguments
    const args = JSON.parse(argsString);
    
    // Call the function
    const result = await availableTools[name](args);
    
    // Return the result as a string
    return typeof result === 'string' 
      ? result 
      : JSON.stringify(result);
  } catch (error) {
    console.error('Error executing tool call:', error);
    return JSON.stringify({ 
      error: `Failed to execute tool call: ${error instanceof Error ? error.message : 'Unknown error'}` 
    });
  }
}

// Improve the Gemini response handling
function safeGetTextFromGeminiChunk(chunk: unknown): string {
  try {
    // This is a simplification due to typing issues
    const textFn = (chunk as { text?: () => string }).text;
    if (typeof textFn === 'function') {
      return textFn() || '';
    }
    return '';
  } catch (error) {
    console.warn('Error extracting text from Gemini chunk:', error);
    return '';
  }
}

/**
 * Direct LLM call with tool pattern (as shown in the plan)
 */
export async function analyzeWritingStyle({ content, style = 'general' }: { content: string; style?: string }) {
  const chatRequest: ChatRequestWithTools = {
    messages: [
      {
        role: 'user',
        content: `Analyze the following text and provide feedback on its writing style.
Focus on: clarity, conciseness, tone, and engagement.

Text: ${content}
Style: ${style}`,
      }
    ],
    tools: [
      {
        type: 'function',
        function: {
          name: 'provideStyleAnalysis',
          description: 'Provide detailed analysis of writing style',
          parameters: {
            type: 'object',
            properties: {
              clarity: {
                type: 'object',
                properties: {
                  score: { type: 'number', description: 'Score from 1-10' },
                  feedback: { type: 'string', description: 'Feedback on clarity' }
                },
                required: ['score', 'feedback']
              },
              conciseness: {
                type: 'object',
                properties: {
                  score: { type: 'number', description: 'Score from 1-10' },
                  feedback: { type: 'string', description: 'Feedback on conciseness' }
                },
                required: ['score', 'feedback']
              },
              tone: {
                type: 'object',
                properties: {
                  score: { type: 'number', description: 'Score from 1-10' },
                  feedback: { type: 'string', description: 'Feedback on tone' }
                },
                required: ['score', 'feedback']
              },
              engagement: {
                type: 'object',
                properties: {
                  score: { type: 'number', description: 'Score from 1-10' },
                  feedback: { type: 'string', description: 'Feedback on engagement' }
                },
                required: ['score', 'feedback']
              },
              overall: {
                type: 'object',
                properties: {
                  score: { type: 'number', description: 'Score from 1-10' },
                  summary: { type: 'string', description: 'Overall summary' }
                },
                required: ['score', 'summary']
              }
            },
            required: ['clarity', 'conciseness', 'tone', 'engagement', 'overall']
          }
        }
      }
    ],
    tool_choice: { type: 'function', function: { name: 'provideStyleAnalysis' } }
  };

  const response = await generateChatResponse(chatRequest);
  
  if (response.message.tool_calls && response.message.tool_calls.length > 0) {
    const toolCall = response.message.tool_calls[0];
    if (toolCall.function.name === 'provideStyleAnalysis') {
      return JSON.parse(toolCall.function.arguments);
    }
  }
  
  // Fallback in case there's no tool call
  return {
    overall: {
      summary: response.message.content
    }
  };
} 
