'use server'

import { OpenAI } from 'openai';
import Anthropic from '@anthropic-ai/sdk';

import { AnthropicChatAdapter } from "@smithery/sdk/integrations/llm/anthropic.js"
import { OpenAIChatAdapter } from "@smithery/sdk/integrations/llm/openai.js"

import { kv } from '@/lib/kv-provider';
import { cookies } from 'next/headers';
import { formatDebugPrompt, logAIDebug } from '@/lib/ai-debug';
import { getAIRoleSystemPrompt } from './ai-roles';
import { 
  getMCPClient
} from './mcp-server-manager';
import { logger } from './logger';
import type { ChatCompletionMessageParam } from 'openai/resources/chat';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';
import type { ChatCompletionCreateParams } from 'openai/resources';
import type { MessageCreateParams } from '@anthropic-ai/sdk/resources/messages';

// Import environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

// Create API clients
const openaiClient = new OpenAI({
  apiKey: OPENAI_API_KEY
});

const anthropicClient = new Anthropic({
  apiKey: ANTHROPIC_API_KEY
});

// Re-export types from llm-service to be compatible
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
  name?: string;
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

// Helper function to generate a unique ID
function generateId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create cache key for responses
 */
function createCacheKey(provider: string, model: string, messages: ChatMessage[]): string {
  const lastUserMessage = Array.isArray(messages) 
    ? messages.filter(m => m.role === 'user').pop()?.content || '' 
    : '';
  
  return `mcp-chat-${provider}-${model}-${lastUserMessage.substring(0, 100)}`;
}

/**
 * Get cached response if available
 */
async function getFromCache(cacheKey: string, enableCache: boolean): Promise<ChatResponse | null> {
  if (!enableCache) return null;
  
  try {
    return await kv.get(cacheKey);
  } catch (error) {
    logger.warn('Error getting from cache:', error);
    return null;
  }
}

/**
 * Store response in cache
 */
async function storeInCache(cacheKey: string, response: ChatResponse, enableCache: boolean): Promise<void> {
  if (!enableCache) return;
  
  try {
    await kv.set(cacheKey, response, { ex: 3600 }); // 1 hour expiry
  } catch (error) {
    logger.warn('Error storing in cache:', error);
  }
}

/**
 * Convert ChatMessage array to ChatCompletionMessageParam array for OpenAI
 */
function convertToOpenAIMessages(messages: ChatMessage[]): ChatCompletionMessageParam[] {
  return messages.map(msg => ({
    role: msg.role as 'user' | 'assistant' | 'system',
    content: msg.content
  }));
}

/**
 * Convert ChatMessage array to MessageParam array for Anthropic
 */
function convertToAnthropicMessages(messages: ChatMessage[]): MessageParam[] {
  return messages
    .filter(msg => msg.role !== 'system') // Anthropic doesn't support system in the messages array
    .map(msg => ({
      role: msg.role === 'system' ? 'user' : msg.role as 'user' | 'assistant',
      content: msg.content
    }));
}

/**
 * Get MCP tools from a specific adapter
 */
async function getMCPServerTools(adapter: OpenAIChatAdapter | AnthropicChatAdapter): Promise<Tool[]> {
  try {
    const rawTools = await adapter.listTools();
    
    // Convert the raw tools to our Tool interface
    const convertedTools = rawTools.map(rawTool => {
      const toolObj: Record<string, unknown> = rawTool as unknown as Record<string, unknown>;
      
      // Check if this has the expected structure
      if (
        toolObj && 
        typeof toolObj.type === 'string' && 
        toolObj.type === 'function' && 
        typeof toolObj.function === 'object' && 
        toolObj.function !== null
      ) {
        const fn = toolObj.function as Record<string, unknown>;
        
        if (
          typeof fn.name === 'string' && 
          typeof fn.description === 'string' && 
          typeof fn.parameters === 'object' && 
          fn.parameters !== null
        ) {
          // This matches our Tool interface
          const tool: Tool = {
            type: 'function',
            function: {
              name: fn.name,
              description: fn.description,
              parameters: fn.parameters as Record<string, unknown>
            }
          };
          return tool;
        }
      }
      
      // Skip tools that don't match our interface
      logger.warn('Skipping incompatible tool:', toolObj);
      return null;
    }).filter((tool): tool is Tool => tool !== null);
    
    logger.info(`Found ${convertedTools.length} compatible tools`);
    return convertedTools;
  } catch (error) {
    logger.error('Error getting MCP server tools:', error);
    return [];
  }
}

