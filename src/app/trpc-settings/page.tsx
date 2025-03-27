"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Loader2, Save, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/use-toast";
import { TrpcTemplateTester } from "@/components/trpc-template-tester";
import { useTrpcConfigStore, LLMProvider } from "@/lib/trpc-config-store";
import { useTrpcKVCacheStore } from "@/lib/trpc-kv-cache-store";
import TrpcIntegrationTestPage from "../trpc-test-integration/page";

// Define config type to match what's expected
interface ConfigSaveParams {
  provider: LLMProvider;
  model: string;
  temperature: number;
  maxTokens: number;
}

export default function TrpcSettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("general");
  const [loading, setLoading] = useState(false);
  const configStore = useTrpcConfigStore();
  const { config, loadConfig, saveConfig } = configStore;
  const { provider, model, temperature, maxTokens } = config || {
    provider: 'openai' as LLMProvider,
    model: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 1024
  };
  
  // Use the KV cache store for flushing cache
  const kvCacheStore = useTrpcKVCacheStore();
  
  // API keys state (NOTE: we intentionally don't store these in the config store for security)
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({
    openai: "",
    anthropic: "",
    gemini: ""
  });

  // Load config when component mounts
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        await loadConfig();
      } catch (error) {
        console.error("Error loading config:", error);
        toast({
          title: "Error",
          description: "Failed to load settings. Please try again.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchConfig();
  }, [loadConfig]);

  const handleSaveSettings = async () => {
    try {
      setLoading(true);
      // Create a config object with the current values
      const configToSave: ConfigSaveParams = {
        provider,
        model,
        temperature,
        maxTokens
      };
      
      await saveConfig(configToSave);
      
      toast({
        title: "Settings Saved",
        description: "Your settings have been successfully updated.",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFlushCache = async () => {
    try {
      setLoading(true);
      const entriesRemoved = await kvCacheStore.flushCache();
      toast({
        title: "Cache Flushed",
        description: `The application cache has been successfully cleared. Removed ${entriesRemoved} entries.`
      });
    } catch (error) {
      console.error("Error flushing cache:", error);
      toast({
        title: "Error",
        description: "Failed to flush cache. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const navigateToAIRoles = () => {
    router.push("/trpc-admin/ai-roles");
  };

  return (
    <div className="container py-8 max-w-5xl pb-16">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        {loading && (
          <div className="flex items-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </div>
        )}
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="templates">Template Tester</TabsTrigger>
          <TabsTrigger value="testing">Testing</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general">
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="provider">LLM Provider</Label>
                  <Select
                    value={provider}
                    onValueChange={(value) => saveConfig({ provider: value as LLMProvider })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="anthropic">Anthropic</SelectItem>
                      <SelectItem value="gemini">Google AI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {provider === 'openai' && (
                  <div className="space-y-2">
                    <Label htmlFor="openai-key">OpenAI API Key</Label>
                    <Input
                      id="openai-key"
                      type="password"
                      value={apiKeys.openai}
                      onChange={(e) => setApiKeys({ ...apiKeys, openai: e.target.value })}
                      placeholder="sk-..."
                    />
                  </div>
                )}
                
                {provider === 'anthropic' && (
                  <div className="space-y-2">
                    <Label htmlFor="anthropic-key">Anthropic API Key</Label>
                    <Input
                      id="anthropic-key"
                      type="password"
                      value={apiKeys.anthropic}
                      onChange={(e) => setApiKeys({ ...apiKeys, anthropic: e.target.value })}
                      placeholder="sk-ant-..."
                    />
                  </div>
                )}
                
                {provider === 'gemini' && (
                  <div className="space-y-2">
                    <Label htmlFor="gemini-key">Google AI API Key</Label>
                    <Input
                      id="gemini-key"
                      type="password"
                      value={apiKeys.gemini}
                      onChange={(e) => setApiKeys({ ...apiKeys, gemini: e.target.value })}
                      placeholder="AIza..."
                    />
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Select
                  value={model}
                  onValueChange={(value) => saveConfig({ model: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {provider === 'openai' ? (
                      <>
                        <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                        <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                        <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                      </>
                    ) : provider === 'anthropic' ? (
                      <>
                        <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
                        <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
                        <SelectItem value="claude-3-haiku">Claude 3 Haiku</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                        <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Temperature: {temperature.toFixed(1)}</Label>
                  </div>
                  <Slider
                    value={[temperature]}
                    min={0}
                    max={1}
                    step={0.1}
                    onValueChange={([value]) => saveConfig({ temperature: value })}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>More deterministic</span>
                    <span>More creative</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Max Tokens: {maxTokens}</Label>
                  </div>
                  <Slider
                    value={[maxTokens]}
                    min={256}
                    max={4096}
                    step={256}
                    onValueChange={([value]) => saveConfig({ maxTokens: value })}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Button onClick={navigateToAIRoles} variant="outline" className="w-full flex justify-between">
                  Manage AI Roles and Prompts
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <p className="text-xs text-muted-foreground">
                  Customize the AI&apos;s behavior by configuring different roles and system prompts.
                </p>
              </div>
              
              <div className="flex justify-end">
                <Button onClick={handleSaveSettings} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Settings
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="templates">
          <TrpcTemplateTester />
        </TabsContent>
        
        <TabsContent value="testing">
          <div className="bg-muted/40 p-4 rounded-lg mb-6">
            <h2 className="text-lg font-medium mb-2">tRPC Integration Tests</h2>
            <p className="text-muted-foreground mb-4">
              Test and verify the tRPC API integration with various stores and components.
            </p>
          </div>
          <TrpcIntegrationTestPage />
        </TabsContent>
        
        <TabsContent value="advanced">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-6">
                <h2 className="text-lg font-medium">Advanced Settings</h2>
                <div className="space-y-2">
                  <Button 
                    onClick={handleFlushCache}
                    variant="outline" 
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Flushing...
                      </>
                    ) : (
                      <>
                        <Trash className="mr-2 h-4 w-4" />
                        Flush Cache
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Clear all cached data including document snapshots and AI responses.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}