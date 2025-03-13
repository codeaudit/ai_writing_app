"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLLMStore } from "@/lib/store";
import { LLM_PROVIDERS, LLM_MODELS } from "@/lib/config";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { flushAICache } from "@/lib/cache-utils";
import { toast } from "sonner";

export default function SettingsPage() {
  const router = useRouter();
  const { config, updateConfig } = useLLMStore();
  
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
  
  const handleSave = () => {
    setIsSaving(true);
    
    // Simulate API call delay
    setTimeout(() => {
      updateConfig({
        provider,
        apiKey,
        googleApiKey,
        anthropicApiKey,
        model,
        enableCache,
        temperature,
        maxTokens
      });
      
      setIsSaving(false);
      router.push("/");
    }, 500);
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

  return (
    <main className="flex min-h-screen flex-col p-8">
      <div className="max-w-2xl mx-auto w-full">
        <Button 
          variant="ghost" 
          className="mb-6"
          onClick={() => router.push("/")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Editor
        </Button>
        
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
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
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your OpenAI API key"
                />
                <p className="text-xs text-muted-foreground">
                  Your API key is stored locally and never sent to our servers.
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
                  onChange={(e) => setGoogleApiKey(e.target.value)}
                  placeholder="Enter your Google API key"
                />
                <p className="text-xs text-muted-foreground">
                  Your API key is stored locally and never sent to our servers.
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
                  onChange={(e) => setAnthropicApiKey(e.target.value)}
                  placeholder="Enter your Anthropic API key"
                />
                <p className="text-xs text-muted-foreground">
                  Your API key is stored locally and never sent to our servers.
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
                    <Label htmlFor="temperature">Temperature: {temperature !== undefined ? temperature.toFixed(1) : '0.7'}</Label>
                  </div>
                  <Slider
                    id="temperature"
                    min={0}
                    max={1}
                    step={0.1}
                    value={[temperature ?? 0.7]}
                    onValueChange={(values: number[]) => setTemperature(values[0])}
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
                    value={maxTokens ?? 1000}
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
                      checked={enableCache ?? false} 
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
      </div>
    </main>
  );
} 