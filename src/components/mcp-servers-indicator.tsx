'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Hammer, Sparkles } from 'lucide-react';
import { getEnabledMCPServers } from '@/lib/mcp-server-manager';
import type { MCPServerState } from '@/lib/mcp-server-manager';
import { cn } from '@/lib/utils';

interface MCPServersIndicatorProps {
  provider: string;
  className?: string;
}

export function MCPServersIndicator({ provider, className }: MCPServersIndicatorProps) {
  const [servers, setServers] = useState<MCPServerState[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchServers = async () => {
      try {
        const enabledServers = await getEnabledMCPServers();
        
        // Make sure we only count each server once by its qualifiedName
        const uniqueServers = enabledServers.reduce<MCPServerState[]>((acc, server) => {
          if (!acc.some(s => s.qualifiedName === server.qualifiedName)) {
            acc.push(server);
          }
          return acc;
        }, []);
        
        setServers(uniqueServers);
      } catch (error) {
        console.error('Error fetching MCP servers:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchServers();
  }, []);

  // Show for OpenAI, Anthropic, and Gemini
  if (provider !== 'openai' && provider !== 'anthropic' && provider !== 'gemini' && 
      provider !== 'openrouter' && provider !== 'featherless') {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className={cn("h-6 px-2 text-xs", className)}
          title="MCP Servers"
        >
          <div className="flex items-center gap-1">
            <Hammer className="h-3 w-3 text-primary" />
            <span className="font-medium">{servers.length}</span>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b">
          <div className="flex items-center gap-2">
            <Hammer className="h-4 w-4 text-primary" />
            <h4 className="font-medium text-sm">MCP Servers</h4>
          </div>
        </div>
        <ScrollArea className="h-[300px]">
          <div className="p-3 space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center h-20">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              </div>
            ) : servers.length > 0 ? (
              servers.map((server, index) => (
                <div key={server.qualifiedName || server.name || `server-${index}`} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    <span className="font-medium text-sm">{server.name}</span>
                    <Badge variant="outline" className="h-5 text-[10px] bg-green-500/10 text-green-500 border-green-500/20">
                      Active
                    </Badge>
                  </div>
                  {server.description && (
                    <p className="text-xs text-muted-foreground">{server.description}</p>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center text-sm text-muted-foreground py-4">
                No MCP servers enabled
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
} 