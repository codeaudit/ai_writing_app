'use server';

import { MultiClient, createTransport } from '@smithery/sdk';
import { OpenAIChatAdapter } from '@smithery/sdk';
import { AnthropicChatAdapter } from '@smithery/sdk';
import { 
  getInstalledServers, 
  createSmitheryWebSocketUrl, 
  fetchMCPServerDetails 
} from './smithery-service';
import { kv } from '@/lib/kv-provider';

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
let enabledServers: MCPServerState[] = [];

// Provider-specific adapters
let openaiAdapter: OpenAIChatAdapter | null = null;
let anthropicAdapter: AnthropicChatAdapter | null = null;

// Helper to get the full API URL
function getApiUrl(path: string): string {
  // For server-side calls, we need a full URL
  if (typeof window === 'undefined') {
    // Use local environment URL, or a default if not available
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return `${baseUrl}${path}`;
  }
  // For client-side calls, relative URL is fine
  return path;
}

/**
 * Initialize and connect to enabled MCP servers
 */
export async function initializeMCPServers(): Promise<MultiClient | null> {
  try {
    console.log('Initializing MCP servers...');
    
    // Create a multiclient instance
    const multi = new MultiClient();
    
    // Create a map of transports
    const transports: Record<string, ReturnType<typeof createTransport>> = {};
    
    // Reset enabled servers list
    enabledServers = [];
    
    // Get API key
    const SMITHERY_API_KEY = process.env.SMITHERY_API_KEY || '';
    
    if (!SMITHERY_API_KEY) {
      console.error('Smithery API key not found');
      return null;
    }
    
    // Get all installed servers
    const installedServers = await getInstalledServers();
    
    if (!installedServers || installedServers.length === 0) {
      console.log('No installed MCP servers found');
      return multi;
    }
    
    console.log(`Found ${installedServers.length} installed MCP servers`);
    
    // Process each installed server
    for (const server of installedServers) {
      try {
        // Get server config
        const config = server.config || {};
        const isEnabled = config.enabled !== false; // Default to enabled if not specified
        
        // First try to get server details from KV store
        let serverDetails = await kv.get(`mcp-server-${server.qualifiedName}`);
        
        // If no details in KV, try to get them from the file storage
        if (!serverDetails) {
          console.log(`Fetching details for server from registry: ${server.qualifiedName}`);
          
          try {
            // Fetch fresh details from the registry API
            const freshDetails = await fetchMCPServerDetails(server.qualifiedName);
            
            // Store in KV for future use
            await kv.set(`mcp-server-${server.qualifiedName}`, freshDetails);
            
            serverDetails = freshDetails;
            console.log(`Updated details for server ${server.qualifiedName}`);
          } catch (fetchError) {
            console.error(`Couldn't fetch server details for ${server.qualifiedName}:`, fetchError);
            
            // Create a minimal server details object from the file data
            serverDetails = {
              qualifiedName: server.qualifiedName,
              displayName: server.qualifiedName,
              deploymentUrl: server.config.url || '',
              connections: []
            };
          }
        }
        
        // Only add deployed and enabled servers to transports
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
              description: serverDetails.description,
              config: server.config
            });
            
            console.log(`Added MCP server to transports: ${server.qualifiedName}`);
          } else {
            console.warn(`Server ${server.qualifiedName} is enabled but has no deployment URL`);
            
            // Still add to enabled servers list but mark as not deployed
            enabledServers.push({
              qualifiedName: server.qualifiedName,
              name: serverDetails.displayName || server.qualifiedName,
              url: '',
              enabled: true,
              isDeployed: false,
              description: serverDetails.description,
              config: server.config
            });
          }
        } else {
          // Add disabled server to the list but mark it as not deployed
          enabledServers.push({
            qualifiedName: server.qualifiedName,
            name: serverDetails.displayName || server.qualifiedName,
            url: serverDetails.deploymentUrl || '',
            enabled: false,
            isDeployed: false,
            description: serverDetails.description,
            config: server.config
          });
          
          console.log(`Added disabled MCP server to list: ${server.qualifiedName}`);
        }
      } catch (error) {
        console.error(`Error processing MCP server ${server.qualifiedName}:`, error);
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
        await multi.connectAll(transports);
        console.log('Connected to MCP servers successfully');
        
        // Initialize adapters
        openaiAdapter = new OpenAIChatAdapter(multi);
        anthropicAdapter = new AnthropicChatAdapter(multi);
        
        return multi;
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
 * Get an MCP client, creating a new instance each time
 */
export async function getMCPClient(): Promise<MultiClient | null> {
  // Since globalClient is now a const null, always initialize
  return initializeMCPServers();
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
      // Update the server status in memory
      enabledServers[serverIndex] = {
        ...enabledServers[serverIndex],
        enabled,
        isDeployed: enabled
      };
      
      // Update the server status via API
      const response = await fetch(getApiUrl('/api/mcp-servers'), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ qualifiedName, enabled })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error(`API error updating server status: ${errorData.error || 'Unknown error'}`);
        return false;
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