'use server'

import { OpenAI } from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';
import { OpenAIChatAdapter } from '@smithery/sdk';
import { AnthropicChatAdapter } from '@smithery/sdk';
import { MultiClient, createTransport } from '@smithery/sdk';
import { kv } from '@/lib/kv-provider';
import { cookies } from 'next/headers';
import { formatDebugPrompt, logAIDebug } from '@/lib/ai-debug';
import { getAIRoleSystemPrompt } from './ai-roles';
import { 
  getEnabledMCPServers,
  getMCPClient as getBaseMCPClient
} from './mcp-server-manager';
import { logger } from './logger';
import type { ChatCompletionMessageParam } from 'openai/resources/chat';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';
import type { ChatCompletionCreateParams } from 'openai/resources';
import type { MessageCreateParams } from '@anthropic-ai/sdk/resources/messages';
import type { MCPServerState as BaseMCPServerState } from './mcp-server-manager';

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

// Extended interface to handle all the possible server structure variants
interface ExtendedMCPServerState extends BaseMCPServerState {
  // Properties directly from mcp-servers.md format
  connections?: Array<Connection>;
  deploymentUrl?: string;
  // Any additional properties that might exist
  [key: string]: unknown;
}

// Connection interface for MCP server connections
interface Connection {
  type: string;
  deploymentUrl?: string;
  configSchema?: Record<string, unknown>;
  [key: string]: unknown;
}

// Helper function to generate a unique ID
function generateId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get the WebSocket URL for a specific MCP server from installed servers
 */
async function getServerWebSocketUrl(serverName: string): Promise<string | null> {
  try {
    // Get all enabled MCP servers
    const enabledServers = await getEnabledMCPServers();
    logger.debug(`Found ${enabledServers.length} enabled MCP servers`);
    
    // Find the server with the matching name
    const server = enabledServers.find(s => 
      s.qualifiedName === serverName || 
      s.name.toLowerCase() === serverName.toLowerCase()
    ) as ExtendedMCPServerState | undefined;

    if (!server) {
      logger.error(`Server ${serverName} not found in enabled MCP servers`);
      return null;
    }

    logger.debug(`Found server: ${server.name} (${server.qualifiedName})`);

    // First, check for connections array directly on the server object (per mcp-servers.md)
    if (server.connections && Array.isArray(server.connections)) {
      logger.debug(`Server has ${server.connections.length} connections`);
      const wsConnection = server.connections.find(conn => conn.type === 'ws');
      if (wsConnection && wsConnection.deploymentUrl) {
        logger.info(`Found WebSocket URL in connections: ${wsConnection.deploymentUrl}`);
        return wsConnection.deploymentUrl;
      }
    }

    // Next, check for connections in the server.config object
    if (server.config && server.config.connections && Array.isArray(server.config.connections)) {
      logger.debug(`Server config has ${server.config.connections.length} connections`);
      const wsConnection = server.config.connections.find((conn: Connection) => conn.type === 'ws');
      if (wsConnection && wsConnection.deploymentUrl) {
        logger.info(`Found WebSocket URL in config.connections: ${wsConnection.deploymentUrl}`);
        return wsConnection.deploymentUrl;
      }
    }

    // Finally, check if there's a deploymentUrl directly on the server object
    if (server.deploymentUrl) {
      logger.info(`Found deploymentUrl on server: ${server.deploymentUrl}`);
      return server.deploymentUrl;
    }

    // If we don't find the connection in any of the above, check the server's url
    if (server.url) {
      logger.info(`Using server.url as fallback: ${server.url}`);
      return server.url;
    }

    logger.error(`No WebSocket URL found for server ${serverName}. Server structure:`, JSON.stringify(server, null, 2));
    return null;
  } catch (error) {
    logger.error(`Error getting WebSocket URL for server ${serverName}:`, error);
    return null;
  }
}

// Get server config from kv store or defaults
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
 * Get MCP tools from a specific server
 */
