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
    deploymentUrl?: string;
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
  enabled?: boolean;
  // Server metadata fields
  description?: string;
  homepage?: string;
  useCount?: string;
  createdAt?: string;
  owner?: string;
  repo?: string;
  // Allow any other properties
  [key: string]: unknown;
}

// Define interface for server data returned from API
interface APIServerResponse {
  qualifiedName: string;
  config: ServerConfig;
  enabled: boolean;
  name?: string;
  url?: string;
  [key: string]: unknown;
}

// Constant for registry API base URL
const REGISTRY_API_BASE_URL = 'https://registry.smithery.ai';

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
  if (!serverUrl) {
    throw new Error('Server URL is required to create WebSocket URL');
  }
  
  console.log(`Creating WebSocket URL from: ${serverUrl}`);
  
  // Make sure the URL has the correct protocol (ws:// or wss://)
  let wsUrl = serverUrl;
  
  // The URL must start with ws:// or wss:// for WebSocket connections
  if (!wsUrl.startsWith('ws://') && !wsUrl.startsWith('wss://')) {
    // Convert http/https to ws/wss
    if (wsUrl.startsWith('http://')) {
      wsUrl = wsUrl.replace('http://', 'ws://');
    } else if (wsUrl.startsWith('https://')) {
      wsUrl = wsUrl.replace('https://', 'wss://');
    } else {
      // If no protocol specified, default to wss://
      wsUrl = `wss://${wsUrl}`;
    }
  }
  
  // Encode the config as a base64 string
  const configBase64 = Buffer.from(JSON.stringify(config)).toString('base64');
  
  const finalUrl = `${wsUrl}?config=${configBase64}`;
  console.log(`Created WebSocket URL: ${finalUrl}`);
  
  return finalUrl;
}

/**
 * Check if a server is installed/configured locally
 */
export async function isServerInstalled(qualifiedName: string): Promise<boolean> {
  try {
    // Fetch server list from API
    const response = await fetch(getApiUrl('/api/mcp-servers'));
    if (!response.ok) {
      throw new Error('Failed to check server installation status');
    }
    
    const data = await response.json() as { servers: APIServerResponse[] };
    return data.servers.some((server) => server.qualifiedName === qualifiedName);
  } catch (error) {
    console.error('Error checking if server is installed:', error);
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
  console.log("=== START: Installing server ===", qualifiedName, serverConfig);
  try {
    // Set default to enabled when installed
    const config = {
      ...serverConfig,
      enabled: true
    };
    
    // Get server details from the registry for name and URL
    let name = qualifiedName;
    let url = '';
    let serverDetails: SmitheryServerDetail | undefined;
    
    try {
      // Fetch full details from the registry API
      console.log("Fetching server details from registry API");
      serverDetails = await fetchMCPServerDetails(qualifiedName);
      name = serverDetails.displayName || qualifiedName;
      url = serverDetails.deploymentUrl || '';
      
      // Store server details in KV for quick access during runtime
      await kv.set(`mcp-server-${qualifiedName}`, serverDetails);
      
      console.log(`Stored details for server ${qualifiedName}`, {
        name,
        url,
        config
      });
    } catch (detailsError) {
      console.error(`Error fetching server details for ${qualifiedName}:`, detailsError);
    }
    
    // Get additional server info for persistent storage
    try {
      console.log("Fetching additional server info");
      const servers = await fetchMCPServers(`id:${qualifiedName}`, 1, 1);
      if (servers.servers.length > 0) {
        const serverInfo = servers.servers[0];
        
        // Add more complete server info to the config
        if (!config.description && serverInfo.description) {
          config.description = serverInfo.description;
        }
        if (!config.homepage && serverInfo.homepage) {
          config.homepage = serverInfo.homepage;
        }
        if (!config.useCount && serverInfo.useCount) {
          config.useCount = serverInfo.useCount;
        }
        if (!config.createdAt && serverInfo.createdAt) {
          config.createdAt = serverInfo.createdAt;
        }
        if (!config.owner && serverInfo.owner) {
          config.owner = serverInfo.owner;
        }
        if (!config.repo && serverInfo.repo) {
          config.repo = serverInfo.repo;
        }
        
        console.log(`Added additional details for server ${qualifiedName} from registry listing`);
      }
    } catch (infoError) {
      console.error(`Error fetching additional server info for ${qualifiedName}:`, infoError);
    }
    
    // Call the API to save the server configuration
    console.log("Saving server via API:", qualifiedName, config, name, url);
    try {
      const apiUrl = getApiUrl('/api/mcp-servers');
      console.log("Using API URL:", apiUrl);
      
      const payload = {
        qualifiedName,
        config,
        enabled: true,
        name,
        url,
        serverDetails
      };
      console.log("API request payload:", JSON.stringify(payload));
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API error (${response.status} ${response.statusText}):`, errorText);
        return false;
      }
      
      const responseData = await response.json();
      console.log("API response:", responseData);
      
      console.log(`Successfully installed server ${qualifiedName}`);
      console.log("=== END: Installing server ===", qualifiedName, "result: true");
      
      return true;
    } catch (apiError) {
      console.error("API request error:", apiError);
      console.log("=== END: Installing server with API ERROR ===", qualifiedName);
      return false;
    }
  } catch (error) {
    console.error('Error installing server:', error);
    console.log("=== END: Installing server with ERROR ===", qualifiedName);
    return false;
  }
}

/**
 * Uninstall/remove a server configuration
 */
export async function uninstallServer(qualifiedName: string): Promise<boolean> {
  try {
    // Remove from KV storage
    await kv.set(`mcp-server-${qualifiedName}`, null);
    
    // Remove the server via API
    const response = await fetch(getApiUrl(`/api/mcp-servers?qualifiedName=${encodeURIComponent(qualifiedName)}`), {
      method: 'DELETE'
    });
    
    return response.ok;
  } catch (error) {
    console.error('Error uninstalling server:', error);
    return false;
  }
}

/**
 * Get all installed servers with their configurations
 */
export async function getInstalledServers(): Promise<{
  qualifiedName: string, 
  config: ServerConfig & { url?: string, name?: string }
}[]> {
  try {
    // Fetch server list from API
    const response = await fetch(getApiUrl('/api/mcp-servers'));
    if (!response.ok) {
      throw new Error('Failed to fetch installed servers');
    }
    
    const data = await response.json() as { servers: APIServerResponse[] };
    
    // Map to the expected format
    return data.servers.map((server) => ({
      qualifiedName: server.qualifiedName,
      config: {
        ...server.config,
        enabled: server.enabled,
        url: server.url || undefined,
        name: server.name || server.qualifiedName
      }
    }));
  } catch (error) {
    console.error('Error getting installed servers:', error);
    return [];
  }
} 