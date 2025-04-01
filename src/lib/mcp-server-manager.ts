'use server';

import { MultiClient, createTransport } from '@smithery/sdk';
import { OpenAIChatAdapter } from '@smithery/sdk';
import { AnthropicChatAdapter } from '@smithery/sdk';
import { getInstalledServers, createSmitheryWebSocketUrl } from './smithery-service';
import { kv } from '@/lib/kv-provider';

// Interface for server with deployment status
export interface MCPServerState {
  qualifiedName: string;
  name: string;
  url: string;
  enabled: boolean;
  isDeployed: boolean;
  config: {
    apiKey?: string;
    [key: string]: unknown;
  };
}

// Simplified type for transport connections
type TransportMap = {
  [key: string]: ReturnType<typeof createTransport>;
};

// Global client instance
let globalClient: MultiClient | null = null;
let enabledServers: MCPServerState[] = [];

// Provider-specific adapters
let openaiAdapter: OpenAIChatAdapter | null = null;
let anthropicAdapter: AnthropicChatAdapter | null = null;

/**
 * Initialize and connect to enabled MCP servers
 */
export async function initializeMCPServers(): Promise<MultiClient | null> {
  try {
    console.log('Initializing MCP servers...');
    
    // Get all installed servers
    const installedServers = await getInstalledServers();
    
    // Get API key
    const SMITHERY_API_KEY = process.env.SMITHERY_API_KEY || '';
    
    if (!SMITHERY_API_KEY) {
      console.error('Smithery API key not found');
      return null;
    }
    
    // Create new client
    globalClient = new MultiClient();
    
    // Create a map of transports for enabled servers
    const transports: TransportMap = {};
    enabledServers = [];
    
    // Process each installed server
    for (const server of installedServers) {
      try {
        // Get server config
        const config = server.config || {};
        
        // Check if we have server details in KV store
        const serverDetails = await kv.get(`mcp-server-${server.qualifiedName}`);
        const isEnabled = config.enabled !== false; // Default to enabled if not specified
        
        if (!serverDetails) {
          console.warn(`No details found for server: ${server.qualifiedName}`);
          continue;
        }
        
        // Only add deployed and enabled servers
        if (isEnabled) {
          // Create transport for each enabled server
          if (serverDetails.deploymentUrl) {
            // Create the WebSocket URL with config
            const wsUrl = await createSmitheryWebSocketUrl(
              serverDetails.deploymentUrl,
              {
                apiKey: config.apiKey || SMITHERY_API_KEY,
                ...config
              }
            );
            
            // Create transport
            const transport = createTransport(wsUrl, {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SMITHERY_API_KEY}`
              }
            });
            
            // Add to transports map using server ID as the key
            const serverKey = server.qualifiedName.replace(/\//g, '_').toLowerCase();
            transports[serverKey] = transport;
            
            // Add to enabled servers list with deployment status
            enabledServers.push({
              qualifiedName: server.qualifiedName,
              name: serverDetails.displayName || server.qualifiedName,
              url: serverDetails.deploymentUrl,
              enabled: true,
              isDeployed: true,
              config: server.config
            });
            
            console.log(`Added MCP server: ${server.qualifiedName}`);
          }
        } else {
          // Add disabled server to the list but mark it as not deployed
          enabledServers.push({
            qualifiedName: server.qualifiedName,
            name: serverDetails.displayName || server.qualifiedName,
            url: serverDetails.deploymentUrl || '',
            enabled: false,
            isDeployed: false,
            config: server.config
          });
        }
      } catch (error) {
        console.error(`Error processing server ${server.qualifiedName}:`, error);
      }
    }
    
    // Add the main Smithery MCP server
    const mainTransport = createTransport(`https://smithery.ai/api/mcp`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SMITHERY_API_KEY}`
      }
    });
    transports['mcp'] = mainTransport;
    
    // Connect to all transports
    if (Object.keys(transports).length > 0) {
      try {
        await globalClient.connectAll(transports);
        console.log('Connected to MCP servers successfully');
        
        // Initialize adapters
        openaiAdapter = new OpenAIChatAdapter(globalClient);
        anthropicAdapter = new AnthropicChatAdapter(globalClient);
        
        return globalClient;
      } catch (connectionError) {
        console.error('Error connecting to MCP servers:', connectionError);
        return null;
      }
    } else {
      console.warn('No enabled MCP servers found');
      return null;
    }
  } catch (error) {
    console.error('Error initializing MCP servers:', error);
    return null;
  }
}

/**
 * Get the global MCP client, initializing if needed
 */
export async function getMCPClient(): Promise<MultiClient | null> {
  if (!globalClient) {
    return initializeMCPServers();
  }
  return globalClient;
}

/**
 * Get the list of enabled MCP servers
 */
export async function getEnabledMCPServers(): Promise<MCPServerState[]> {
  return enabledServers;
}

/**
 * Get the OpenAI adapter configured with MCP servers
 */
export async function getOpenAIAdapter(): Promise<OpenAIChatAdapter | null> {
  return openaiAdapter;
}

/**
 * Get the Anthropic adapter configured with MCP servers
 */
export async function getAnthropicAdapter(): Promise<AnthropicChatAdapter | null> {
  return anthropicAdapter;
}

/**
 * Update the deployment status of an MCP server
 */
export async function updateMCPServerStatus(
  qualifiedName: string, 
  enabled: boolean
): Promise<boolean> {
  try {
    // Find the server in the list
    const serverIndex = enabledServers.findIndex(s => s.qualifiedName === qualifiedName);
    
    if (serverIndex >= 0) {
      // Update the server status
      enabledServers[serverIndex] = {
        ...enabledServers[serverIndex],
        enabled,
        isDeployed: enabled
      };
      
      // Get server config from KV store
      const serverConfig = await kv.get(`mcp-server-config-${qualifiedName}`);
      
      if (serverConfig) {
        // Update config in KV store
        await kv.set(`mcp-server-config-${qualifiedName}`, {
          ...serverConfig,
          enabled
        });
      }
      
      // Reinitialize MCP servers to update connections
      await initializeMCPServers();
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error updating MCP server status for ${qualifiedName}:`, error);
    return false;
  }
} 