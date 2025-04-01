'use server';

import { cookies } from 'next/headers';
import { kv } from '@/lib/kv-provider';

// Define interfaces for Smithery API responses
export interface SmitheryServer {
  qualifiedName: string;
  displayName: string;
  description: string;
  homepage: string;
  useCount: string;
  isDeployed: boolean;
  createdAt: string;
  owner?: string;
  repo?: string;
}

// Define the ConfigSchema type explicitly to avoid 'any'
export interface ConfigSchema {
  type: string;
  properties?: Record<string, unknown>;
  required?: string[];
  [key: string]: unknown;
}

export interface SmitheryServerDetail {
  qualifiedName: string;
  displayName: string;
  deploymentUrl: string;
  connections: Array<{
    type: string;
    url?: string;
    configSchema: ConfigSchema;
  }>;
}

export interface SmitheryPagination {
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
}

export interface SmitheryServersResponse {
  servers: SmitheryServer[];
  pagination: SmitheryPagination;
}

// Define the ServerConfig type
export interface ServerConfig {
  apiKey?: string;
  [key: string]: unknown;
}

// Constant for registry API base URL
const REGISTRY_API_BASE_URL = 'https://registry.smithery.ai';

/**
 * Get the Smithery API key from environment or cookies
 */
export async function getSmitheryApiKey(): Promise<string> {
  // Try to get from server-side env first
  const apiKey = process.env.SMITHERY_API_KEY || '';
  
  if (apiKey) {
    return apiKey;
  }
  
  // Try to get from cookies as fallback
  const cookieStore = await cookies();
  return cookieStore.get('smithery-api-key')?.value || '';
}

/**
 * Fetch a list of available MCP servers from Smithery Registry
 */
