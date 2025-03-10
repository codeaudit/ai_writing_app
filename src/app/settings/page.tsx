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

export default function SettingsPage() {
  const router = useRouter();
  const { config, updateConfig } = useLLMStore();
  
  const [provider, setProvider] = useState(config.provider);
  const [apiKey, setApiKey] = useState(config.apiKey);
  const [model, setModel] = useState(config.model);
  const [isSaving, setIsSaving] = useState(false);
  
  // Update local state when config changes
  useEffect(() => {
    setProvider(config.provider);
    setApiKey(config.apiKey);
    setModel(config.model);
  }, [config]);
  
  const handleSave = () => {
    setIsSaving(true);
    
    // Simulate API call delay
    setTimeout(() => {
      updateConfig({
        provider,
        apiKey,
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
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                  <SelectItem value="google">Google AI</SelectItem>
                  <SelectItem value="mistral">Mistral AI</SelectItem>
                  <SelectItem value="local">Local Model</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input 
                id="apiKey" 
                type="password" 
                value={apiKey} 
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your API key"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger id="model">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {provider === "openai" && (
                    <>
                      <SelectItem value="gpt-4">GPT-4</SelectItem>
                      <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                      <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                    </>
                  )}
                  {provider === "anthropic" && (
                    <>
                      <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
                      <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
                      <SelectItem value="claude-3-haiku">Claude 3 Haiku</SelectItem>
                    </>
                  )}
                  {provider === "google" && (
                    <>
                      <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                      <SelectItem value="gemini-ultra">Gemini Ultra</SelectItem>
                    </>
                  )}
                  {provider === "mistral" && (
                    <>
                      <SelectItem value="mistral-large">Mistral Large</SelectItem>
                      <SelectItem value="mistral-medium">Mistral Medium</SelectItem>
                      <SelectItem value="mistral-small">Mistral Small</SelectItem>
                    </>
                  )}
                  {provider === "local" && (
                    <>
                      <SelectItem value="llama-3">Llama 3</SelectItem>
                      <SelectItem value="llama-2">Llama 2</SelectItem>
                      <SelectItem value="mistral-7b">Mistral 7B</SelectItem>
                    </>
                  )}
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