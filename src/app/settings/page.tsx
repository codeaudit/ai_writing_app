"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Save, 
  Trash2, 
  ArrowRight, 
  Settings as SettingsIcon, 
  Edit, 
  Brain, 
  FileText, 
  Server, 
  X,
  ArrowLeft,
  Wrench
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useLLMStore } from "@/lib/store";
import { LLM_PROVIDERS, LLM_MODELS } from "@/lib/config";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { flushAICache } from "@/lib/cache-utils";
import { toast } from "sonner";
import { TemplateTester } from "@/components/template-tester";
import { MCPSettings } from '@/components/settings/mcp-settings';
import { ToolSettings } from '@/components/settings/tool-settings';
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const router = useRouter();
  const { config, updateConfig } = useLLMStore();
  const [activeTab, setActiveTab] = useState("general");
  
  const [provider, setProvider] = useState(config.provider);
  const [apiKey, setApiKey] = useState(config.apiKey);
  const [googleApiKey, setGoogleApiKey] = useState(config.googleApiKey || '');
  const [anthropicApiKey, setAnthropicApiKey] = useState(config.anthropicApiKey || '');
  const [model, setModel] = useState(config.model);
  const [enableCache, setEnableCache] = useState(config.enableCache);
  const [temperature, setTemperature] = useState(config.temperature);
  const [maxTokens, setMaxTokens] = useState(config.maxTokens);
  const [isSaving, setIsSaving] = useState(false);
  const [isFlushing, setIsFlushing] = useState(false);
  
  // Define tabs with icons
  const tabs = [
    { id: "general", label: "General", icon: <SettingsIcon className="h-5 w-5" /> },
    { id: "editor", label: "Editor", icon: <Edit className="h-5 w-5" /> },
    { id: "ai", label: "AI", icon: <Brain className="h-5 w-5" /> },
    { id: "templates", label: "Templates", icon: <FileText className="h-5 w-5" /> },
    { id: "tools", label: "Tools", icon: <Wrench className="h-5 w-5" /> },
    { id: "mcp", label: "MCP Servers", icon: <Server className="h-5 w-5" /> }
  ];
  
  // Update local state when config changes
  useEffect(() => {
    setProvider(config.provider);
    setApiKey(config.apiKey);
    setGoogleApiKey(config.googleApiKey || '');
    setAnthropicApiKey(config.anthropicApiKey || '');
    setModel(config.model);
    setEnableCache(config.enableCache);
    setTemperature(config.temperature);
    setMaxTokens(config.maxTokens);
  }, [config]);
  
  // Update model when provider changes
  useEffect(() => {
    // If the current model doesn't belong to the selected provider, reset it
    const providerModels = LLM_MODELS[provider as keyof typeof LLM_MODELS] || [];
    const modelExists = providerModels.some(m => m.value === model);
    
    if (!modelExists && providerModels.length > 0) {
      setModel(providerModels[0].value);
    }
  }, [provider, model]);
  
  // Add a function to save API keys immediately
  const saveApiKeys = async () => {
    try {
      const response = await fetch('/api/set-api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          openaiKey: apiKey,
          googleKey: googleApiKey,
          anthropicKey: anthropicApiKey,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save API keys');
      }
    } catch (error) {
      console.error('Error saving API keys:', error);
      toast.error('Failed to save API keys');
    }
  };

  // Update the handleSave function to call saveApiKeys
  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      // Save API keys first
      await saveApiKeys();
      
      // Update the configuration in the store
      updateConfig({
        provider,
        apiKey: provider === 'openai' ? apiKey : config.apiKey,
        googleApiKey: provider === 'gemini' ? googleApiKey : config.googleApiKey,
        anthropicApiKey: provider === 'anthropic' ? anthropicApiKey : config.anthropicApiKey,
        model,
        enableCache,
        temperature,
        maxTokens,
      });
      
      // Explicitly save to cookies for server-side access
      useLLMStore.getState().saveToCookies();
      
      toast.success("Settings saved successfully");
      
      // Stay on the settings page after saving
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFlushCache = async () => {
    setIsFlushing(true);
    try {
      const deletedCount = await flushAICache();
      toast.success(`Cache flushed successfully. Removed ${deletedCount} entries.`, {
        duration: 3000,
      });
    } catch (error) {
      toast.error('Failed to flush cache. Please try again.', {
        duration: 3000,
      });
      console.error('Error flushing cache:', error);
    } finally {
      setIsFlushing(false);
    }
  };

  // Add handlers for API key changes
  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiKey(e.target.value);
    // Don't save immediately to avoid too many requests
  };

  const handleGoogleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGoogleApiKey(e.target.value);
    // Don't save immediately to avoid too many requests
  };

  const handleAnthropicApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAnthropicApiKey(e.target.value);
    // Don't save immediately to avoid too many requests
  };

  // Function to exit settings and return to the main app
  const handleExit = () => {
    router.push("/");
  };

  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case "general":
        return (
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4">General Settings</h2>
            <p className="text-muted-foreground">
              General application settings will appear here.
            </p>
          </Card>
        );
      case "editor":
        return (
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4">Editor Settings</h2>
            <p className="text-muted-foreground">
              Editor preferences and configuration will appear here.
            </p>
          </Card>
        );
      case "ai":
        return (
          <Card>
            <CardHeader>
              <CardTitle>AI Settings</CardTitle>
              <CardDescription>
                Configure your LLM providers and application preferences.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="provider">LLM Provider</Label>
                <Select value={provider} onValueChange={setProvider}>
                  <SelectTrigger id="provider">
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {LLM_PROVIDERS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {provider === 'openai' && (
                <div className="space-y-2">
                  <Label htmlFor="apiKey">OpenAI API Key</Label>
                  <Input 
                    id="apiKey" 
                    type="password" 
                    value={apiKey} 
                    onChange={handleApiKeyChange}
                    placeholder="Enter your OpenAI API key"
                  />
                  <p className="text-xs text-muted-foreground">
                    Your API key is stored securely and used only for AI requests.
                  </p>
                </div>
              )}
              
              {provider === 'gemini' && (
                <div className="space-y-2">
                  <Label htmlFor="googleApiKey">Google API Key</Label>
                  <Input 
                    id="googleApiKey" 
                    type="password" 
                    value={googleApiKey} 
                    onChange={handleGoogleApiKeyChange}
                    placeholder="Enter your Google API key"
                  />
                  <p className="text-xs text-muted-foreground">
                    Your API key is stored securely and used only for AI requests.
                  </p>
                </div>
              )}
              
              {provider === 'anthropic' && (
                <div className="space-y-2">
                  <Label htmlFor="anthropicApiKey">Anthropic API Key</Label>
                  <Input 
                    id="anthropicApiKey" 
                    type="password" 
                    value={anthropicApiKey} 
                    onChange={handleAnthropicApiKeyChange}
                    placeholder="Enter your Anthropic API key"
                  />
                  <p className="text-xs text-muted-foreground">
                    Your API key is stored securely and used only for AI requests.
                  </p>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger id="model">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {LLM_MODELS[provider as keyof typeof LLM_MODELS]?.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="pt-4 border-t">
                <h3 className="text-lg font-medium mb-4">Generation Parameters</h3>
                
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="temperature">Temperature: {temperature.toFixed(1)}</Label>
                    </div>
                    <Slider
                      id="temperature"
                      min={0}
                      max={1}
                      step={0.1}
                      value={[temperature]}
                      onValueChange={(values) => setTemperature(values[0])}
                    />
                    <p className="text-sm text-muted-foreground">
                      Lower values (0.0) make responses more deterministic and focused.
                      Higher values (1.0) make responses more creative and varied.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="maxTokens">Maximum Tokens</Label>
                    <Input
                      id="maxTokens"
                      type="number"
                      min={100}
                      max={8000}
                      value={maxTokens}
                      onChange={(e) => setMaxTokens(parseInt(e.target.value, 10))}
                    />
                    <p className="text-sm text-muted-foreground">
                      The maximum number of tokens to generate. Higher values allow for longer responses.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="enable-cache" className="text-base">Cache AI Responses</Label>
                      <Switch 
                        id="enable-cache" 
                        checked={enableCache} 
                        onCheckedChange={setEnableCache} 
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      When enabled, AI responses will be cached to improve performance and reduce API costs.
                      Disable this if you need fresh responses for every request.
                    </p>
                    <div className="pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleFlushCache}
                        disabled={isFlushing}
                        className="flex items-center"
                      >
                        {isFlushing ? (
                          "Flushing cache..."
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Flush Cache
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-muted-foreground mt-1">
                        This will remove all cached AI responses.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* AI Roles Configuration Section */}
              <div className="mt-6 pt-6 border-t">
                <h3 className="text-lg font-medium mb-4">AI Roles Configuration</h3>
                <div className="space-y-4">
                  <div className="rounded-md border p-4 bg-card">
                    <div className="flex flex-col space-y-2">
                      <h4 className="text-sm font-medium">Customize AI Behavior</h4>
                      <p className="text-sm text-muted-foreground">
                        Create, edit, and customize AI roles to control how the AI assistant behaves when interacting with you.
                      </p>
                      <div className="flex items-center mt-2">
                        <Button
                          onClick={() => router.push('/admin/ai-roles')}
                          className="w-full"
                        >
                          Manage AI Roles
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    <p>
                      AI roles define how the AI assistant behaves and responds to your requests. You can create custom roles for different writing tasks or editing styles.
                    </p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Create new AI roles with custom behaviors</li>
                      <li>Edit system prompts to control AI responses</li>
                      <li>Switch between roles based on your current needs</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
            
            <CardFooter>
              <Button 
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  "Saving..."
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Settings
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        );
      case "templates":
        return <TemplateTester />;
      case "tools":
        return <ToolSettings />;
      case "mcp":
        return <MCPSettings />;
      default:
        return null;
    }
  };

  return (
    <main className="container mx-auto py-8 h-screen flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold">Settings</h1>
        <Button 
          variant="outline" 
          size="icon"
          onClick={handleExit}
          aria-label="Close settings"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex flex-1 gap-6 overflow-hidden">
        {/* Vertical tab sidebar */}
        <aside className="w-52 shrink-0 space-y-2 border-r pr-2">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start text-left mb-1",
                activeTab === tab.id ? "bg-secondary" : ""
              )}
              onClick={() => setActiveTab(tab.id)}
            >
              <div className="flex items-center">
                {tab.icon}
                <span className="ml-2">{tab.label}</span>
              </div>
            </Button>
          ))}
          
          <div className="pt-4 mt-auto">
            <Button
              variant="outline"
              className="w-full flex items-center"
              onClick={handleExit}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Return to App
            </Button>
          </div>
        </aside>
        
        {/* Main content area */}
        <div className="flex-1 overflow-auto">
          {renderTabContent()}
        </div>
      </div>
    </main>
  );
} 