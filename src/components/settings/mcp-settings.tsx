import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Search, ExternalLink, Download } from 'lucide-react';

// Simple spinner component since we don't have a dedicated ui/spinner
const Spinner = () => (
  <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-current border-e-transparent" role="status">
    <span className="sr-only">Loading...</span>
  </div>
);

interface MCPServer {
  id: string;
  name: string;
  description: string;
  provider: string;
  downloads: number;
  enabled: boolean;
  apiKey?: string;
  installed: boolean;
}

interface MCPCategory {
  id: string;
  name: string;
  count: number;
}

export function MCPSettings() {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [installedServers, setInstalledServers] = useState<MCPServer[]>([]);
  const [categories, setCategories] = useState<MCPCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState('all');

  // Mock function to fetch MCP servers from Smithery
  const fetchMCPServers = async (query: string = '', category: string = 'all') => {
    setLoading(true);
    
    try {
      // In production, this would be a real API call to Smithery
      // const response = await fetch(`https://api.smithery.ai/servers?query=${query}&category=${category}`);
      // const data = await response.json();
      
      // For demo purposes, we'll use mock data
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
      
      const mockServers: MCPServer[] = [
        {
          id: 'brave-search',
          name: 'Brave Search',
          description: 'Integrate web search and local search capabilities with Brave.',
          provider: '@smithery-ai/brave-search',
          downloads: 121640,
          enabled: false,
          installed: Math.random() > 0.5
        },
        {
          id: 'sequential-thinking',
          name: 'Sequential Thinking',
          description: 'An MCP server implementation that provides a tool for dynamic and reflective problem-solving through a structured thinking process.',
          provider: '@smithery-ai/server-sequential-thinking',
          downloads: 608280,
          enabled: false,
          installed: Math.random() > 0.5
        },
        {
          id: 'github',
          name: 'Github',
          description: 'Access the GitHub API, enabling file operations, repository management, search functionality, and more.',
          provider: '@smithery-ai/github',
          downloads: 191970,
          enabled: false,
          installed: Math.random() > 0.5
        },
        {
          id: 'weather',
          name: 'Weather',
          description: 'Provide real-time weather information and forecasts to your applications.',
          provider: '@turkyden/weather',
          downloads: 3130,
          enabled: false,
          installed: Math.random() > 0.5
        },
        {
          id: 'magic-mcp',
          name: 'Magic MCP',
          description: 'v0 for MCP. Frontend feels like Magic',
          provider: '@21st-dev/magic-mcp',
          downloads: 53650,
          enabled: false,
          installed: Math.random() > 0.5
        }
      ];

      const mockCategories: MCPCategory[] = [
        { id: 'all', name: 'All Categories', count: mockServers.length },
        { id: 'web-search', name: 'Web Search', count: 96 },
        { id: 'browser-automation', name: 'Browser Automation', count: 63 },
        { id: 'memory-management', name: 'Memory Management', count: 43 },
        { id: 'gmail-integration', name: 'Gmail Integration', count: 34 },
        { id: 'weather', name: 'Weather', count: 48 },
      ];
      
      // Filter servers by search query if provided
      let filteredServers = mockServers;
      if (query) {
        filteredServers = mockServers.filter(server => 
          server.name.toLowerCase().includes(query.toLowerCase()) || 
          server.description.toLowerCase().includes(query.toLowerCase()) ||
          server.provider.toLowerCase().includes(query.toLowerCase())
        );
      }
      
      // Filter by category if not 'all'
      if (category !== 'all') {
        filteredServers = filteredServers.filter(server => {
          if (category === 'web-search') {
            return server.id === 'brave-search';
          } else if (category === 'weather') {
            return server.id === 'weather';
          }
          // Add more category filters as needed
          return true;
        });
      }
      
      setServers(filteredServers);
      setCategories(mockCategories);
      
      // Set installed servers
      setInstalledServers(mockServers.filter(server => server.installed));
    } catch (error) {
      console.error('Error fetching MCP servers:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch MCP servers. Please try again later.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const installServer = async (server: MCPServer) => {
    try {
      // In production, this would be a real API call to install the server
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
      
      toast({
        title: 'Success',
        description: `${server.name} has been installed successfully.`,
        variant: 'default'
      });
      
      // Update the server's installed status
      const updatedServers = servers.map(s => 
        s.id === server.id ? { ...s, installed: true } : s
      );
      setServers(updatedServers);
      
      // Add to installed servers
      if (!installedServers.some(s => s.id === server.id)) {
        setInstalledServers([...installedServers, { ...server, installed: true }]);
      }
    } catch (error) {
      console.error('Error installing MCP server:', error);
      toast({
        title: 'Error',
        description: `Failed to install ${server.name}. Please try again later.`,
        variant: 'destructive'
      });
    }
  };

  const uninstallServer = async (server: MCPServer) => {
    try {
      // In production, this would be a real API call to uninstall the server
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
      
      toast({
        title: 'Success',
        description: `${server.name} has been uninstalled successfully.`,
        variant: 'default'
      });
      
      // Update the server's installed status
      const updatedServers = servers.map(s => 
        s.id === server.id ? { ...s, installed: false, enabled: false } : s
      );
      setServers(updatedServers);
      
      // Remove from installed servers
      setInstalledServers(installedServers.filter(s => s.id !== server.id));
    } catch (error) {
      console.error('Error uninstalling MCP server:', error);
      toast({
        title: 'Error',
        description: `Failed to uninstall ${server.name}. Please try again later.`,
        variant: 'destructive'
      });
    }
  };

  const toggleServerEnabled = (server: MCPServer) => {
    const updatedServers = servers.map(s => 
      s.id === server.id ? { ...s, enabled: !s.enabled } : s
    );
    setServers(updatedServers);
    
    const updatedInstalledServers = installedServers.map(s => 
      s.id === server.id ? { ...s, enabled: !s.enabled } : s
    );
    setInstalledServers(updatedInstalledServers);
    
    toast({
      title: 'Success',
      description: `${server.name} has been ${server.enabled ? 'disabled' : 'enabled'}.`,
      variant: 'default'
    });
  };

  const updateApiKey = (server: MCPServer, apiKey: string) => {
    const updatedServers = installedServers.map(s => 
      s.id === server.id ? { ...s, apiKey } : s
    );
    setInstalledServers(updatedServers);
  };

  // Initial data fetch
  useEffect(() => {
    fetchMCPServers();
  }, []);

  // Handle search and category changes
  useEffect(() => {
    fetchMCPServers(searchQuery, activeCategory);
  }, [searchQuery, activeCategory]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">MCP Servers</h2>
        <p className="text-muted-foreground">
          Configure Model Context Protocol (MCP) servers to extend your AI capabilities.
        </p>
      </div>

      <Tabs defaultValue="installed" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="installed">Installed Servers</TabsTrigger>
          <TabsTrigger value="browse">Browse Servers</TabsTrigger>
        </TabsList>
        
        <TabsContent value="installed" className="space-y-4">
          {installedServers.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">No MCP servers installed. Browse available servers to get started.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {installedServers.map(server => (
                <Card key={server.id} className="overflow-hidden">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {server.name}
                          <Badge variant={server.enabled ? "default" : "secondary"}>
                            {server.enabled ? "Enabled" : "Disabled"}
                          </Badge>
                        </CardTitle>
                        <CardDescription>{server.provider}</CardDescription>
                      </div>
                      <Switch
                        checked={server.enabled}
                        onCheckedChange={() => toggleServerEnabled(server)}
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{server.description}</p>
                    
                    {server.enabled && (
                      <div className="mt-4 space-y-2">
                        <Label htmlFor={`${server.id}-api-key`}>API Key (optional)</Label>
                        <Input
                          id={`${server.id}-api-key`}
                          type="password"
                          placeholder="Enter API key if required"
                          value={server.apiKey || ''}
                          onChange={(e) => updateApiKey(server, e.target.value)}
                        />
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`https://smithery.ai/servers/${server.id}`, '_blank')}
                    >
                      Documentation <ExternalLink className="ml-1 h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => uninstallServer(server)}
                    >
                      Uninstall
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </>
          )}
        </TabsContent>
        
        <TabsContent value="browse" className="space-y-4">
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search servers..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {categories.map(category => (
              <Badge
                key={category.id}
                variant={activeCategory === category.id ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setActiveCategory(category.id)}
              >
                {category.name} ({category.count})
              </Badge>
            ))}
          </div>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : servers.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">No servers found matching your criteria.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {servers.map(server => (
                <Card key={server.id} className="overflow-hidden">
                  <CardHeader>
                    <CardTitle>{server.name}</CardTitle>
                    <CardDescription>{server.provider}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{server.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline">{server.downloads.toLocaleString()} downloads</Badge>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`https://smithery.ai/servers/${server.id}`, '_blank')}
                    >
                      View Details <ExternalLink className="ml-1 h-4 w-4" />
                    </Button>
                    {server.installed ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => uninstallServer(server)}
                      >
                        Uninstall
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => installServer(server)}
                      >
                        <Download className="mr-1 h-4 w-4" /> Install
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 