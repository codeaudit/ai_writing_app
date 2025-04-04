'use server'

import { OpenAI } from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { 
  GoogleGenerativeAI, 
  Content, 
  Part, 
  GenerativeModel, 
  GenerateContentResult,
  FunctionDeclaration,
  FunctionCall
} from '@google/generative-ai';

import { AnthropicChatAdapter } from "@smithery/sdk/integrations/llm/anthropic.js"
import { OpenAIChatAdapter } from "@smithery/sdk/integrations/llm/openai.js"
import { GeminiAIChatAdapter } from './gemini-adapter';

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
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || '';

// Create API clients
const openaiClient = new OpenAI({
  apiKey: OPENAI_API_KEY
});

const anthropicClient = new Anthropic({
  apiKey: ANTHROPIC_API_KEY
});

// Create Google Generative AI client
const geminiClient = new GoogleGenerativeAI(GOOGLE_API_KEY);

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
 * Convert ChatMessage array to Content array for Gemini
 */
function convertToGeminiMessages(messages: ChatMessage[]): Content[] {
  return messages.map(msg => {
    const role = msg.role === 'system' || msg.role === 'user' ? 'user' : 'model';
    
    return {
      role: role,
      parts: [{ text: msg.role === 'system' ? `System Instructions: ${msg.content}` : msg.content }] as Part[]
    };
  });
}

/**
 * Convert Tool array to Gemini Function Declarations
 */
function convertToolsToGeminiFunctionDeclarations(tools: Tool[]): FunctionDeclaration[] {
  return tools.map(tool => {
    if (tool.type !== 'function') return null;
    
    return {
      name: tool.function.name,
      description: tool.function.description,
      parameters: {
        ...tool.function.parameters,
        type: tool.function.parameters.type || 'OBJECT'
      }
    };
  }).filter(Boolean) as FunctionDeclaration[];
}

/**
 * Get MCP tools from a specific adapter
 */