// Helper function to safely call adapter tools with proper error handling
async function safeCallAdapterTool(adapter: any, response: any): Promise<any[]> {
  try {
    // @ts-expect-error: SDK version mismatch requires ignoring type checking
    const toolMessages = await adapter.callTool(response);
    return toolMessages || [];
  } catch (error) {
    logger.error('Error calling adapter tool:', error);
    return [];
  }
}

/**
 * Server action for chat functionality using MCP
 */
export async function generateMCPChatResponse(request: ChatRequest | ChatRequestWithTools): Promise<ChatResponse> {
  logger.debug("Starting MCP chat response generation");
  
  const { config } = await getServerConfig();
  const { provider, enableCache, temperature: configTemperature, maxTokens: configMaxTokens, aiRole = 'assistant' } = config;
  
  // Use the model from config
  const modelName = config.model;
  
  logger.debug(`Using provider: ${provider}, model: ${modelName}`);
  
  const { 
    messages, 
    context, 
    contextDocuments = []
  } = request;
  
  // Extract tools if provided
  const toolsRequest = request as ChatRequestWithTools;
  const customTools = toolsRequest.tools || [];
  const toolChoice = toolsRequest.tool_choice || 'auto';
  
  // Check if there are any messages
  if (!messages || messages.length === 0) {
    logger.error("No messages provided to generate a response from");
    throw new Error("No messages provided to generate a response from");
  }
  
  // Get the last user message
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || !lastMessage.content) {
    logger.error("The last message is invalid or missing content");
    throw new Error("The last message is invalid or missing content");
  }
  
  // Build system message with context
  const systemMessage = await getAIRoleSystemPrompt(aiRole);
  let enhancedSystemMessage = systemMessage;
  
  // Add context to system message if provided
  if (context) {
    enhancedSystemMessage += `\n\nUse the following context to inform your responses: <context>${context}</context>`;
  }

  
  if (contextDocuments && contextDocuments.length > 0) {
    logger.debug(`Adding ${contextDocuments.length} context documents to prompt`);
    enhancedSystemMessage += '\n\nUse the following additional context documents to inform your responses:\n\n';
    contextDocuments.forEach(doc => {
      enhancedSystemMessage += `Document: ${doc.title || doc.name || "Untitled"}\n${doc.content}\n\n`;
    });
  }
  
  // Check if response is in cache
  const cacheKey = createCacheKey(provider, modelName, messages);
  const cachedResponse = await getFromCache(cacheKey, enableCache);
  if (cachedResponse) {
    logger.info("Using cached response");
    return cachedResponse;
  }
  
  try {
    // Initialize the MCP client
    logger.debug("Initializing MCP client");
    const mcpClient = await getMCPClient();
    
    if (!mcpClient) {
      logger.error("Failed to initialize MCP client");
      throw new Error("Failed to initialize MCP client");
    }
    
    logger.info("MCP client initialized successfully");
    
    let responseText = '';
    let toolCalls: ToolCall[] | undefined;
    
    // Use different approach based on provider
    if (provider === 'openai') {
      logger.debug("Using OpenAI provider with MCP");
      // OpenAI approach with MCP
      const adapter = new OpenAIChatAdapter(mcpClient);
      
      // Get tools if custom tools aren't provided
      let mcpTools: Tool[] = [];
      if (customTools.length === 0) {
        mcpTools = await getMCPServerTools(adapter);
      }
      
      // Prepare messages for OpenAI
      const openaiMessages = convertToOpenAIMessages([
        // Add system message for OpenAI to ensure proper functioning
        { role: 'system', content: enhancedSystemMessage },
        ...messages
      ]);
      
      // Get tools to use
      const tools = customTools.length > 0 ? customTools : mcpTools;
      
      // Create typed options for the API call
      const openaiOptions: ChatCompletionCreateParams = {
        model: modelName,
        messages: openaiMessages,
        temperature: configTemperature,
        max_tokens: configMaxTokens
      };
      
      // Add tools if available
      if (tools.length > 0) {
        // Type assertion needed for tool compatibility
        openaiOptions.tools = tools as unknown as ChatCompletionCreateParams['tools'];
        if (typeof toolChoice === 'string') {
          openaiOptions.tool_choice = toolChoice as 'auto' | 'none';
        } else {
          openaiOptions.tool_choice = toolChoice as unknown as ChatCompletionCreateParams['tool_choice'];
        }
      }
      
      // Make API call
      const response = await openaiClient.chat.completions.create(openaiOptions);
      
      // Get response content
      responseText = response.choices[0].message.content || '';
      
      // Handle any tool calls
      if (response.choices[0].message.tool_calls) {
        toolCalls = response.choices[0].message.tool_calls.map(tc => ({
          id: tc.id,
          type: 'function',
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments
          }
        }));
        
        // Process tool calls if available
        if (toolCalls && toolCalls.length > 0) {
          let toolMessages: Record<string, unknown>[] = [];
          try {
            // Use unknown type to avoid type checking between mismatched SDK versions
            toolMessages = await safeCallAdapterTool(adapter, response as unknown as any);
            logger.debug(`Got ${toolMessages.length} tool messages from OpenAI`);
          } catch (error) {
            logger.error('Error calling tools with OpenAI adapter:', error);
            // Continue with empty tool messages
          }
          
          if (toolMessages && toolMessages.length > 0) {
            // Extract response text from tool results
            const toolResponseText = toolMessages
              .filter(msg => typeof msg.role === 'string' && ['tool', 'function'].includes(msg.role as string))
              .map(msg => typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content))
              .join('\n');
              
            // Append tool results to response if available
            if (toolResponseText) {
              responseText += '\n\n' + toolResponseText;
            }
          }
        }
      }
    } else {
      logger.debug("Using Anthropic provider with MCP");
      // Anthropic approach with MCP
      const adapter = new AnthropicChatAdapter(mcpClient);
      
      // Get tools if custom tools aren't provided
      let mcpTools: Tool[] = [];
      if (customTools.length === 0) {
        mcpTools = await getMCPServerTools(adapter);
      }
      
      // Prepare messages for Anthropic
      const anthropicMessages = convertToAnthropicMessages(messages);
      
      // Get tools to use
      const tools = customTools.length > 0 ? customTools : mcpTools;
      
      // Create typed options for the API call
      const anthropicOptions: MessageCreateParams = {
        model: modelName,
        messages: anthropicMessages,
        system: enhancedSystemMessage,
        max_tokens: configMaxTokens,
        temperature: configTemperature
      };
      
      // Add tools if available
      if (tools.length > 0) {
        // Type assertion needed for tool compatibility
        anthropicOptions.tools = tools as unknown as MessageCreateParams['tools'];
      }
      
      // Make API call
      const response = await anthropicClient.messages.create(anthropicOptions);
      
      // Parse response text from content blocks
      if (Array.isArray(response.content)) {
        responseText = response.content
          .filter(c => c.type === 'text')
          .map(c => (c.type === 'text' ? c.text : ''))
          .join('\n');
      } else {
        responseText = response.content || '';
      }
      
      // Process tool calls if available
      let toolMessages: any[] = [];
      try {
        // Use unknown type to avoid type checking between mismatched SDK versions
        toolMessages = await safeCallAdapterTool(adapter, response as unknown as any);
        logger.debug(`Got ${toolMessages.length} tool messages from Anthropic`);
      } catch (error) {
        logger.error('Error calling tools with Anthropic adapter:', error);
        // Continue with empty tool messages
      }
      
      if (toolMessages && toolMessages.length > 0) {
        // Extract response text from tool results
        const toolResponseText = toolMessages
          .filter(msg => typeof msg.role === 'string' && ['tool', 'assistant', 'function'].includes(msg.role))
          .map(msg => typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content))
          .join('\n');
          
        // Append tool results to response if available
        if (toolResponseText) {
          responseText += '\n\n' + toolResponseText;
        }
      }
    }
    
    // Prepare the final response
    const chatResponse: ChatResponse = {
      message: {
        role: 'assistant',
        content: responseText,
        id: generateId(),
        model: modelName,
        provider: `mcp-${provider}`,
        tool_calls: toolCalls
      } as ChatMessageWithTools,
      model: modelName,
      provider: `mcp-${provider}`,
      debugPrompt: formatDebugPrompt(enhancedSystemMessage, lastMessage.content, provider, modelName)
    };
    
    // Log debug information
    try {
      const cookieStore = await cookies();
      const sessionId = cookieStore.get('ai-session-id')?.value || 'unknown';
      await logAIDebug(sessionId, {
        provider: `mcp-${provider}`,
        model: modelName,
        systemMessage: enhancedSystemMessage,
        userPrompt: lastMessage.content,
        responseLength: responseText.length,
        responsePreview: responseText.substring(0, 100) + (responseText.length > 100 ? '...' : ''),
        contextDocumentsCount: contextDocuments.length,
      });
    } catch (logError) {
      logger.error('Error logging AI debug info:', logError);
    }
    
    // Cache the response if caching is enabled
    await storeInCache(cacheKey, chatResponse, enableCache);
    
    return chatResponse;
  } catch (error) {
    logger.error('Error generating MCP chat response:', error);
    throw error;
  }
}

