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
  message: ChatMessageWithTools;
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
    const cached = await kv.get(cacheKey) as ChatResponse | null;
    return cached;
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
async function safeCallAdapterTool<T>(adapter: OpenAIChatAdapter | AnthropicChatAdapter, response: T): Promise<Record<string, unknown>[]> {
  try {
    // Cast to any to deal with SDK version mismatches
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toolMessages = await (adapter as any).callTool(response);
    return toolMessages || [];
  } catch (error) {
    logger.error('Error calling adapter tool:', error);
    return [];
  }
}

/**
 * Clean and format tool response data for better readability
 */
function cleanToolResponse(toolResponseText: string): string {
  try {
    // Check if it might be JSON
    if (toolResponseText.trim().startsWith('[') || toolResponseText.trim().startsWith('{')) {
      // Try to parse the JSON
      const parsed = JSON.parse(toolResponseText);
      
      // Handle search results specifically
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].type === 'text') {
        // This looks like a search result from Exa or similar tool
        try {
          // Try to parse the inner text content which is often JSON
          const innerContent = JSON.parse(parsed[0].text);
          
          // Format search results in a more readable way
          if (innerContent.results && Array.isArray(innerContent.results)) {
            let formattedResults = `Found ${innerContent.results.length} results:\n\n`;
            
            // Use proper interface for search results
            interface SearchResult {
              title: string;
              url: string;
              text?: string;
              score?: number;
              publishedDate?: string;
              [key: string]: unknown;
            }
            
            innerContent.results.forEach((result: SearchResult, index: number) => {
              formattedResults += `${index + 1}. ${result.title}\n`;
              formattedResults += `   URL: ${result.url}\n`;
              
              // Add a short snippet of text if available
              if (result.text) {
                const snippet = result.text.substring(0, 200).replace(/\n\s+\n/g, '\n').trim();
                formattedResults += `   Snippet: ${snippet}${result.text.length > 200 ? '...' : ''}\n`;
              }
              
              formattedResults += '\n';
            });
            
            // Add query information if available
            if (innerContent.autopromptString) {
              formattedResults = `Search query: "${innerContent.autopromptString}"\n\n${formattedResults}`;
            }
            
            return formattedResults;
          }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_error) {
          // If inner parsing fails, just use the text directly
          return parsed[0].text;
        }
      }
      
      // For other JSON, just pretty print it
      return JSON.stringify(parsed, null, 2);
    }
    
    // Not JSON, return as is
    return toolResponseText;
  } catch (error) {
    // If JSON parsing fails, return original text
    logger.debug('Error cleaning tool response:', error);
    return toolResponseText;
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
          // Implement multiple rounds of tool calls
          let currentResponse = response;
          const currentMessages = [...openaiMessages];
          const allToolResponsesText: string[] = [];
          let hasMoreToolCalls = true;
          let iterations = 0;
          const MAX_ITERATIONS = 5; // Safety limit to prevent infinite loops
          
          logger.debug("Starting multiple rounds of tool calls");
          
          while (hasMoreToolCalls && iterations < MAX_ITERATIONS) {
            iterations++;
            logger.debug(`Tool call iteration ${iterations}`);
            
            // Get current tool calls from the response
            const currentToolCalls = currentResponse.choices[0].message.tool_calls;
            if (!currentToolCalls || currentToolCalls.length === 0) {
              logger.debug("No more tool calls, ending loop");
              hasMoreToolCalls = false;
              break;
            }
            
            // Execute tool calls and get responses
            let toolMessages: Record<string, unknown>[] = [];
            try {
              // Call tool with specific typing instead of unknown any
              toolMessages = await safeCallAdapterTool(
                adapter, 
                currentResponse
              );
              logger.debug(`Got ${toolMessages.length} tool messages from iteration ${iterations}`);
            } catch (error) {
              logger.error(`Error calling tools in iteration ${iterations}:`, error);
              hasMoreToolCalls = false;
              break;
            }
            
            if (!toolMessages || toolMessages.length === 0) {
              logger.debug("No tool messages returned, ending loop");
              hasMoreToolCalls = false;
              break;
            }
            
            // Extract tool response text
            const toolResponseText = toolMessages
              .filter(msg => typeof msg.role === 'string' && ['tool', 'function'].includes(msg.role as string))
              .map(msg => typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content))
              .join('\n');
            
            if (toolResponseText) {
              // Clean and format the tool response for better readability
              const cleanedResponse = cleanToolResponse(toolResponseText);
              allToolResponsesText.push(cleanedResponse);
            }
            
            // Add tool messages to conversation for next round
            for (const toolMsg of toolMessages) {
              if (
                typeof toolMsg.role === 'string' && 
                typeof toolMsg.content !== 'undefined'
              ) {
                // For OpenAI, we must use 'tool' role and include tool_call_id that matches
                // a specific tool call from the preceding assistant message
                
                // Extract tool_call_id if available
                const toolCallId = typeof toolMsg.tool_call_id === 'string' 
                  ? toolMsg.tool_call_id 
                  : typeof toolMsg.id === 'string' 
                    ? toolMsg.id
                    : undefined;
                
                if (!toolCallId) {
                  logger.warn('Tool message missing tool_call_id, may cause API errors:', toolMsg);
                }
                
                // Always use 'tool' role for OpenAI to avoid API errors
                currentMessages.push({
                  role: 'tool', // Must be 'tool' for OpenAI
                  content: typeof toolMsg.content === 'string' ? 
                    toolMsg.content : 
                    JSON.stringify(toolMsg.content),
                  tool_call_id: toolCallId // Required for proper message flow in OpenAI
                } as ChatCompletionMessageParam);
                
                logger.debug(`Added tool message with tool_call_id: ${toolCallId}`);
              }
            }
            
            // Get next response to see if more tool calls are needed
            try {
              const nextResponse = await openaiClient.chat.completions.create({
                ...openaiOptions,
                messages: currentMessages
              });
              
              // Add assistant response to conversation
              currentMessages.push({
                role: 'assistant',
                content: nextResponse.choices[0].message.content || '',
                tool_calls: nextResponse.choices[0].message.tool_calls
              } as ChatCompletionMessageParam);
              
              // Update current response for next iteration
              currentResponse = nextResponse;
              
              // Check if new response has tool calls
              hasMoreToolCalls = !!nextResponse.choices[0].message.tool_calls && 
                nextResponse.choices[0].message.tool_calls.length > 0;
              
            } catch (error) {
              logger.error(`Error getting next response in iteration ${iterations}:`, error);
              hasMoreToolCalls = false;
              break;
            }
          }
          
          // Get final response content from the last assistant message
          responseText = currentResponse.choices[0].message.content || '';
          
          // Add all tool responses to the final response
          if (allToolResponsesText.length > 0) {
            responseText += '\n\n' + allToolResponsesText.join('\n\n');
          }
          
          // Log completion
          logger.debug(`Completed ${iterations} tool call iterations`);
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
      let hasPendingAnthropicToolCalls = false;
      try {
        // Check if response has tool calls (Anthropic's format is different)
        // Use type assertion to access tool_calls which may not be in the interface
        const anthropicResponse = response as unknown as { tool_calls?: Array<unknown> };
        hasPendingAnthropicToolCalls = !!anthropicResponse.tool_calls && anthropicResponse.tool_calls.length > 0;
      } catch (error) {
        // Ignore errors checking for tool calls
        logger.debug('Error checking for Anthropic tool calls:', error);
      }
      
      if (hasPendingAnthropicToolCalls) {
        // Implement multiple rounds of tool calls for Anthropic
        let currentResponse = response;
        const currentMessages = [...anthropicMessages];
        const allToolResponsesText: string[] = [];
        let hasMoreToolCalls = true;
        let iterations = 0;
        const MAX_ITERATIONS = 5; // Safety limit to prevent infinite loops
        
        logger.debug("Starting multiple rounds of Anthropic tool calls");
        
        while (hasMoreToolCalls && iterations < MAX_ITERATIONS) {
          iterations++;
          logger.debug(`Anthropic tool call iteration ${iterations}`);
          
          // Check if current response has tool calls
          const anthropicResponse = currentResponse as unknown as { tool_calls?: Array<unknown> };
          const hasPendingTools = !!anthropicResponse.tool_calls && anthropicResponse.tool_calls.length > 0;
          if (!hasPendingTools) {
            logger.debug("No more Anthropic tool calls, ending loop");
            hasMoreToolCalls = false;
            break;
          }
          
          // Execute tool calls and get responses
          const toolMessages: Record<string, unknown>[] = await safeCallAdapterTool(adapter, currentResponse);
          logger.debug(`Got ${toolMessages.length} tool messages from Anthropic iteration ${iterations}`);
          
          if (!toolMessages || toolMessages.length === 0) {
            logger.debug("No Anthropic tool messages returned, ending loop");
            hasMoreToolCalls = false;
            break;
          }
          
          // Extract tool response text
          const toolResponseText = toolMessages
            .filter(msg => typeof msg.role === 'string' && ['tool', 'assistant', 'function'].includes(msg.role as string))
            .map(msg => typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content))
            .join('\n');
            
          if (toolResponseText) {
            // Clean and format the tool response for better readability
            const cleanedResponse = cleanToolResponse(toolResponseText);
            allToolResponsesText.push(cleanedResponse);
          }
          
          // Add tool messages to conversation for next round
          for (const toolMsg of toolMessages) {
            if (
              typeof toolMsg.role === 'string' && 
              typeof toolMsg.content !== 'undefined'
            ) {
              // For Anthropic, we need to use the appropriate role format
              // Anthropic only supports 'assistant' and 'user' roles
              
              // Extract tool_call_id if available (for debugging)
              const toolCallId = typeof toolMsg.tool_call_id === 'string' 
                ? toolMsg.tool_call_id 
                : typeof toolMsg.id === 'string' 
                  ? toolMsg.id
                  : undefined;
              
              if (toolCallId) {
                logger.debug(`Processing Anthropic tool message with ID: ${toolCallId}`);
              }
              
              // Anthropic only supports 'assistant' and 'user' roles in messages
              currentMessages.push({
                role: toolMsg.role === 'system' || toolMsg.role === 'tool' || toolMsg.role === 'function' 
                  ? 'user' 
                  : (toolMsg.role as 'user' | 'assistant'),
                content: typeof toolMsg.content === 'string' 
                  ? toolMsg.content 
                  : JSON.stringify(toolMsg.content)
              });
            }
          }
          
          // Get next response to see if more tool calls are needed
          try {
            const nextResponse = await anthropicClient.messages.create({
              ...anthropicOptions,
              messages: currentMessages
            });
            
            // Update current response for next iteration
            currentResponse = nextResponse;
            
            // Parse text content from next response
            let nextResponseText = '';
            if (Array.isArray(nextResponse.content)) {
              nextResponseText = nextResponse.content
                .filter(c => c.type === 'text')
                .map(c => (c.type === 'text' ? c.text : ''))
                .join('\n');
            } else {
              nextResponseText = nextResponse.content || '';
            }
            
            // Add assistant response to conversation
            currentMessages.push({
              role: 'assistant',
              content: nextResponseText
            });
            
            // Check if new response has tool calls
            const nextAnthropicResponse = nextResponse as unknown as { tool_calls?: Array<unknown> };
            hasMoreToolCalls = !!nextAnthropicResponse.tool_calls && nextAnthropicResponse.tool_calls.length > 0;
          } catch (error) {
            logger.error(`Error getting next Anthropic response in iteration ${iterations}:`, error);
            hasMoreToolCalls = false;
            break;
          }
        }
        
        // Get final response content from the last assistant message
        if (Array.isArray(currentResponse.content)) {
          responseText = currentResponse.content
            .filter(c => c.type === 'text')
            .map(c => (c.type === 'text' ? c.text : ''))
            .join('\n');
        } else {
          responseText = currentResponse.content || '';
        }
        
        // Add all tool responses to the final response
        if (allToolResponsesText.length > 0) {
          responseText += '\n\n' + allToolResponsesText.join('\n\n');
        }
        
        // Log completion
        logger.debug(`Completed ${iterations} Anthropic tool call iterations`);
      } else {
        // No tool calls to process
        logger.debug("No Anthropic tool calls detected");
      }
    }
    
    // Prepare the final response
    const responseMessage: ChatMessageWithTools = {
      role: 'assistant',
      content: responseText,
      id: generateId(),
      model: modelName,
      provider: `mcp-${provider}`
    };

    // Only add tool_calls if they exist
    if (toolCalls && toolCalls.length > 0) {
      responseMessage.tool_calls = toolCalls;
    }

    const chatResponse: ChatResponse = {
      message: responseMessage,
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