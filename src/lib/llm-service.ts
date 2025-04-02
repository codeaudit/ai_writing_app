// @ts-nocheck 
'use server'

import { OpenAI } from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';
import { GoogleGenerativeAI, GenerativeModel, Content, Part } from '@google/generative-ai';
import { kv } from '@/lib/kv-provider';
import { cookies } from 'next/headers';
import { formatDebugPrompt, logAIDebug } from '@/lib/ai-debug';
import { getAIRoleSystemPrompt, AIRole, DEFAULT_PROMPTS } from './ai-roles';
import type { ChatCompletionMessageParam } from 'openai/resources/chat';
import { OpenAIChatAdapter } from '@smithery/sdk';
import { LLM_MODELS } from '@/lib/config';
import { 
  getMCPClient, 
  getOpenAIAdapter, 
  getAnthropicAdapter, 
  initializeMCPServers 
} from './mcp-server-manager';

// Define the SmitheryClient interface here instead of importing it
interface SmitheryClient {
  clients: {
    mcp: {
      request: (requestParams: { 
        method: string; 
        params?: Record<string, unknown>; 
      }) => Promise<Record<string, unknown>>;
    }
  };
}

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

// Create MCP client using Smithery SDK
let smitheryClient: SmitheryClient | null = null;

// Provider-specific adapters
let openaiOpenAIAdapter: any = null;
let openrouterOpenAIAdapter: any = null;
let featherlessOpenAIAdapter: any = null;
let anthropicAdapter: any = null;

