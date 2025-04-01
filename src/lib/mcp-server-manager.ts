'use server';

import { MultiClient } from "@smithery/sdk/index.js"
import { AnthropicChatAdapter } from "@smithery/sdk/integrations/llm/anthropic.js"
import { OpenAIChatAdapter } from "@smithery/sdk/integrations/llm/openai.js"
import { createTransport } from "@smithery/sdk/transport.js"

import { logger } from './logger';

// Handle WebSocket polyfill for server-side
if (typeof global !== 'undefined' && typeof WebSocket === 'undefined') {
  try {
    logger.info('Setting up WebSocket polyfill for server environment');
    
    // Use a safer approach to avoid require() and issues with dynamic imports
    import('ws').then(ws => {
      // @ts-expect-error - TypeScript doesn't understand this global assignment
      global.WebSocket = ws.default || ws;
      logger.info('WebSocket polyfill set up successfully');
    }).catch(error => {
      logger.error('Failed to import WebSocket module:', error);
    });
  } catch (error) {
    logger.error('Error setting up WebSocket polyfill:', error);
  }
}

// Log initialization to verify this file is being loaded
logger.always("MCP Server Manager loading...");

// Interface for server with deployment status
export interface MCPServerState {
  qualifiedName: string;
  name: string;
  url: string;
  enabled: boolean;
  isDeployed: boolean;
  description?: string;
  config: {
    apiKey?: string;
    [key: string]: unknown;
  };
}

// Track enabled servers for UI/feedback
const enabledServers: MCPServerState[] = [];

// Provider-specific adapters
let openaiAdapter: OpenAIChatAdapter | null = null;
let anthropicAdapter: AnthropicChatAdapter | null = null;

// MultiClient instance
let mcpClient: MultiClient | null = null;

/**
 * Initialize and connect to enabled MCP servers
 */
export async function initializeMCPServers(): Promise<MultiClient | null> {
  try {
    logger.always('Initializing MCP servers...');
    
    // Get API key
    const SMITHERY_API_KEY = process.env.SMITHERY_API_KEY || '';
    
    if (!SMITHERY_API_KEY) {
      logger.error('Smithery API key not found. Set SMITHERY_API_KEY environment variable.');
      return null;
    }
    
    // Create a multiclient instance
    mcpClient = new MultiClient();
    
    // Create a map of transports
    const transports: Record<string, ReturnType<typeof createTransport>> = {};
    
    // Add the Exa server transport
    const EXA_API_KEY = process.env.EXA_API_KEY || '';
    const EXA_SERVER_URL = process.env.EXA_SERVER_URL || 'https://server.smithery.ai/exa';
    
    if (EXA_API_KEY) {
      // Ensure the URL uses the WebSocket protocol
      const wsUrl = EXA_SERVER_URL.replace(/^https?:\/\//, 'wss://');
      
      logger.always(`Converting URL from ${EXA_SERVER_URL} to WebSocket URL: ${wsUrl}`);
      
      const exaTransport = createTransport(wsUrl, {
        exaApiKey: EXA_API_KEY,
        apiKey: SMITHERY_API_KEY
      });
      
      transports.exa = exaTransport;
      logger.info(`Added Exa transport for ${wsUrl}`);
      
      // Add to enabled servers list for UI
      enabledServers.push({
        qualifiedName: 'exa',
        name: 'Exa Search',
        url: EXA_SERVER_URL,
        enabled: true,
        isDeployed: true,
        description: 'Fast, intelligent web search and crawling',
        config: { apiKey: EXA_API_KEY }
      });
    } else {
      logger.warn('No EXA_API_KEY found, Exa search will not be available');
    }
    
    // Connect to all transports
    if (Object.keys(transports).length > 0) {
      try {
        logger.info(`Connecting to ${Object.keys(transports).length} MCP servers...`);
        
        await mcpClient.connectAll(transports);
        logger.info('Connected to MCP servers successfully');
        
        // Initialize adapters
        openaiAdapter = new OpenAIChatAdapter(mcpClient);
        anthropicAdapter = new AnthropicChatAdapter(mcpClient);
        
        return mcpClient;
      } catch (connectionError) {
        logger.error('Error connecting to MCP servers:', connectionError);
        return null;
      }
    } else {
      logger.warn('No MCP servers configured');
      return null;
    }
  } catch (error) {
    logger.error('Error initializing MCP servers:', error);
    return null;
  }
}

/**
 * Get an MCP client, initializing if not already done
 */
export async function getMCPClient(): Promise<MultiClient | null> {
  if (mcpClient) {
    logger.debug('Returning existing MCP client');
    return mcpClient;
  }
  
  logger.debug('Initializing new MCP client');
  return initializeMCPServers();
}

/**
 * Get the list of enabled MCP servers
 */
export async function getEnabledMCPServers(): Promise<MCPServerState[]> {
  // If we have no servers but haven't tried initializing yet, try now
  if (enabledServers.length === 0 && !mcpClient) {
    await initializeMCPServers();
  }
  
  logger.debug(`getEnabledMCPServers called, returning ${enabledServers.length} servers`);
  return enabledServers;
}

/**
 * Get the OpenAI adapter configured with MCP servers
 */
export async function getOpenAIAdapter(): Promise<OpenAIChatAdapter | null> {
  // Initialize if needed
  if (!openaiAdapter) {
    await initializeMCPServers();
  }
  
  logger.debug(`getOpenAIAdapter called, adapter ${openaiAdapter ? 'exists' : 'is null'}`);
  return openaiAdapter;
}

/**
 * Get the Anthropic adapter configured with MCP servers
 */
export async function getAnthropicAdapter(): Promise<AnthropicChatAdapter | null> {
  // Initialize if needed
  if (!anthropicAdapter) {
    await initializeMCPServers();
  }
  
  logger.debug(`getAnthropicAdapter called, adapter ${anthropicAdapter ? 'exists' : 'is null'}`);
  return anthropicAdapter;
} 