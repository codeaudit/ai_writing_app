import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Search, ExternalLink, Download, RefreshCw, ArrowDownToLine, Trash2 } from 'lucide-react';
import { 
  fetchMCPServers, 
  fetchMCPServerDetails, 
  installServer as installMCPServer,
  uninstallServer as uninstallMCPServer,
  getInstalledServers,
  ConfigSchema,
  ServerConfig
} from '@/lib/smithery-service';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Link from 'next/link';
import { updateMCPServerStatus } from '@/lib/mcp-server-manager';

// Simple spinner component since we don't have a dedicated ui/spinner
const Spinner = () => (
  <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-current border-e-transparent" role="status">
    <span className="sr-only">Loading...</span>
  </div>
);

interface MCPCategory {
  id: string;
  name: string;
  count: number;
}

interface MCPServerVM {
  qualifiedName: string;
  name: string;
  description: string;
  homepage: string;
  downloads: number;
  owner: string;
  repo: string;
  enabled: boolean;
  installed: boolean;
  isDeployed: boolean;
  configSchema?: ConfigSchema;
  apiKey?: string;
  // Allow additional properties from the stored server data
  [key: string]: unknown;
}

export function MCPSettings() {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [servers, setServers] = useState<MCPServerVM[]>([]);
  const [installedServers, setInstalledServers] = useState<MCPServerVM[]>([]);
  const [categories] = useState<MCPCategory[]>([
    { id: 'all', name: 'All Categories', count: 0 },
    { id: 'is:deployed', name: 'Deployed', count: 0 },
    { id: 'web-search', name: 'Web Search', count: 0 },
    { id: 'creative', name: 'Creative', count: 0 },
    { id: 'tools', name: 'Tools', count: 0 },
  ]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedServer, setSelectedServer] = useState<MCPServerVM | null>(null);
  const [installDialogOpen, setInstallDialogOpen] = useState(false);
  const [installLoading, setInstallLoading] = useState(false);
  const [serverConfig, setServerConfig] = useState<Record<string, string>>({});
  const [apiKeyField, setApiKeyField] = useState('');

  const fetchServersWithInstallStatus = async (query: string = '', category: string = 'all', page: number = 1) => {
    setLoading(true);
    
    try {
      // Create the full query by combining search term and category filter
      let fullQuery = query;
      if (category !== 'all' && !query.includes(category)) {
        fullQuery = category + (query ? ' ' + query : '');
      }
      
      // Get servers from the Smithery Registry API
      const data = await fetchMCPServers(fullQuery, page, pageSize);
      
      // Get the list of installed servers
      const installedServersList = await getInstalledServers();
      const installedServerIds = installedServersList.map(s => s.qualifiedName);
      
      // Map the servers to our view model
      const mappedServers = await Promise.all(data.servers.map(async (server) => {
        const isInstalled = installedServerIds.includes(server.qualifiedName);
        
        // Parse owner and repo from qualifiedName if possible
        let owner = '';
        let repo = '';
        
        if (server.qualifiedName.includes('/')) {
          const parts = server.qualifiedName.split('/');
          owner = parts[0];
          repo = parts[1];
        }
        
        return {
          qualifiedName: server.qualifiedName,
          name: server.displayName,
          description: server.description,
          homepage: server.homepage,
          downloads: parseInt(server.useCount, 10) || 0,
          owner: owner,
          repo: repo,
          enabled: isInstalled, // Assume it's enabled if installed
          installed: isInstalled,
          isDeployed: server.isDeployed
        };
      }));
      
      // Update pagination information
      setTotalPages(data.pagination.totalPages);
      setTotalCount(data.pagination.totalCount);
      setCurrentPage(data.pagination.currentPage);
      
      // Set the servers list - keep all servers in state for reference
      setServers(mappedServers);
      
      // Update installed servers list
      loadInstalledServers();
    } catch (error) {
      console.error('Error fetching MCP servers:', error);
      toast.error('Failed to fetch MCP servers. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const loadInstalledServers = async () => {
    try {
      const installedServersList = await getInstalledServers();
      
      // Fetch details for each installed server
      const installedServerDetails = await Promise.all(
        installedServersList.map(async ({ qualifiedName, config }) => {
          try {
            // Try to get server details from Registry API
            const details = await fetchMCPServerDetails(qualifiedName);
            
            // Parse owner and repo from qualifiedName if possible
            let owner = '';
            let repo = '';
            
            if (qualifiedName.includes('/')) {
              const parts = qualifiedName.split('/');
              owner = parts[0];
              repo = parts[1];
            }
            
            return {
              qualifiedName,
              name: details.displayName || config.name || qualifiedName,
              description: typeof config.description === 'string' ? config.description : '',
              homepage: details.deploymentUrl || config.url || '',
              downloads: typeof config.useCount === 'string' ? parseInt(config.useCount, 10) : 0,
              owner: typeof config.owner === 'string' ? config.owner : owner,
              repo: typeof config.repo === 'string' ? config.repo : repo,
              enabled: config.enabled === true,
              installed: true,
              isDeployed: true,
              configSchema: details.connections?.[0]?.configSchema,
              apiKey: config.apiKey,
              // Store all additional details from config
              ...config
            };
          } catch (error) {
            console.error(`Error fetching details for ${qualifiedName}:`, error);
            // If Registry API fails, use the data stored in the local file
            return {
              qualifiedName,
              name: config.name || qualifiedName,
              description: typeof config.description === 'string' ? config.description : 'No description available',
              homepage: config.url || '',
              downloads: typeof config.useCount === 'string' ? parseInt(config.useCount, 10) : 0,
              owner: typeof config.owner === 'string' ? config.owner : '',
              repo: typeof config.repo === 'string' ? config.repo : '',
              enabled: config.enabled === true,
              installed: true,
              isDeployed: !!config.url,
              apiKey: config.apiKey,
              // Store all additional details from config
              ...config
            };
          }
        })
      );
      
      setInstalledServers(installedServerDetails);
    } catch (error) {
      console.error('Error loading installed servers:', error);
      toast.error('Failed to load installed servers. Please try again later.');
    }
  };

  const handleInstallClick = async (server: MCPServerVM) => {
    setSelectedServer(server);
    setApiKeyField('');
    setServerConfig({});
    
    try {
      // Fetch detailed server information to get the configuration schema
      const details = await fetchMCPServerDetails(server.qualifiedName);
      const schema = details.connections[0]?.configSchema;
      
      // If there's a schema, initialize form state based on schema properties
      if (schema && schema.properties) {
        const initialConfig: Record<string, string> = {};
        
        // Initialize from schema defaults
        Object.entries(schema.properties).forEach(([key, prop]) => {
          // Skip apiKey as we handle it separately
          if (key !== 'apiKey' && typeof prop === 'object' && prop !== null && 'default' in prop) {
            initialConfig[key] = String(prop.default || '');
          }
        });
        
        setServerConfig(initialConfig);
      }
      
      // Set server with details
      setSelectedServer({
        ...server,
        details,
        configSchema: schema
      });
      
      setInstallDialogOpen(true);
    } catch (error) {
      console.error('Error fetching server details:', error);
      toast.error('Failed to fetch server details. Please try again.');
    }
  };

  const handleInstallServer = async () => {
    console.log("Install button clicked, selectedServer:", selectedServer);
    if (!selectedServer) {
      console.error("No selected server found!");
      toast.error("Server information is missing. Please try again.");
      return;
    }
    
    setInstallLoading(true);
    console.log("Set loading state to true");
    
    try {
      // Prepare configuration object
      const config: ServerConfig = {
        ...serverConfig
      };
      
      // Add API key if provided
      if (apiKeyField) {
        config.apiKey = apiKeyField;
      }
      
      console.log("Config prepared:", JSON.stringify(config));
      
      // Validate required fields if schema exists
      if (selectedServer.configSchema && selectedServer.configSchema.required) {
        const missingRequired = selectedServer.configSchema.required.filter(field => 
          !config[field] && field !== 'apiKey'
        );
        
        if (missingRequired.length > 0) {
          console.warn("Missing required fields:", missingRequired);
          toast.error(`Missing required fields: ${missingRequired.join(', ')}`);
          setInstallLoading(false);
          return;
        }
      }
      
      // Add complete server information to config for storage
      const enhancedConfig: ServerConfig = { ...config };
      if (typeof selectedServer.description === 'string') enhancedConfig.description = selectedServer.description;
      if (typeof selectedServer.homepage === 'string') enhancedConfig.homepage = selectedServer.homepage;
      if (selectedServer.useCount) enhancedConfig.useCount = String(selectedServer.useCount);
      if (typeof selectedServer.owner === 'string') enhancedConfig.owner = selectedServer.owner;
      if (typeof selectedServer.repo === 'string') enhancedConfig.repo = selectedServer.repo;
      if (typeof selectedServer.createdAt === 'string') enhancedConfig.createdAt = selectedServer.createdAt;
      
      console.log("Starting installation for:", selectedServer.qualifiedName, "with config:", JSON.stringify(enhancedConfig));
      
      // Perform server installation
      const success = await installMCPServer(selectedServer.qualifiedName, enhancedConfig);
      
      console.log("Installation result:", success);
      
      if (success) {
        toast.success(`${selectedServer.name} server installed successfully`);
        setInstallDialogOpen(false);
        // Refresh lists
        await loadInstalledServers();
        await fetchServersWithInstallStatus(searchQuery, activeCategory, currentPage);
      } else {
        toast.error(`Failed to install ${selectedServer.name} server. Please check console for details.`);
      }
    } catch (error) {
      console.error('Error installing server:', error);
      toast.error(`Failed to install ${selectedServer.name} server. Please check console for details.`);
    } finally {
      setInstallLoading(false);
      console.log("Install operation completed, loading state reset");
    }
  };

  const handleUninstallServer = async (server: MCPServerVM) => {
    try {
      await uninstallMCPServer(server.qualifiedName);
      
      // Refresh the list of installed servers
      await loadInstalledServers();
      
      // Refresh the main server list with updated install status
      fetchServersWithInstallStatus(searchQuery, activeCategory, currentPage);
      
      toast.success(`${server.name} has been uninstalled successfully.`);
    } catch (error) {
      console.error('Error uninstalling MCP server:', error);
      toast.error(`Failed to uninstall ${server.name}. Please try again later.`);
    }
  };

  const toggleServerEnabled = async (server: MCPServerVM) => {
    // Toggle the enabled state
    const newEnabledState = !server.enabled;
    
    try {
      // Update the server status in the MCP server manager
      await updateMCPServerStatus(server.qualifiedName, newEnabledState);
      
      // Update the UI state
      if (server.installed) {
        const updatedInstalledServers = installedServers.map(s => 
          s.qualifiedName === server.qualifiedName ? 
            { ...s, enabled: newEnabledState, isDeployed: newEnabledState } : s
        );
        setInstalledServers(updatedInstalledServers);
      }
      
      const updatedServers = servers.map(s => 
        s.qualifiedName === server.qualifiedName ? 
          { ...s, enabled: newEnabledState, isDeployed: newEnabledState } : s
      );
      setServers(updatedServers);
      
      toast.success(`${server.name} has been ${newEnabledState ? 'enabled' : 'disabled'}.`);
    } catch (error) {
      console.error(`Error updating server status for ${server.qualifiedName}:`, error);
      toast.error(`Failed to ${newEnabledState ? 'enable' : 'disable'} ${server.name}. Please try again.`);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchServersWithInstallStatus();
    loadInstalledServers();
  }, []);

  // Handle search and category changes
  useEffect(() => {
    fetchServersWithInstallStatus(searchQuery, activeCategory, 1);
  }, [searchQuery, activeCategory]);

  // Render MCP server card
  const renderServerCard = (server: MCPServerVM, isInstalledView: boolean = false) => (
    <Card key={server.qualifiedName} className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-bold">{server.name}</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {server.owner}/{server.repo}
            </CardDescription>
          </div>
          <div className="flex space-x-1">
            {server.isDeployed && (
              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                Deployed
              </Badge>
            )}
            {server.installed && (
              <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                Installed
              </Badge>
            )}
            {server.installed && !server.enabled && (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                Disabled
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{server.description}</p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center">
            <Download className="h-3 w-3 mr-1" />
            <span>{server.downloads.toLocaleString()} uses</span>
          </div>
          {isInstalledView && server.installed && (
            <div className="flex items-center">
              <div className="mr-2 text-xs">
                {server.enabled ? 'Enabled' : 'Disabled'}
              </div>
              <Switch 
                checked={server.enabled} 
                onCheckedChange={() => toggleServerEnabled(server)} 
                aria-label={`Toggle ${server.name}`}
              />
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between pt-3 border-t">
        {server.homepage && (
          <Button variant="ghost" size="sm" asChild>
            <Link href={server.homepage} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Details
            </Link>
          </Button>
        )}
        {server.installed ? (
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={() => handleUninstallServer(server)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Uninstall
          </Button>
        ) : (
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => handleInstallClick(server)}
            disabled={server.installed}
            title={`${server.isDeployed ? 'Deployed' : 'Not Deployed'}, ${server.installed ? 'Installed' : 'Not Installed'}`}
          >
            <ArrowDownToLine className="h-4 w-4 mr-2" />
            Install
          </Button>
        )}
      </CardFooter>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">MCP Servers</h1>
        <p className="text-muted-foreground">
          Browse and install Smithery Model Context Protocol (MCP) servers for enhanced AI capabilities.
        </p>
      </div>
      
      <Tabs defaultValue="browse" className="space-y-4">
        <TabsList>
          <TabsTrigger value="browse">Browse</TabsTrigger>
          <TabsTrigger value="installed">Installed ({installedServers.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="browse" className="space-y-4">
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search MCP servers..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" onClick={() => fetchServersWithInstallStatus(searchQuery, activeCategory, currentPage)}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex flex-col space-y-4">
            <div className="flex space-x-2 overflow-x-auto pb-2">
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={activeCategory === category.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveCategory(category.id)}
                >
                  {category.name}
                </Button>
              ))}
            </div>
            
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Spinner />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {servers
                    .filter(server => !server.installed) // Only show servers that aren't installed
                    .map((server) => renderServerCard(server))}
                </div>
                
                {servers.filter(server => !server.installed).length === 0 && !loading && (
                  <div className="text-center p-8 border rounded-lg bg-muted/20">
                    <p className="text-muted-foreground">No uninstalled servers found matching your criteria.</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Servers you&apos;ve already installed are shown in the &quot;Installed&quot; tab.
                    </p>
                  </div>
                )}
                
                {totalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, totalCount)} of {totalCount} servers
                    </p>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === 1}
                        onClick={() => fetchServersWithInstallStatus(searchQuery, activeCategory, currentPage - 1)}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === totalPages}
                        onClick={() => fetchServersWithInstallStatus(searchQuery, activeCategory, currentPage + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="installed" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {installedServers.map((server) => renderServerCard(server, true))}
          </div>
          
          {installedServers.length === 0 && (
            <div className="text-center p-8 border rounded-lg bg-muted/20">
              <p className="text-muted-foreground">No MCP servers installed yet.</p>
              <p className="text-muted-foreground mt-2">Browse available servers and install them to enhance your AI capabilities.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Install Dialog */}
      <Dialog open={installDialogOpen} onOpenChange={(open) => {
        if (!installLoading) {
          setInstallDialogOpen(open);
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              console.log("Form submitted via", e.type);
              handleInstallServer();
            }}
          >
            <DialogHeader>
              <DialogTitle>Install MCP Server</DialogTitle>
              <DialogDescription>
                Configure and install {selectedServer?.name} server to enhance your AI capabilities.
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <div className="space-y-4">
                {/* API Key field always present for simplicity */}
                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key (Optional)</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    value={apiKeyField}
                    onChange={(e) => setApiKeyField(e.target.value)}
                    placeholder="Enter API key if required"
                  />
                  <p className="text-xs text-muted-foreground">
                    Some servers require an API key for authentication.
                  </p>
                </div>
                
                {/* Show additional config fields if schema exists */}
                {selectedServer?.configSchema && selectedServer.configSchema.properties && (
                  <div className="border rounded-md p-4 bg-muted/20">
                    <p className="text-sm mb-4 font-medium">Additional Configuration</p>
                    
                    {Object.entries(selectedServer.configSchema.properties).map(([key, prop]) => {
                      // Skip API key as we handle it separately
                      if (key === 'apiKey') return null;
                      
                      // Only render if prop is an object
                      if (typeof prop !== 'object' || prop === null) return null;
                      
                      const isRequired = selectedServer.configSchema?.required?.includes(key);
                      const description = 'description' in prop ? String(prop.description || '') : '';
                      
                      return (
                        <div key={key} className="space-y-2 mb-4">
                          <Label htmlFor={key} className="flex items-center gap-1">
                            {key}
                            {isRequired && <span className="text-red-500">*</span>}
                          </Label>
                          <Input
                            id={key}
                            value={serverConfig[key] || ''}
                            onChange={(e) => setServerConfig({
                              ...serverConfig,
                              [key]: e.target.value
                            })}
                            placeholder={`Enter ${key}`}
                            required={isRequired}
                          />
                          {description && (
                            <p className="text-xs text-muted-foreground">{description}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                type="button"
                variant="outline" 
                onClick={() => setInstallDialogOpen(false)}
                disabled={installLoading}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={installLoading}
              >
                {installLoading ? <Spinner /> : 'Install Server'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 