export async function fetchMCPServers(
  query: string = '',
  page: number = 1,
  pageSize: number = 10
): Promise<SmitheryServersResponse> {
  const apiKey = await getSmitheryApiKey();
  
  if (!apiKey) {
    throw new Error('Smithery API key not found. Please configure it in the settings.');
  }
  
  const queryParams = new URLSearchParams({
    q: query,
    page: page.toString(),
    pageSize: pageSize.toString()
  });
  
  try {
    const response = await fetch(`${REGISTRY_API_BASE_URL}/servers?${queryParams.toString()}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch MCP servers: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    return data as SmitheryServersResponse;
  } catch (error) {
    console.error('Error fetching MCP servers:', error);
    throw error;
  }
}

/**
 * Fetch details for a specific MCP server by its qualified name
 */
export async function fetchMCPServerDetails(qualifiedName: string): Promise<SmitheryServerDetail> {
  const apiKey = await getSmitheryApiKey();
  
  if (!apiKey) {
    throw new Error('Smithery API key not found. Please configure it in the settings.');
  }
  
  try {
    const response = await fetch(`${REGISTRY_API_BASE_URL}/servers/${qualifiedName}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch MCP server details: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    return data as SmitheryServerDetail;
  } catch (error) {
    console.error(`Error fetching MCP server details for ${qualifiedName}:`, error);
    throw error;
  }
}

/**
 * Get the WebSocket URL for a server with the proper configuration
 */
export async function createSmitheryWebSocketUrl(serverUrl: string, config: ServerConfig): Promise<string> {
  // Make sure the URL has the correct protocol (ws:// or wss://)
  if (!serverUrl.startsWith('ws://') && !serverUrl.startsWith('wss://')) {
    // Convert http/https to ws/wss
    if (serverUrl.startsWith('http://')) {
      serverUrl = serverUrl.replace('http://', 'ws://');
    } else if (serverUrl.startsWith('https://')) {
      serverUrl = serverUrl.replace('https://', 'wss://');
    } else {
      // If no protocol specified, default to wss://
      serverUrl = `wss://${serverUrl}`;
    }
  }
  
  const configBase64 = Buffer.from(JSON.stringify(config)).toString('base64');
  return `${serverUrl}?config=${configBase64}`;
}

/**
 * Check if a server is installed/configured locally
 */
export async function isServerInstalled(qualifiedName: string): Promise<boolean> {
  // In a real implementation, this would check a database or config file
  // to see if this server has been installed/configured
  
  // For now, we'll use cookies as a simple storage mechanism
  const cookieStore = await cookies();
  const installedServers = cookieStore.get('installed-mcp-servers')?.value;
  
  if (!installedServers) {
    return false;
  }
  
  try {
    const serversArray = JSON.parse(installedServers) as string[];
    return serversArray.includes(qualifiedName);
  } catch (error) {
    console.error('Error parsing installed servers:', error);
    return false;
  }
}

/**
 * Install/configure a server locally
 */
export async function installServer(
  qualifiedName: string, 
  serverConfig: ServerConfig
): Promise<boolean> {
  // In a real implementation, this would store the server config in a database
  // or configuration file
  
  try {
    // For now, we'll use cookies as a simple storage mechanism
    const cookieStore = await cookies();
    const installedServers = cookieStore.get('installed-mcp-servers')?.value;
    
    let serversArray: string[] = [];
    
    if (installedServers) {
      try {
        serversArray = JSON.parse(installedServers) as string[];
      } catch (error) {
        console.error('Error parsing installed servers:', error);
      }
    }
    
    if (!serversArray.includes(qualifiedName)) {
      serversArray.push(qualifiedName);
    }
    
    // Store the updated list of installed servers
    cookieStore.set('installed-mcp-servers', JSON.stringify(serversArray));
    
    // Store the server config
    cookieStore.set(`mcp-server-config-${qualifiedName}`, JSON.stringify(serverConfig));
    
    // Store in KV for better persistence
    // Default to enabled when installed
    const config = {
      ...serverConfig,
      enabled: true
    };
    
    // Store server config in KV
    await kv.set(`mcp-server-config-${qualifiedName}`, config);
    
    // Get server details from the registry
    try {
      const serverDetails = await fetchMCPServerDetails(qualifiedName);
      
      // Store server details in KV
      await kv.set(`mcp-server-${qualifiedName}`, serverDetails);
      
      console.log(`Stored details for server ${qualifiedName}`);
    } catch (detailsError) {
      console.error(`Error fetching server details for ${qualifiedName}:`, detailsError);
    }
    
    return true;
  } catch (error) {
    console.error('Error installing server:', error);
    return false;
  }
}

/**
 * Uninstall/remove a server configuration
 */
export async function uninstallServer(qualifiedName: string): Promise<boolean> {
  // In a real implementation, this would remove the server config from a database
  // or configuration file
  
  try {
    // For now, we'll use cookies as a simple storage mechanism
    const cookieStore = await cookies();
    const installedServers = cookieStore.get('installed-mcp-servers')?.value;
    
    if (!installedServers) {
      return true; // Already not installed
    }
    
    try {
      let serversArray = JSON.parse(installedServers) as string[];
      serversArray = serversArray.filter(server => server !== qualifiedName);
      
      // Update the list of installed servers
      cookieStore.set('installed-mcp-servers', JSON.stringify(serversArray));
      
      // Remove the server config
      cookieStore.delete(`mcp-server-config-${qualifiedName}`);
      
      // Also remove from KV storage - fix type issue with delete operation
      await kv.set(`mcp-server-config-${qualifiedName}`, null);
      await kv.set(`mcp-server-${qualifiedName}`, null);
      
      return true;
    } catch (error) {
      console.error('Error uninstalling server:', error);
      return false;
    }
  } catch (error) {
    console.error('Error accessing cookies:', error);
    return false;
  }
}

/**
 * Get all installed servers with their configurations
 */
export async function getInstalledServers(): Promise<{qualifiedName: string, config: ServerConfig}[]> {
  // In a real implementation, this would get server configs from a database
  // or configuration file
  
  // For now, we'll use cookies as a simple storage mechanism
  const cookieStore = await cookies();
  const installedServers = cookieStore.get('installed-mcp-servers')?.value;
  
  if (!installedServers) {
    return [];
  }
  
  try {
    const serversArray = JSON.parse(installedServers) as string[];
    
    const serverConfigs = await Promise.all(serversArray.map(async (qualifiedName) => {
      const config = cookieStore.get(`mcp-server-config-${qualifiedName}`)?.value || '{}';
      try {
        return {
          qualifiedName,
          config: JSON.parse(config) as ServerConfig
        };
      } catch {
        return {
          qualifiedName,
          config: {} as ServerConfig
        };
      }
    }));
    
    return serverConfigs;
  } catch (error) {
    console.error('Error getting installed servers:', error);
    return [];
  }
} 