async function getMCPServerTools(adapter: OpenAIChatAdapter | AnthropicChatAdapter | GeminiAIChatAdapter): Promise<Tool[]> {
  try {
    const rawTools = await adapter.listTools();
    
    // Convert the raw tools to our Tool interface
    const convertedTools = (Array.isArray(rawTools) ? rawTools : []).map((rawTool: Record<string, unknown>) => {
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
async function safeCallAdapterTool<T>(adapter: OpenAIChatAdapter | AnthropicChatAdapter | GeminiAIChatAdapter, response: T): Promise<Record<string, unknown>[]> {
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
      if (Array.isArray(parsed) && parsed.length > 0 && parsed?.[0]?.type === 'text') {
        // This looks like a search result from Exa or similar tool
        try {
          // Extract search results if they exist
          interface SearchResult {
            title: string;
            url: string;
            text?: string;
            score?: number;
            publishedDate?: string;
            [key: string]: unknown;
          }
          
          const searchResults = parsed
            .filter(item => 
              typeof item === 'object' && 
              item !== null && 
              typeof item.type === 'string' && 
              item.type === 'text' && 
              typeof item.text === 'string' && 
              typeof item.metadata === 'object' && 
              item.metadata !== null &&
              typeof item.metadata.title === 'string' &&
              typeof item.metadata.url === 'string'
            )
            .map((item): SearchResult => ({
              title: item.metadata.title,
              url: item.metadata.url,
              text: item.text,
              score: typeof item.metadata.score === 'number' ? item.metadata.score : undefined,
              publishedDate: typeof item.metadata.published_date === 'string' ? 
                item.metadata.published_date : undefined
            }));
          
          if (searchResults.length > 0) {
            // Format search results
            const formatted = searchResults.map((result, i) => {
              const snippetText = result.text ? 
                `\n   Snippet: ${result.text.substring(0, 200)}${result.text.length > 200 ? '...' : ''}` : '';
                
              return `${i + 1}. [${result.title}](${result.url})${snippetText}`;
            }).join('\n\n');
            
            return `Search Results:\n\n${formatted}`;
          }
        } catch (formatError) {
          logger.debug('Error formatting search results:', formatError);
        }
      }
      
      // For other JSON responses, pretty-print them
      return JSON.stringify(parsed, null, 2);
    }
    
    // If not JSON, return the original text
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
  const { enableCache, temperature: configTemperature, maxTokens: configMaxTokens, aiRole = 'assistant' } = config;
  
  // Get the last message to check for provider information
  const lastMessage = request.messages && request.messages.length > 0 
    ? request.messages[request.messages.length - 1]
    : null;
    
  // Check if the message has provider information, otherwise use the config provider
  const provider = lastMessage?.provider?.replace('mcp-', '') || config.provider;
  
  // Use the model from config or from the last message
  const modelName = lastMessage?.model || config.model;
  
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
  const lastUserMessage = messages[messages.length - 1];
  if (!lastUserMessage || !lastUserMessage.content) {
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
  
  let responseText = '';
  
  try {
    // Get Multi Client instance
    const mcpClient = await getMCPClient();
    
    if (!mcpClient) {
      throw new Error("Failed to initialize MCP client");
    }
    
    logger.info("MCP client initialized successfully");
    
    let toolCalls: ToolCall[] | undefined;
    
    if (provider === 'openai') {
      logger.debug("Using OpenAI provider with MCP");
      // Get the singleton adapter instead of creating a new one
      const { getOpenAIAdapter } = await import('./mcp-server-manager');
      const adapter = await getOpenAIAdapter();
      
      if (!adapter) {
        throw new Error("Failed to initialize OpenAI adapter");
      }
      
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
          // Initial messages for the tool calling loop
          const loopMessages = [...openaiMessages];
          
          // Add initial assistant response to messages
          loopMessages.push({
            role: 'assistant',
            content: response.choices[0].message.content || '',
            tool_calls: response.choices[0].message.tool_calls
          } as ChatCompletionMessageParam);
          
          // Loop until no more tool calls
          let isDone = false;
          let currentResponse = response;
          
          while (!isDone) {
            // Use the singleton adapter instead of creating a new one
            const adapter = await getOpenAIAdapter();
            
            if (!adapter) {
              throw new Error("Failed to get OpenAI adapter for tool calling");
            }
            
            // Get tool messages
            const toolMessages = await adapter.callTool(currentResponse);
            
            // If no tool messages, we're done
            if (!toolMessages || toolMessages.length === 0) {
              isDone = true;
              continue;
            }
            
            // Add all tool messages to the conversation directly
            loopMessages.push(...toolMessages as ChatCompletionMessageParam[]);
            
            // Get next response
            const nextResponse = await openaiClient.chat.completions.create({
              ...openaiOptions,
              messages: loopMessages
            });
            
            // Update current response for next iteration
            currentResponse = nextResponse;
            
            // Add the new assistant response to messages
            loopMessages.push({
              role: 'assistant',
              content: nextResponse.choices[0].message.content || '',
              tool_calls: nextResponse.choices[0].message.tool_calls
            } as ChatCompletionMessageParam);
            
            // Update isDone based on whether there are tool calls
            isDone = !nextResponse.choices[0].message.tool_calls || 
                    nextResponse.choices[0].message.tool_calls.length === 0;
          }
          
          // Get final response content from the last assistant message
          responseText = loopMessages
            .filter(msg => msg.role === 'assistant')
            .map(msg => typeof msg.content === 'string' ? msg.content : '')
            .pop() || '';
        }
      }
    } else if (provider === 'anthropic') {
      logger.debug("Using Anthropic provider with MCP");
      // Get the singleton adapter instead of creating a new one
      const { getAnthropicAdapter } = await import('./mcp-server-manager');
      const adapter = await getAnthropicAdapter();
      
      if (!adapter) {
        throw new Error("Failed to initialize Anthropic adapter");
      }
      
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
        // Check for tool calls in Anthropic's format
        hasPendingAnthropicToolCalls = Array.isArray(response.content) && 
          response.content.some(item => item.type === 'tool_use');
      } catch (error) {
        logger.debug('Error checking for Anthropic tool calls:', error);
      }
      
      if (hasPendingAnthropicToolCalls) {
        try {
          // Create a copy of the client to use the adapter without type conflicts
          // We'll use our own loop implementation that matches the sample pattern
          // but works around the type issues
          
          // Get the MCP client
          const mcpClient = await getMCPClient();
          if (!mcpClient) {
            throw new Error("MCP client not available");
          }
          
          // Track messages in a format Anthropic can work with
          const loopMessages = [...anthropicMessages];
          
          // Track if we're done with tool calling
          let isDone = false;
          let currentResponse = response;
          let responseText = '';
          
          // Extract text from the initial response
          if (Array.isArray(currentResponse.content)) {
            responseText = currentResponse.content
              .filter(c => c.type === 'text')
              .map(c => (c.type === 'text' ? c.text : ''))
              .join('\n');
          } else {
            responseText = String(currentResponse.content || '');
          }
          
          // Add initial response text to messages
          loopMessages.push({
            role: 'assistant',
            content: responseText
          });
          
          // Start the tool calling loop, similar to the sample
          while (!isDone) {
            // Use the singleton adapter instead of creating a new one
            const adapter = await getAnthropicAdapter();
            
            if (!adapter) {
              throw new Error("Failed to get Anthropic adapter for tool calling");
            }
            
            // Call the adapter to process tool calls
            // This is the key part of the pattern in the sample
            // Use type assertion to work around SDK version compatibility issues
            const toolMessages = await adapter.callTool(currentResponse as unknown as {
              content: Array<{type: string; text?: string; id?: string; input?: Record<string, unknown>; name?: string}>;
            });
            
            // Check if we should stop
            if (!toolMessages || toolMessages.length === 0) {
              logger.debug("No tool messages returned, ending loop");
              isDone = true;
              continue;
            }
            
            // Add tool messages as user messages
            // This avoids the type conflict by manually creating compatible messages
            for (const msg of toolMessages) {
              if (msg && typeof msg === 'object') {
                // Safely extract content
                const content = typeof msg.content === 'string' 
                  ? msg.content 
                  : JSON.stringify(msg.content);
                
                // Add as user message (Anthropic accepts this role)
                loopMessages.push({
                  role: 'user',
                  content: content
                });
              }
            }
            
            // Get next Anthropic response
            currentResponse = await anthropicClient.messages.create({
              model: modelName,
              messages: loopMessages,
              system: enhancedSystemMessage,
              max_tokens: configMaxTokens,
              temperature: configTemperature
            });
            
            // Extract text from response
            let nextResponseText = '';
            if (Array.isArray(currentResponse.content)) {
              nextResponseText = currentResponse.content
                .filter(c => c.type === 'text')
                .map(c => (c.type === 'text' ? c.text : ''))
                .join('\n');
            } else {
              nextResponseText = String(currentResponse.content || '');
            }
            
            // Add assistant response text to messages
            loopMessages.push({
              role: 'assistant',
              content: nextResponseText
            });
            
            // Check if there are tool calls in the response
            const hasMoreToolCalls = Array.isArray(currentResponse.content) && 
              currentResponse.content.some(item => item.type === 'tool_use');
            
            // Update isDone based on toolMessages in next iteration
            isDone = !hasMoreToolCalls;
          }
          
          // Get the final text from the last response
          if (Array.isArray(currentResponse.content)) {
            responseText = currentResponse.content
              .filter(c => c.type === 'text')
              .map(c => (c.type === 'text' ? c.text : ''))
              .join('\n');
          } else {
            responseText = String(currentResponse.content || '');
          }
        } catch (error) {
          logger.error("Error during Anthropic tool calling loop:", error);
          if (error instanceof Error) {
            logger.error(error.message);
          }
          
          // Get whatever text we have from the initial response
          if (Array.isArray(response.content)) {
            responseText = response.content
              .filter(c => c.type === 'text')
              .map(c => (c.type === 'text' ? c.text : ''))
              .join('\n');
          } else {
            responseText = String(response.content || '');
          }
        }
      }
    } else if (provider === 'gemini') {
      logger.debug("Using Gemini provider with MCP");
      // Get the singleton adapter instead of creating a new one
      const { getGeminiAdapter } = await import('./mcp-server-manager');
      const adapter = await getGeminiAdapter();
      
      if (!adapter) {
        throw new Error("Failed to initialize Gemini adapter");
      }
      
      // Verify Google API Key
      if (!GOOGLE_API_KEY) {
        throw new Error("Google API key is not set");
      }
      
      // Get tools if custom tools aren't provided
      let mcpTools: Tool[] = [];
      if (customTools.length === 0 && mcpClient) {
        // For Gemini, we'll use the Gemini adapter instead of OpenAI adapter
        mcpTools = await getMCPServerTools(adapter);
      }
      
      // Prepare messages for Gemini
      const systemMessage = { role: 'user', content: enhancedSystemMessage } as ChatMessage;
      const geminiMessages = convertToGeminiMessages([systemMessage, ...messages]);
      
      // Get the Gemini model
      const model: GenerativeModel = geminiClient.getGenerativeModel({ model: modelName });
      
      // Get tools to use
      const tools = customTools.length > 0 ? customTools : mcpTools;
      
      // Create options for the API call
      const geminiConfig: {
        temperature?: number;
        maxOutputTokens?: number;
        tools?: Array<{functionDeclarations: FunctionDeclaration[]}>
      } = {
        temperature: configTemperature,
        maxOutputTokens: configMaxTokens,
      };
      
      // Add tools if available
      if (tools.length > 0) {
        const functionDeclarations = convertToolsToGeminiFunctionDeclarations(tools);
        if (functionDeclarations.length > 0) {
          geminiConfig.tools = [{
            functionDeclarations
          }];
        }
      }
      
      try {
        // Make API call
        const response: GenerateContentResult = await model.generateContent({
          contents: geminiMessages,
          generationConfig: geminiConfig
        });
        
        // Process tool calls if present
        // Access function calls from response
        const functionCalls: FunctionCall[] = [];
        
        // Attempt to extract function calls
        try {
          // Use type assertion to access functionCalls which may not be in the interface
          const responseAny = response as unknown as { 
            functionCalls?: FunctionCall[]
          };
          
          if (responseAny.functionCalls && Array.isArray(responseAny.functionCalls)) {
            functionCalls.push(...responseAny.functionCalls);
          }
        } catch (extractError) {
          logger.debug('Error extracting function calls from Gemini response:', extractError);
        }
        
        if (functionCalls.length > 0) {
          // Convert function calls to our standardized format
          const extractedToolCalls: ToolCall[] = functionCalls.map((fc, idx) => ({
            id: `call-${Date.now()}-${idx}`,
            type: 'function',
            function: {
              name: fc.name,
              arguments: typeof fc.args === 'string' ? fc.args : JSON.stringify(fc.args)
            }
          }));
          
          toolCalls = extractedToolCalls;
            
          // Implement function calling with MCP if we have an mcpClient
          if (mcpClient && extractedToolCalls.length > 0) {
            const adapter = new GeminiAIChatAdapter(mcpClient);
            const allToolResponsesText: string[] = [];
            
            // Get response text
            let responseText = '';
            try {
              // Cast response to a common type used in the Google Generative AI SDK
              // The structure may vary depending on SDK version, so we need to handle different formats
              const responseWithText = response as unknown as { 
                text: () => string;
                candidates?: Array<{content: {parts: Array<{text: string}>}}>
              };
              
              if (typeof responseWithText.text === 'function') {
                responseText = responseWithText.text();
              } else if (responseWithText.candidates && 
                        responseWithText.candidates[0] && 
                        responseWithText.candidates[0].content && 
                        responseWithText.candidates[0].content.parts) {
                responseText = responseWithText.candidates[0].content.parts
                  .filter(part => typeof part.text === 'string')
                  .map(part => part.text)
                  .join('');
              }
            } catch (textError) {
              logger.warn('Error extracting text from Gemini response:', textError);
            }
            
            // Implement multiple rounds of tool calls for Gemini
            const currentGeminiMessages = [...geminiMessages];
            let hasMoreGeminiToolCalls = true;
            let iterations = 0;
            const MAX_ITERATIONS = 5; // Safety limit to prevent infinite loops
            
            logger.debug("Starting multiple rounds of Gemini tool calls");
            
            // Add the initial assistant response
            currentGeminiMessages.push({
              role: 'model',
              parts: [{text: responseText}]
            });
            
            // Generate a compatible OpenAI-like format for the adapter
            let currentResponse = {
              choices: [{
                message: {
                  content: responseText,
                  tool_calls: extractedToolCalls.map(tc => ({
                    id: tc.id,
                    function: {
                      name: tc.function.name,
                      arguments: tc.function.arguments
                    }
                  }))
                }
              }]
            };
              
            while (hasMoreGeminiToolCalls && iterations < MAX_ITERATIONS) {
              iterations++;
              logger.debug(`Gemini tool call iteration ${iterations}`);
              
              // Use the singleton adapter instead of creating a new one
              const adapter = await getGeminiAdapter();
              
              if (!adapter) {
                throw new Error("Failed to get Gemini adapter for tool calling");
                break;
              }
              
              // Execute tool calls and get responses
              let toolMessages: Record<string, unknown>[] = [];
              try {
                // Use the adapter already retrieved earlier instead of getting a new one
                toolMessages = await safeCallAdapterTool(adapter, currentResponse);
                logger.debug(`Got ${toolMessages.length} tool messages from Gemini iteration ${iterations}`);
              } catch (error) {
                logger.error(`Error calling tools in Gemini iteration ${iterations}:`, error);
                hasMoreGeminiToolCalls = false;
                break;
              }
              
              if (!toolMessages || toolMessages.length === 0) {
                logger.debug("No Gemini tool messages returned, ending loop");
                hasMoreGeminiToolCalls = false;
                break;
              }
              
              // Extract tool response text
              const toolResponseText = toolMessages
                .filter(msg => typeof msg.role === 'string' && ['tool', 'function'].includes(msg.role as string))
                .map(msg => typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content))
                .join('\n');
                
              if (toolResponseText) {
                // Clean and format the tool response
                const cleanedResponse = cleanToolResponse(toolResponseText);
                allToolResponsesText.push(cleanedResponse);
              }
              
              // Add tool messages to conversation for next round
              for (const toolMsg of toolMessages) {
                if (typeof toolMsg.role === 'string' && typeof toolMsg.content !== 'undefined') {
                  // For Gemini we need to adapt the message format
                  currentGeminiMessages.push({
                    role: 'user',
                    parts: [{
                      text: `Function result: ${typeof toolMsg.content === 'string' ? 
                        toolMsg.content : JSON.stringify(toolMsg.content)}`
                    }]
                  });
                }
              }
              
              // Get next response to see if more tool calls are needed
              try {
                const nextResponse: GenerateContentResult = await model.generateContent({
                  contents: currentGeminiMessages,
                  generationConfig: geminiConfig
                });
                
                // Extract next response text
                let nextResponseText = '';
                try {
                  const responseWithText = nextResponse as unknown as { 
                    text: () => string;
                    candidates?: Array<{content: {parts: Array<{text: string}>}}>
                  };
                  
                  if (typeof responseWithText.text === 'function') {
                    nextResponseText = responseWithText.text();
                  } else if (responseWithText.candidates && 
                            responseWithText.candidates[0] && 
                            responseWithText.candidates[0].content && 
                            responseWithText.candidates[0].content.parts) {
                    nextResponseText = responseWithText.candidates[0].content.parts
                      .filter(part => typeof part.text === 'string')
                      .map(part => part.text)
                      .join('');
                  }
                } catch (textError) {
                  logger.warn('Error extracting text from next Gemini response:', textError);
                }
                
                // Add the assistant response to the conversation
                currentGeminiMessages.push({
                  role: 'model',
                  parts: [{text: nextResponseText}]
                });
                
                // Extract any new function calls
                const nextFunctionCalls: FunctionCall[] = [];
                try {
                  const nextResponseAny = nextResponse as unknown as { 
                    functionCalls?: FunctionCall[]
                  };
                  
                  if (nextResponseAny.functionCalls && Array.isArray(nextResponseAny.functionCalls)) {
                    nextFunctionCalls.push(...nextResponseAny.functionCalls);
                  }
                } catch (extractError) {
                  logger.debug('Error extracting function calls from next Gemini response:', extractError);
                }
                
                // Check if we have more tool calls
                hasMoreGeminiToolCalls = nextFunctionCalls.length > 0;
                
                if (hasMoreGeminiToolCalls) {
                  // Update tool calls for the next iteration
                  const nextExtractedToolCalls: ToolCall[] = nextFunctionCalls.map((fc, idx) => ({
                    id: `call-${Date.now()}-${idx}-iter-${iterations}`,
                    type: 'function',
                    function: {
                      name: fc.name,
                      arguments: typeof fc.args === 'string' ? fc.args : JSON.stringify(fc.args)
                    }
                  }));
                  
                  // Update the current response for the next iteration
                  currentResponse = {
                    choices: [{
                      message: {
                        content: nextResponseText,
                        tool_calls: nextExtractedToolCalls.map(tc => ({
                          id: tc.id,
                          function: {
                            name: tc.function.name,
                            arguments: tc.function.arguments
                          }
                        }))
                      }
                    }]
                  };
                  
                  // Update the toolCalls array with all tool calls
                  toolCalls = [...toolCalls, ...nextExtractedToolCalls];
                } else {
                  // No more tool calls, use the final response
                  responseText = nextResponseText;
                }
              } catch (error) {
                logger.error(`Error getting next Gemini response in iteration ${iterations}:`, error);
                hasMoreGeminiToolCalls = false;
                // Use the last known response text
                break;
              }
            }
            
            // Add all tool responses to final response
            if (allToolResponsesText.length > 0) {
              responseText += '\n\n' + allToolResponsesText.join('\n\n');
            }
            
            // Log completion
            logger.debug(`Completed ${iterations} Gemini tool call iterations`);
          } else {
            // Just extract the text content if no MCP client
            try {
              const responseWithText = response as unknown as { text: () => string };
              responseText = typeof responseWithText.text === 'function' ? responseWithText.text() : '';
            } catch (error) {
              logger.warn('Error extracting text from Gemini response:', error);
              responseText = '';
            }
          }
        } else {
          // No tool calls, just extract the text
          try {
            const responseWithText = response as unknown as { text: () => string };
            responseText = typeof responseWithText.text === 'function' ? responseWithText.text() : '';
          } catch (error) {
            logger.warn('Error extracting text from Gemini response:', error);
            responseText = '';
          }
        }
      } catch (error) {
        logger.error('Error with Gemini API call:', error);
        throw error;
      }
    } else {
      throw new Error(`Unsupported provider: ${provider}`);
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
      debugPrompt: formatDebugPrompt(enhancedSystemMessage, lastUserMessage.content, provider, modelName)
    };
    
    // Log debug information
    try {
      const cookieStore = await cookies();
      const sessionId = cookieStore.get('ai-session-id')?.value || 'unknown';
      await logAIDebug(sessionId, {
        provider: `mcp-${provider}`,
        model: modelName,
        systemMessage: enhancedSystemMessage,
        userPrompt: lastUserMessage.content,
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