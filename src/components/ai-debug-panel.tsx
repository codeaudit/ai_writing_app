"use client";

import { useState } from "react";
import { toast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Copy, Check } from 'lucide-react';
import { useLLMStore } from "@/lib/store";
import { ChatMessage } from "@/lib/llm-service";

interface AIDebugPanelProps {
  lastPrompt: string;
  contextDocuments: Array<{ id: string; name: string; content: string }>;
  apiMessages?: ChatMessage[];
}

export default function AIDebugPanel({ 
  lastPrompt, 
  contextDocuments,
  apiMessages = []
}: AIDebugPanelProps) {
  const { config } = useLLMStore();
  const [isCopied, setIsCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('api-messages');
  
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
    
    if (contextDocuments.length > 0) {
      formattedContent += 'Context Documents:\n\n';
      contextDocuments.forEach(doc => {
        formattedContent += `Document: ${doc.name}\n${doc.content}\n\n`;
      });
    }
    
    return formattedContent || 'No context documents available';
  };
  
  // Format API messages for display
  const formatApiMessages = () => {
    if (!apiMessages || apiMessages.length === 0) {
      return "No API messages have been sent yet.";
    }
    
    return JSON.stringify(apiMessages, null, 2);
  };
  
  return (
    <div className="w-full">
      <Tabs defaultValue="api-messages" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-3 grid grid-cols-4 h-9">
          <TabsTrigger value="api-messages" className="text-xs">API Messages</TabsTrigger>
          <TabsTrigger value="prompt" className="text-xs">Prompt</TabsTrigger>
          <TabsTrigger value="context" className="text-xs">Context</TabsTrigger>
          <TabsTrigger value="config" className="text-xs">Configuration</TabsTrigger>
        </TabsList>
        
        <TabsContent value="api-messages" className="space-y-3">
          <div className="border rounded-md p-3 bg-muted/30 overflow-auto max-h-[400px]">
            <pre className="whitespace-pre-wrap text-xs font-mono">{formatApiMessages()}</pre>
          </div>
          <div className="flex justify-end">
            <Button 
              variant="outline" 
              size="sm"
              className="h-8 text-xs"
              onClick={() => handleCopyToClipboard(formatApiMessages())}
              disabled={!apiMessages || apiMessages.length === 0}
            >
              {isCopied && activeTab === 'api-messages' ? (
                <Check className="h-3 w-3 mr-1" />
              ) : (
                <Copy className="h-3 w-3 mr-1" />
              )}
              Copy
            </Button>
          </div>
        </TabsContent>
        
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