// Initialize Smithery client
try {
  // Initialize MCP servers and get the global client
  initializeMCPServers().then(async client => {
    if (client) {
      console.log('MCP servers initialized successfully');
      
      // Store the configured client
      smitheryClient = client as unknown as SmitheryClient;
      
      // Get the provider-specific adapters
      openaiOpenAIAdapter = await getOpenAIAdapter();
      anthropicAdapter = await getAnthropicAdapter();
      
      // Initialize additional adapters if needed
      if (OPENROUTER_API_KEY) {
        openrouterOpenAIAdapter = new OpenAIChatAdapter(client);
        console.log('OpenRouter adapter initialized successfully');
      }
      
      if (FEATHERLESS_API_KEY) {
        featherlessOpenAIAdapter = new OpenAIChatAdapter(client);
        console.log('Featherless adapter initialized successfully');
      }
      
      console.log('All Smithery adapters initialized successfully');
    } else {
      console.error('Failed to initialize MCP servers');
    }
  }).catch(error => {
    console.error('Error initializing MCP servers:', error);
  });
} catch (error) {
  console.error('Error setting up Smithery client:', error);
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

/**
 * TypeScript types for message formatting - simplified
 */
interface FormattedMessages {
  [key: string]: unknown;
  systemPrompt?: string;
  messages?: Array<any>;
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
      // @ts-ignore
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
      
      // @ts-ignore
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
      
      // @ts-ignore
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
 * Execute a multi-step operation using MCP with Smithery SDK
 */
export async function executeMCPOperation(operation: MCPOperation): Promise<Record<string, unknown>> {
  // Get the Smithery client, initializing if needed
  if (!smitheryClient) {
    smitheryClient = await getMCPClient() as unknown as SmitheryClient;
  }
  
  if (!smitheryClient) {
    throw new Error("Smithery client is not configured or still initializing. Please set SMITHERY_API_KEY.");
  }
  
  try {
    console.log(`Executing MCP operation: ${operation.name}`);
    
    // Prepare the request parameters for the operation
    const params: Record<string, unknown> = {
      name: operation.name,
      steps: operation.steps.map(step => ({
        name: step.name,
        prompt: step.prompt,
        model: step.model,
        temperature: step.temperature,
      })),
    };
    
    // Add metadata if provided
    if (operation.metadata) {
      params.metadata = operation.metadata;
    }
    
    // Execute the operation using the Smithery client
    const result = await smitheryClient.clients.mcp.request({
      method: "executeOperation",
      params,
    });
    
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

/**
 * Get available tools from Smithery client
 */
export async function getAvailableTools(): Promise<Tool[]> {
  if (!smitheryClient) {
    console.warn("Smithery client is not configured. No tools available.");
    return [];
  }
  
  try {
    // Get tools directly from the client
    const rawTools = await smitheryClient.clients.mcp.request({
      method: "tools",
    });
    
    // Transform raw tools to our Tool interface format
    return Object.entries(rawTools).map(([name, tool]) => ({
      type: 'function',
      function: {
        name,
        description: (tool as any).description || `Tool: ${name}`,
        parameters: (tool as any).parameters || {},
      }
    }));
  } catch (error) {
    console.error('Error getting available tools:', error);
    return [];
  }
}

/**
 * Process OpenAI-compatible provider with Smithery
 */
async function processWithOpenAISmithery(
  provider: 'openai' | 'openrouter' | 'featherless',
  options: Record<string, any>,
  tools: Tool[],
  toolChoice: any
): Promise<{ text: string; toolCalls?: ToolCall[] }> {
  // Get the appropriate adapter based on provider
  let adapter: any;
  let client: any;
  
  switch (provider) {
    case 'openai':
      adapter = openaiOpenAIAdapter;
      client = openaiClient;
      if (!adapter) {
        throw new Error("Smithery OpenAI adapter is not initialized");
      }
      break;
    case 'openrouter':
      adapter = openrouterOpenAIAdapter;
      client = openRouterClient;
      if (!adapter) {
        throw new Error("Smithery OpenRouter adapter is not initialized");
      }
      break;
    case 'featherless':
      adapter = featherlessOpenAIAdapter;
      client = featherlessClient;
      if (!adapter) {
        throw new Error("Smithery Featherless adapter is not initialized");
      }
      break;
  }
  
  // Get smithery tools for this specific adapter
  const smitheryTools = await adapter.listTools();
  
  // Handle model name for OpenRouter and Featherless
  if (provider === 'openrouter' && options.model) {
    // If the model name doesn't exist in the OpenRouter models list, use it as is
    // OpenRouter models already have their provider prefixes in the config
    const models = LLM_MODELS['openrouter'];
    const modelFound = models.find(m => m.value === options.model || m.label === options.model);
    
    // Only use the model name directly from config if found
    if (modelFound) {
      options.model = modelFound.value;
      console.log(`Using OpenRouter with model: ${options.model}`);
    }
  }
  
  // For Featherless, use model names directly from config
  if (provider === 'featherless' && options.model) {
    // Featherless models already have their provider prefixes in the config
    const models = LLM_MODELS['featherless'];
    const modelFound = models.find(m => m.value === options.model || m.label === options.model);
    
    // Only use the model name directly from config if found
    if (modelFound) {
      options.model = modelFound.value;
      console.log(`Using Featherless with model: ${options.model}`);
    }
  }
  
  // Make the initial request with all required parameters
  const response = await client.chat.completions.create({
    ...options,
    tools: smitheryTools,
    tool_choice: toolChoice !== 'auto' ? toolChoice : undefined
  });
  
  // Check if there are tool calls to process
  const message = response.choices[0].message;
  
  if (message.tool_calls && message.tool_calls.length > 0) {
    // Use the specific adapter to handle the tool calls
    const toolMessages = await adapter.callTool(response);
    
    // For simplicity, we'll return the first tool result as our response
    // In a full implementation, you'd consider multiple tool calls and conversation loops
    if (toolMessages.length > 0) {
      return {
        text: toolMessages[0].content,
        toolCalls: message.tool_calls.map(tc => ({
          id: tc.id,
          type: 'function' as const,
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments
          }
        }))
      };
    }
  }
  
  // If no tool calls or no results, just return the text
  return {
    text: message.content || '',
    toolCalls: message.tool_calls
  };
}

/**
 * Process Anthropic provider with Smithery
 */
async function processWithAnthropicSmithery(
  options: Record<string, any>,
  tools: Tool[]
): Promise<{ text: string; toolCalls?: ToolCall[] }> {
  if (!anthropicAdapter || !smitheryClient) {
    throw new Error("Smithery Anthropic adapter is not initialized");
  }
  
  // Get smithery tools from the anthropic adapter
  const smitheryTools = await anthropicAdapter.listTools();
  
  // For Anthropic, we need to add tools through the adapter
  // and handle their different format for tool calls
  const response = await anthropicClient.messages.create({
    ...options,
    tools: smitheryTools
  });
  
  // Check if there are tool calls to process
  const toolCalls = response.content.filter(item => 
    item.type === 'tool_use'
  ).map(item => {
    const toolUse = (item as any).tool_use;
    return {
      id: toolUse.id,
      type: 'function' as const,
      function: {
        name: toolUse.name,
        arguments: JSON.stringify(toolUse.input)
      }
    };
  });
  
  if (toolCalls.length > 0) {
    // Use the specific anthropic adapter to handle tool calls if available
    try {
      // Here we'd ideally use the Anthropic adapter's method for handling tool calls
      // For now, we'll use our manual approach
      const toolResponses = await Promise.all(
        toolCalls.map(async (toolCall) => {
          try {
            const result = await smitheryClient?.clients.mcp.request({
              method: toolCall.function.name,
              params: JSON.parse(toolCall.function.arguments)
            });
            return result;
          } catch (error) {
            console.error('Error executing tool call:', error);
            return { error: 'Tool execution failed' };
          }
        })
      );
      
      // Combine tool responses into a text
      const toolResponseText = toolResponses
        .map((response, i) => `Tool ${toolCalls[i].function.name}: ${JSON.stringify(response)}`)
        .join('\n\n');
      
      return {
        text: toolResponseText,
        toolCalls
      };
    } catch (error) {
      console.error('Error using Anthropic adapter for tool calls:', error);
    }
  }
  
  // If no tool calls, just return the text content
  const textContent = response.content
    .filter(item => item.type === 'text')
    .map(item => (item as any).text)
    .join('');
  
  return { text: textContent };
}

// Server action for chat functionality
export async function generateChatResponse(request: ChatRequest | ChatRequestWithTools): Promise<ChatResponse> {
  const { config } = await getServerConfig();
  const { provider, enableCache, temperature: configTemperature, maxTokens: configMaxTokens, aiRole = 'assistant' } = config;
  
  // Debug API key information
  logApiKeyInfo(provider);
  
  // Use the model from config
  let modelName = config.model;
  
  // Format the model name for OpenRouter - models already have provider prefixes in config
  if (provider === 'openrouter' && modelName) {
    // If the model name doesn't exist in the OpenRouter models list, use it as is
    const models = LLM_MODELS['openrouter'];
    const modelFound = models.find(m => m.value === modelName || m.label === modelName);
    
    // Only use the model name directly from config if found
    if (modelFound) {
      modelName = modelFound.value;
      console.log(`Using OpenRouter with model: ${modelName}`);
    }
  }
  
  // For Featherless, use model names directly from config
  if (provider === 'featherless' && modelName) {
    // Featherless models already have their provider prefixes in the config
    const models = LLM_MODELS['featherless'];
    const modelFound = models.find(m => m.value === modelName || m.label === modelName);
    
    // Only use the model name directly from config if found
    if (modelFound) {
      modelName = modelFound.value;
      console.log(`Using Featherless with model: ${modelName}`);
    }
  }
  
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
        
        if (tools.length > 0 && smitheryClient && anthropicAdapter) {
          // Use Smithery for tool-enabled requests
          const result = await processWithAnthropicSmithery(
            {
              model: modelName,
              system: systemPrompt,
              messages,
              max_tokens: configMaxTokens,
              temperature: configTemperature
            },
            tools
          );
          
          responseText = result.text;
          toolCalls = result.toolCalls;
        } else if (stream) {
          // Regular streaming, no tools
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
          // Regular non-streaming, no tools
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
      
      case 'openai': 
      case 'openrouter':
      case 'featherless': {
        const apiKey = provider === 'openai' ? OPENAI_API_KEY : 
                       provider === 'openrouter' ? OPENROUTER_API_KEY : 
                       FEATHERLESS_API_KEY;
        
        if (!apiKey) {
          throw new Error(`${provider.charAt(0).toUpperCase() + provider.slice(1)} API key is not set`);
        }
        
        // Prepare OpenAI options with tools support
        const openAIOptions: any = {
          model: modelName,
          messages: formattedMessages as unknown as ChatCompletionMessageParam[],
          temperature: configTemperature,
          max_tokens: configMaxTokens,
        };
        
        // Select the appropriate client based on provider
        const client = provider === 'openai' ? openaiClient :
                       provider === 'openrouter' ? openRouterClient :
                       featherlessClient;
        
        if (tools.length > 0 && smitheryClient) {
          // Use Smithery for tool-enabled requests
          const result = await processWithOpenAISmithery(
            provider, 
            openAIOptions, 
            tools, 
            toolChoice
          );
          
          responseText = result.text;
          toolCalls = result.toolCalls;
        } else if (stream) {
          // Regular streaming, no tools
          const response = await client.chat.completions.create({
            ...openAIOptions,
            stream: true
          });
          
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
          // Regular non-streaming, no tools
          const response = await client.chat.completions.create(openAIOptions);
          
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
      
      default:
        throw new Error(`Unsupported provider: ${provider}`);
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