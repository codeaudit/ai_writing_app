import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { ServerConfig, SmitheryServerDetail } from './smithery-service';

// Base directory for the vault
const VAULT_DIR = path.join(process.cwd(), 'vault');
const SYSTEM_DIR = path.join(VAULT_DIR, 'system');
const MCP_SERVERS_FILE = path.join(SYSTEM_DIR, 'mcp-servers.md');

// Type for MCP server data stored in the markdown file
export interface StoredMCPServer {
  qualifiedName: string;
  config: ServerConfig;
  enabled: boolean;
  name?: string;
  url?: string;
  description?: string;
  homepage?: string;
  useCount?: string;
  createdAt?: string;
  owner?: string;
  repo?: string;
  deploymentUrl?: string;
  connections?: Array<{
    type: string;
    url?: string;
    deploymentUrl?: string;
    configSchema?: Record<string, unknown>;
  }>;
  // Allow storing any additional fields
  [key: string]: unknown;
}

/**
 * Ensure the system directory exists
 */
const ensureSystemDirectory = () => {
  try {
    // Make sure the vault directory exists first
    if (!fs.existsSync(VAULT_DIR)) {
      console.log(`Creating vault directory at ${VAULT_DIR}`);
      fs.mkdirSync(VAULT_DIR, { recursive: true });
    }
    
    // Then make sure the system directory exists
    if (!fs.existsSync(SYSTEM_DIR)) {
      console.log(`Creating system directory at ${SYSTEM_DIR}`);
      fs.mkdirSync(SYSTEM_DIR, { recursive: true });
    }
    
    console.log(`Directory structure verified: ${SYSTEM_DIR}`);
  } catch (error) {
    console.error('Error ensuring system directory:', error);
    throw new Error(`Failed to create necessary directories: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Initialize the MCP servers file if it doesn't exist
 */
const initMCPServersFile = () => {
  try {
    // Ensure directories exist
    ensureSystemDirectory();
    
    // Check if file exists
    if (!fs.existsSync(MCP_SERVERS_FILE)) {
      console.log(`Creating new MCP servers file at ${MCP_SERVERS_FILE}`);
      
      // Create markdown file with an embedded YAML block
      const content = `# MCP Servers Configuration

This file contains configuration for installed MCP servers.

\`\`\`yaml
servers: []
\`\`\`
`;
      try {
        fs.writeFileSync(MCP_SERVERS_FILE, content, 'utf8');
        console.log(`Successfully created MCP servers file`);
      } catch (writeError) {
        console.error(`Error writing MCP servers file: ${writeError instanceof Error ? writeError.message : 'Unknown error'}`);
        throw writeError;
      }
    } else {
      console.log(`MCP servers file already exists at ${MCP_SERVERS_FILE}`);
    }
  } catch (error) {
    console.error('Error initializing MCP servers file:', error);
    throw new Error(`Failed to initialize MCP servers file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Extract YAML content from the markdown file
 */
const extractYamlFromMarkdown = (fileContent: string): string => {
  // Try to extract embedded YAML block first
  const yamlRegex = /```(?:yaml|yml)\n([\s\S]*?)\n```/;
  const match = fileContent.match(yamlRegex);
  
  if (match && match[1]) {
    console.log("Found embedded YAML format");
    return match[1];
  }
  
  // If not found, check for frontmatter format
  const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
  const frontmatterMatch = fileContent.match(frontmatterRegex);
  
  if (frontmatterMatch && frontmatterMatch[1]) {
    console.log("Found frontmatter YAML format - will convert to embedded format on next save");
    return frontmatterMatch[1];
  }
  
  console.log("No valid YAML found, using empty default");
  // Return empty YAML if not found
  return 'servers: []';
};

/**
 * Create markdown with embedded YAML
 */
const createMarkdownWithYaml = (yamlContent: string): string => {
  return `# MCP Servers Configuration

This file contains configuration for installed MCP servers.

\`\`\`yaml
${yamlContent}
\`\`\`
`;
};

/**
 * Load the MCP servers from the markdown file
 */
export async function loadMCPServersFromFile(): Promise<StoredMCPServer[]> {
  console.log("Loading MCP servers from file");
  try {
    // Initialize the file if it doesn't exist
    initMCPServersFile();
    
    try {
      // Read the file content
      const fileContent = fs.readFileSync(MCP_SERVERS_FILE, 'utf8');
      console.log(`Read ${fileContent.length} characters from file`);
      
      // Extract YAML content
      const yamlContent = extractYamlFromMarkdown(fileContent);
      
      try {
        // Parse YAML content
        const data = yaml.load(yamlContent) as { servers: StoredMCPServer[] };
        
        // Return the servers array from the YAML
        const servers = Array.isArray(data?.servers) ? data.servers : [];
        console.log(`Loaded ${servers.length} servers from file`);
        return servers;
      } catch (yamlError) {
        console.error('Error parsing YAML content:', yamlError);
        return [];
      }
    } catch (readError) {
      console.error('Error reading MCP servers file:', readError);
      return [];
    }
  } catch (error) {
    console.error('Error loading MCP servers from file:', error);
    return [];
  }
}

/**
 * Save the MCP servers to the markdown file
 */
export async function saveMCPServersToFile(servers: StoredMCPServer[]): Promise<boolean> {
  console.log(`Attempting to save ${servers.length} servers to file at ${MCP_SERVERS_FILE}`);
  
  try {
    ensureSystemDirectory();
    console.log("System directory ensured");
    
    const yamlContent = yaml.dump({ servers }, { 
      indent: 2,
      lineWidth: -1, // No line wrapping
      noRefs: true    // Don't use references for repeated content
    });
    
    const fileContent = createMarkdownWithYaml(yamlContent);
    console.log(`Created markdown content with ${fileContent.length} characters`);
    
    try {
      fs.writeFileSync(MCP_SERVERS_FILE, fileContent, 'utf8');
      console.log(`Successfully wrote ${fileContent.length} characters to file`);
      return true;
    } catch (writeError) {
      console.error("Error writing to file:", writeError);
      return false;
    }
  } catch (error) {
    console.error('Error saving MCP servers to file:', error);
    return false;
  }
}

/**
 * Add or update a server in the MCP servers file
 */
export async function saveMCPServer(
  qualifiedName: string,
  config: ServerConfig,
  enabled: boolean = true,
  name?: string,
  url?: string,
  serverDetails?: SmitheryServerDetail
): Promise<boolean> {
  console.log("=== saveMCPServer called ===", {
    qualifiedName,
    config,
    enabled,
    name,
    url
  });
  
  try {
    // Load existing servers
    const servers = await loadMCPServersFromFile();
    console.log(`Found ${servers.length} existing servers in file`);
    
    // Find if this server already exists
    const existingIndex = servers.findIndex(s => s.qualifiedName === qualifiedName);
    console.log(`Server exists: ${existingIndex >= 0}`);
    
    // Create the server object with all available details
    const serverData: StoredMCPServer = {
      qualifiedName,
      config: {
        ...config,
        // Make sure URL is also in the config
        url: url || config.url
      },
      enabled,
      ...(name && { name }),
      ...(url && { url }),
    };

    // Add all details from serverDetails if available
    if (serverDetails) {
      serverData.name = serverDetails.displayName || name || qualifiedName;
      serverData.deploymentUrl = serverDetails.deploymentUrl || url;
      serverData.connections = serverDetails.connections;
    }
    
    console.log(`Saving MCP server ${qualifiedName} to file:`, JSON.stringify(serverData, null, 2));
    
    // Update or add the server
    if (existingIndex >= 0) {
      servers[existingIndex] = serverData;
      console.log(`Updated existing server at index ${existingIndex}`);
    } else {
      servers.push(serverData);
      console.log(`Added new server, total count: ${servers.length}`);
    }
    
    // Save the updated servers list
    console.log("Saving servers to file...");
    const saveResult = await saveMCPServersToFile(servers);
    console.log(`File save result: ${saveResult}`);
    
    return saveResult;
  } catch (error) {
    console.error('Error saving MCP server:', error);
    return false;
  }
}

/**
 * Remove a server from the MCP servers file
 */
export async function removeMCPServer(qualifiedName: string): Promise<boolean> {
  try {
    // Load existing servers
    const servers = await loadMCPServersFromFile();
    
    // Filter out the server to remove
    const updatedServers = servers.filter(s => s.qualifiedName !== qualifiedName);
    
    // If no change in length, server wasn't found
    if (updatedServers.length === servers.length) {
      return true; // Server wasn't installed, consider it a success
    }
    
    // Save the updated servers list
    return await saveMCPServersToFile(updatedServers);
  } catch (error) {
    console.error('Error removing MCP server:', error);
    return false;
  }
}

/**
 * Get a specific server from the MCP servers file
 */
export async function getMCPServer(qualifiedName: string): Promise<StoredMCPServer | null> {
  try {
    // Load existing servers
    const servers = await loadMCPServersFromFile();
    
    // Find the server
    const server = servers.find(s => s.qualifiedName === qualifiedName);
    
    return server || null;
  } catch (error) {
    console.error('Error getting MCP server:', error);
    return null;
  }
}

/**
 * Update the enabled status of a server
 */
export async function updateMCPServerEnabledStatus(
  qualifiedName: string,
  enabled: boolean
): Promise<boolean> {
  try {
    // Load existing servers
    const servers = await loadMCPServersFromFile();
    
    // Find the server
    const serverIndex = servers.findIndex(s => s.qualifiedName === qualifiedName);
    
    if (serverIndex === -1) {
      console.error(`Server not found for enabling/disabling: ${qualifiedName}`);
      return false; // Server not found
    }
    
    // Update the enabled status
    servers[serverIndex].enabled = enabled;
    
    console.log(`Updated server ${qualifiedName} enabled status to ${enabled}`, servers[serverIndex]);
    
    // Save the updated servers list
    return await saveMCPServersToFile(servers);
  } catch (error) {
    console.error('Error updating MCP server enabled status:', error);
    return false;
  }
}

/**
 * Check if a server is installed
 */
export async function isMCPServerInstalled(qualifiedName: string): Promise<boolean> {
  try {
    const server = await getMCPServer(qualifiedName);
    return server !== null;
  } catch (error) {
    console.error('Error checking if MCP server is installed:', error);
    return false;
  }
}

/**
 * Debug function to print the current contents of the MCP servers file
 */
export async function debugMCPServersFile(): Promise<void> {
  try {
    console.log('MCP Servers File Path:', MCP_SERVERS_FILE);
    
    if (fs.existsSync(MCP_SERVERS_FILE)) {
      const fileContent = fs.readFileSync(MCP_SERVERS_FILE, 'utf8');
      console.log('MCP Servers File Raw Content:');
      console.log(fileContent);
      
      const yamlContent = extractYamlFromMarkdown(fileContent);
      const data = yaml.load(yamlContent) as { servers: StoredMCPServer[] };
      
      console.log('Parsed YAML Content:');
      console.log(JSON.stringify(data, null, 2));
      
      if (Array.isArray(data?.servers)) {
        console.log(`Found ${data.servers.length} servers in the file`);
        
        data.servers.forEach((server, index) => {
          console.log(`Server #${index + 1}:`, JSON.stringify(server, null, 2));
        });
      } else {
        console.log('No servers array found in the file');
      }
    } else {
      console.log('MCP Servers file does not exist yet');
    }
  } catch (error) {
    console.error('Error debugging MCP servers file:', error);
  }
} 