/**
 * Execute a multi-step operation using MCP
 */
export async function executeMCPOperation(operation: MCPOperation): Promise<Record<string, unknown>> {
  try {
    // Get the MCP client
    const client = await getMCPClient();
    
    if (!client) {
      throw new Error("MCP client is not configured or initialized");
    }
    
    logger.info(`Executing MCP operation: ${operation.name}`);
    
    // Prepare the request parameters for the operation
    const params: Record<string, unknown> = {
      name: operation.name,
      steps: operation.steps.map(step => ({
        name: step.name,
        prompt: step.prompt,
        model: step.model,
        temperature: step.temperature,
      }))
    };
    
    // Add metadata if provided
    if (operation.metadata) {
      params.metadata = operation.metadata;
    }
    
    // Execute the operation using the MCP client
    try {
      // Since we can't guarantee the client structure, use a safer approach
      interface MCPClient {
        clients?: {
          mcp?: {
            request?: (params: { method: string; params: Record<string, unknown> }) => Promise<unknown>;
          };
        };
      }
      
      const clientWithMcp = client as MCPClient;
      if (!clientWithMcp.clients?.mcp?.request) {
        throw new Error("MCP client does not have the expected structure");
      }
      
      const result = await clientWithMcp.clients.mcp.request({
        method: "executeOperation",
        params
      });
      
      return result as Record<string, unknown>;
    } catch (requestError) {
      logger.error('Error in MCP request:', requestError);
      return { 
        success: false, 
        error: requestError instanceof Error ? requestError.message : 'Unknown request error',
        operation: operation.name
      };
    }
  } catch (error) {
    logger.error('Error executing MCP operation:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      operation: operation.name
    };
  }
}

/**
 * Get server config from KV store or defaults
 */
async function getServerConfig() {
  // Default config
  const config = {
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 4096,
    enableCache: false,
    aiRole: 'assistant'
  };

  try {
    // Get from KV store if available
    const storedConfig = await kv.get('llm-config');
    if (storedConfig) {
      return { config: { ...config, ...storedConfig } };
    }
  } catch (error) {
    logger.warn('Error getting config from KV store:', error);
  }

  return { config };
} 