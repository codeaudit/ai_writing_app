"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLLMStore } from "@/lib/store";
import { LLM_PROVIDERS, LLM_MODELS } from "@/lib/config";

export default function SettingsPage() {
  const router = useRouter();
  const { config, updateConfig } = useLLMStore();
  
  const [provider, setProvider] = useState(config.provider);
  const [apiKey, setApiKey] = useState(config.apiKey);
  const [googleApiKey, setGoogleApiKey] = useState(config.googleApiKey || '');
  const [model, setModel] = useState(config.model);
  const [isSaving, setIsSaving] = useState(false);
  
  // Update local state when config changes
  useEffect(() => {
    setProvider(config.provider);
    setApiKey(config.apiKey);
    setGoogleApiKey(config.googleApiKey || '');
    setModel(config.model);
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
        model
      });
      
      setIsSaving(false);
      router.push("/");
    }, 500);
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