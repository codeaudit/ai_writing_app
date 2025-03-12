"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bug, Copy, Check, RefreshCw } from 'lucide-react';
import { toast } from "@/components/ui/use-toast";
import { useLLMStore } from "@/lib/store";

interface AIDebugPanelProps {
  lastPrompt: string;
  contextDocuments: Array<{ id: string; name: string; content: string }>;
  primaryDocument?: string;
}

export default function AIDebugPanel({ 
  lastPrompt, 
  contextDocuments, 
  primaryDocument 
}: AIDebugPanelProps) {
  const { config } = useLLMStore();
  const [isCopied, setIsCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('prompt');
  
  const handleCopyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    setIsCopied(true);
    
    toast({
      title: "Copied to clipboard",
      description: "The content has been copied to your clipboard.",
    });
    
    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  };
  
  // Format context documents for display
  const formatContextDocuments = () => {
    let formattedContent = '';
    
    if (primaryDocument) {
      formattedContent += `Primary Document:\n${primaryDocument}\n\n`;
    }
    
    if (contextDocuments.length > 0) {
      formattedContent += 'Additional Context Documents:\n\n';
      contextDocuments.forEach(doc => {
        formattedContent += `Document: ${doc.name}\n${doc.content}\n\n`;
      });
    }
    
    return formattedContent || 'No context documents available';
  };
  
  return (
    <div className="w-full">
      <Tabs defaultValue="prompt" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-3 grid grid-cols-3 h-9">
          <TabsTrigger value="prompt" className="text-xs">Prompt</TabsTrigger>
          <TabsTrigger value="context" className="text-xs">Context</TabsTrigger>
          <TabsTrigger value="config" className="text-xs">Configuration</TabsTrigger>
        </TabsList>
        
        <TabsContent value="prompt" className="space-y-3">
          <div className="border rounded-md p-3 bg-muted/30 overflow-auto max-h-[400px]">
            <pre className="whitespace-pre-wrap text-xs font-mono">{lastPrompt || "No prompt has been sent yet."}</pre>
          </div>
          <div className="flex justify-end">
            <Button 
              variant="outline" 
              size="sm"
              className="h-8 text-xs"
              onClick={() => handleCopyToClipboard(lastPrompt)}
              disabled={!lastPrompt}
            >
              {isCopied && activeTab === 'prompt' ? (
                <Check className="h-3 w-3 mr-1" />
              ) : (
                <Copy className="h-3 w-3 mr-1" />
              )}
              Copy
            </Button>
          </div>
        </TabsContent>
        
        <TabsContent value="context" className="space-y-3">
          <div className="border rounded-md p-3 bg-muted/30 overflow-auto max-h-[400px]">
            <pre className="whitespace-pre-wrap text-xs font-mono">{formatContextDocuments()}</pre>
          </div>
          <div className="flex justify-end">
            <Button 
              variant="outline" 
              size="sm"
              className="h-8 text-xs"
              onClick={() => handleCopyToClipboard(formatContextDocuments())}
            >
              {isCopied && activeTab === 'context' ? (
                <Check className="h-3 w-3 mr-1" />
              ) : (
                <Copy className="h-3 w-3 mr-1" />
              )}
              Copy
            </Button>
          </div>
        </TabsContent>
        
        <TabsContent value="config" className="space-y-3">
          <div className="border rounded-md p-3 bg-muted/30">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <h3 className="font-medium mb-1">Provider</h3>
                <p className="text-muted-foreground">{config.provider || 'openai'}</p>
              </div>
              <div>
                <h3 className="font-medium mb-1">Model</h3>
                <p className="text-muted-foreground">{config.model || 'gpt-4o'}</p>
              </div>
              <div>
                <h3 className="font-medium mb-1">Temperature</h3>
                <p className="text-muted-foreground">0.7</p>
              </div>
              <div>
                <h3 className="font-medium mb-1">Max Tokens</h3>
                <p className="text-muted-foreground">1000</p>
              </div>
              <div>
                <h3 className="font-medium mb-1">Caching</h3>
                <p className="text-muted-foreground">Enabled (1 hour)</p>
              </div>
              <div>
                <h3 className="font-medium mb-1">Session Storage</h3>
                <p className="text-muted-foreground">Vercel KV</p>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button 
              variant="outline" 
              size="sm"
              className="h-8 text-xs"
              onClick={() => handleCopyToClipboard(JSON.stringify(config, null, 2))}
            >
              {isCopied && activeTab === 'config' ? (
                <Check className="h-3 w-3 mr-1" />
              ) : (
                <Copy className="h-3 w-3 mr-1" />
              )}
              Copy
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 