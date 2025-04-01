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
    
    // Use dynamic import for the WebSocket module
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    import('ws').then((ws: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global as any).WebSocket = ws.default || ws;
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
    
    // Clear the existing enabledServers array
    enabledServers.length = 0;
    
    try {
      // Load servers from the settings file
      const { loadMCPServersFromFile } = await import('./mcp-server-files');
      const installedServers = await loadMCPServersFromFile();
      
      logger.info(`Found ${installedServers.length} installed MCP servers`);
      
      // Filter for enabled servers only
      const enabledMCPServers = installedServers.filter(server => server.enabled);
      
      logger.info(`${enabledMCPServers.length} servers are enabled`);
      
      if (enabledMCPServers.length === 0) {
        logger.warn('No enabled MCP servers found');
      }
      
      // Process each enabled server
      for (const server of enabledMCPServers) {
        try {
          const { qualifiedName, config, url: serverUrl, name } = server;
          
          // Skip if missing essential configuration
          if (!qualifiedName || !config) {
            logger.warn(`Skipping server with invalid configuration: ${qualifiedName || 'unknown'}`);
            continue;
          }
          
          // Get the API key for this server
          const apiKey = config.apiKey || '';
          if (!apiKey) {
            logger.warn(`No API key for server ${qualifiedName}, skipping`);
            continue;
          }
          
          // Get the server URL
          const serverUrlStr = typeof serverUrl === 'string' ? serverUrl : '';
          const configUrlStr = typeof config.url === 'string' ? config.url : '';
          const baseUrl = serverUrlStr || configUrlStr || `https://server.smithery.ai/${qualifiedName}`;
          
          // Ensure the URL uses the WebSocket protocol
          const wsUrl = baseUrl.replace(/^https?:\/\//, 'wss://');
          
          logger.info(`Setting up transport for ${qualifiedName} at ${wsUrl}`);
          
          // Create transport with appropriate configuration
          const transport = createTransport(wsUrl, {
            apiKey: SMITHERY_API_KEY,
            // Add the server-specific API key with the appropriate name
            // The key name varies depending on the server type
            ...(qualifiedName === 'exa' 
              ? { exaApiKey: apiKey }  // Special case for Exa
              : { [qualifiedName + 'ApiKey']: apiKey })  // General case for other servers
          });
          
          // Add to transports map
          transports[qualifiedName] = transport;
          
          // Add to enabled servers list for UI
          enabledServers.push({
            qualifiedName,
            name: name || qualifiedName,
            url: baseUrl,
            enabled: true,
            isDeployed: true,
            description: server.description || `MCP Server: ${qualifiedName}`,
            config
          });
          
          logger.info(`Added ${qualifiedName} transport`);
        } catch (serverError) {
          logger.error(`Error setting up server ${server.qualifiedName}:`, serverError);
          // Continue with other servers
        }
      }
    } catch (loadError) {
      logger.error('Error loading MCP servers from settings:', loadError);
      // Continue with any hardcoded fallbacks if needed
    }
    
    // Fallback to environment variable configuration if no servers were loaded
    if (Object.keys(transports).length === 0) {
      logger.warn('No servers loaded from settings, checking environment variables as fallback');
      
      // Add the Exa server transport using environment variables
      const EXA_API_KEY = process.env.EXA_API_KEY || '';
      const EXA_SERVER_URL = process.env.EXA_SERVER_URL || 'https://server.smithery.ai/exa';
      
      if (EXA_API_KEY) {
        // Ensure the URL uses the WebSocket protocol
        const wsUrl = EXA_SERVER_URL.replace(/^https?:\/\//, 'wss://');
        
        logger.always(`Fallback: Using Exa from environment - ${EXA_SERVER_URL} to WebSocket URL: ${wsUrl}`);
        
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
        logger.warn('No EXA_API_KEY found in environment, Exa search will not be available');
      }
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

/**
 * Update a server's enabled status
 */
export async function updateMCPServerStatus(
  qualifiedName: string,
  enabled: boolean
): Promise<boolean> {
  try {
    logger.debug(`Updating MCP server status: ${qualifiedName} to ${enabled ? 'enabled' : 'disabled'}`);
    
    // Call the API route to update the server status
    const response = await fetch('/api/mcp-servers', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        qualifiedName,
        enabled
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      logger.error(`Failed to update server status: ${errorData.error}`);
      return false;
    }
    
    // Update the local enabledServers array
    const serverIndex = enabledServers.findIndex(s => s.qualifiedName === qualifiedName);
    
    if (serverIndex >= 0) {
      enabledServers[serverIndex].enabled = enabled;
      logger.debug(`Updated local state for ${qualifiedName}`);
    }
    
    // Force re-initialize if server state changes
    if (mcpClient && enabled !== (serverIndex >= 0 ? enabledServers[serverIndex].enabled : false)) {
      logger.debug('Server state changed, will re-initialize on next request');
      mcpClient = null;
    }
    
    return true;
  } catch (error) {
    logger.error('Error updating MCP server status:', error);
    return false;
  }
} 