async function getMCPServerTools(client: unknown, adapter: OpenAIChatAdapter | AnthropicChatAdapter): Promise<Tool[]> {
  try {
    const rawTools = await adapter.listTools();
    
    // Convert the raw tools to our Tool interface
    // We use a two-step process to ensure type safety
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

/**
 * Get an MCP client with improved WebSocket URL detection
 */
async function getMCPClient(): Promise<MultiClient | null> {
  try {
    logger.debug("Initializing MCP client...");
    
    // Try to get the base client first
    const baseClient = await getBaseMCPClient();
    if (baseClient) {
      logger.info("Using base MCP client from server manager");
      return baseClient;
    }
    
    logger.warn("Base client unavailable, attempting to create custom client");
    
    // Create a custom MultiClient as fallback
    const multiClient = new MultiClient();
    const SMITHERY_API_KEY = process.env.SMITHERY_API_KEY || '';
    
    if (!SMITHERY_API_KEY) {
      logger.error('Smithery API key not found');
      return null;
    }
    
    // Get all enabled MCP servers
    const enabledServers = await getEnabledMCPServers();
    if (!enabledServers || enabledServers.length === 0) {
      logger.error('No enabled MCP servers found');
      return null;
    }
    
    // Create a map of transports
    const transports: Record<string, ReturnType<typeof createTransport>> = {};
    let hasValidConnection = false;
    
    // Add all enabled servers
    logger.debug(`Processing ${enabledServers.length} enabled servers`);
    for (const server of enabledServers) {
      try {
        // Get WebSocket URL using our improved function
        logger.debug(`Getting WebSocket URL for server: ${server.name}`);
        const wsUrl = await getServerWebSocketUrl(server.qualifiedName);
        
        if (wsUrl) {
          logger.info(`Creating transport for ${server.name} with URL: ${wsUrl}`);
          
          // Hardcoded transport - will replace later!
          const transport = createTransport("https://server.smithery.ai/exa", {
            "exaApiKey": "b4f1c7aa-6263-47c3-bb82-897414271ffc",
            "apiKey": "eb97b64f-c463-493d-b210-443933bc0d4e" 
          });
          
          // Add to transports map
          const serverKey = server.qualifiedName.replace(/\//g, '_').toLowerCase();
          transports[serverKey] = transport;
          hasValidConnection = true;
          logger.debug(`Added transport for ${server.name} with key: ${serverKey}`);
        } else {
          logger.warn(`No WebSocket URL found for ${server.name}, skipping`);
        }
      } catch (error) {
        logger.error(`Error creating transport for ${server.name}:`, error);
      }
    }
    
    // If we have at least one valid connection, connect to all transports
    if (hasValidConnection) {
      try {
        logger.debug("Connecting to all MCP servers...");
        await multiClient.connectAll(transports);
        logger.info('Connected to MCP servers successfully');
        return multiClient;
      } catch (connectionError) {
        logger.error('Error connecting to MCP servers:', connectionError);
      }
    } else {
      logger.error('No valid MCP server connections were found');
    }
    
    return null;
  } catch (error) {
    logger.error('Error initializing MCP client:', error);
    return null;
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
    // Get enabled MCP servers
    const enabledServers = await getEnabledMCPServers();
    logger.info(`Found ${enabledServers.length} enabled MCP servers`);
    
    // Log the WebSocket URLs for debugging
    for (const server of enabledServers) {
      const wsUrl = await getServerWebSocketUrl(server.qualifiedName);
      logger.debug(`Server ${server.name} (${server.qualifiedName}) WebSocket URL: ${wsUrl || 'Not found'}`);
    }
    
    // Initialize the MCP client
    logger.debug("About to initialize MCP client");
    const client = await getMCPClient();
    logger.debug("MCP client initialization complete");
    
    if (!client) {
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
      const adapter = new OpenAIChatAdapter(client);
      
      // Get tools if custom tools aren't provided
      let mcpTools: Tool[] = [];
      if (customTools.length === 0) {
        mcpTools = await getMCPServerTools(client, adapter);
      }
      
      // Prepare messages for OpenAI
      const openaiMessages = convertToOpenAIMessages([
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
        // Since the OpenAI SDK's tool types have changed, we need to use a double type assertion
        // to bypass the type checking while maintaining runtime compatibility
        openaiOptions.tools = tools as unknown as ChatCompletionCreateParams['tools'];
        if (typeof toolChoice === 'string') {
          openaiOptions.tool_choice = toolChoice as 'auto' | 'none';
        } else {
          openaiOptions.tool_choice = toolChoice as unknown as ChatCompletionCreateParams['tool_choice'];
        }
      }
      
      // Make API call to OpenAI
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
      }
    } else {
      logger.debug("Using Anthropic provider with MCP");
      // Anthropic approach with MCP
      const adapter = new AnthropicChatAdapter(client);
      
      // Get tools if custom tools aren't provided
      let mcpTools: Tool[] = [];
      if (customTools.length === 0) {
        mcpTools = await getMCPServerTools(client, adapter);
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
      
      // Make API call to Anthropic
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