'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2 } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { MCPServerState } from '@/lib/mcp-server-manager';

interface MCPServersIndicatorProps {
  provider: string;
}

export function MCPServersIndicator({ provider }: MCPServersIndicatorProps) {
  const [servers, setServers] = useState<MCPServerState[]>([]);
  const [loading, setLoading] = useState(false);

  // Only show for OpenAI and Anthropic providers
  const shouldShow = provider === 'openai' || provider === 'anthropic';

  useEffect(() => {
    async function fetchEnabledServers() {
      if (!shouldShow) return;
      
      console.log(`Fetching MCP servers for ${provider}...`);
      setLoading(true);
      try {
        const response = await fetch('/api/mcp-servers');
        if (response.ok) {
          const data = await response.json();
          console.log('MCP servers response:', data);
          setServers(data.servers || []);
        } else {
          console.error('Error response from MCP servers API:', await response.text());
        }
      } catch (error) {
        console.error('Error fetching MCP servers:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchEnabledServers();
    
    // Set up a refresh interval (every 30 seconds)
    const intervalId = setInterval(fetchEnabledServers, 30000);
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, [shouldShow, provider]);
  
  // Debug output
  useEffect(() => {
    console.log(`MCP Servers Indicator: provider=${provider}, shouldShow=${shouldShow}, serverCount=${servers.length}`);
  }, [provider, shouldShow, servers]);

  if (!shouldShow) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 p-1 font-normal"
          title="MCP Servers Connected"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5 mr-1 text-amber-500" />
          )}
          <span className="text-xs">
            {loading ? "Loading..." : servers.length > 0 ? `${servers.length} MCP` : "No MCP"}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="end">
        <div className="space-y-2">
          <h4 className="text-sm font-medium mb-2">Connected MCP Servers</h4>
          {loading ? (
            <div className="flex justify-center items-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-xs text-muted-foreground">Loading servers...</span>
            </div>
          ) : servers.length > 0 ? (
            <div className="grid gap-1.5">
              {servers.map(server => (
                <div key={server.qualifiedName} className="flex items-center justify-between text-xs">
                  <div className="flex items-center">
                    <Badge 
                      variant="outline" 
                      className="mr-2 bg-green-500/10 text-green-500 border-green-500/20"
                    >
                      Active
                    </Badge>
                    <span className="font-medium">{server.name}</span>
                  </div>
                  <span className="text-muted-foreground text-xs truncate max-w-[120px]">
                    {server.qualifiedName}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">No MCP servers are connected.</p>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
            MCP Servers enable AI tools and capabilities for {provider === 'openai' ? 'OpenAI' : 'Anthropic'} models.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
} 