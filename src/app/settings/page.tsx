"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, RotateCcw, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLLMStore } from "@/lib/store";
import { LLM_PROVIDERS, LLM_MODELS } from "@/lib/config";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { createDefaultTemplate, createDefaultInstructions } from "@/lib/template-parser";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import Link from "next/link";

export default function SettingsPage() {
  const router = useRouter();
  const { config, updateConfig } = useLLMStore();
  
  const [provider, setProvider] = useState(config.provider);
  const [apiKey, setApiKey] = useState(config.apiKey);
  const [googleApiKey, setGoogleApiKey] = useState(config.googleApiKey || '');
  const [model, setModel] = useState(config.model);
  const [promptTemplate, setPromptTemplate] = useState(config.promptTemplate || createDefaultTemplate());
  const [customInstructions, setCustomInstructions] = useState(config.customInstructions || createDefaultInstructions());
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  
  // Update local state when config changes
  useEffect(() => {
    setProvider(config.provider);
    setApiKey(config.apiKey);
    setGoogleApiKey(config.googleApiKey || '');
    setModel(config.model);
    setPromptTemplate(config.promptTemplate || createDefaultTemplate());
    setCustomInstructions(config.customInstructions || createDefaultInstructions());
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
        model,
        promptTemplate,
        customInstructions
      });
      
      setIsSaving(false);
      router.push("/");
    }, 500);
  };
  
  const resetPromptTemplate = () => {
    setPromptTemplate(createDefaultTemplate());
  };
  
  const resetCustomInstructions = () => {
    setCustomInstructions(createDefaultInstructions());
  };

  return (
    <main className="flex min-h-screen flex-col p-8">
      <div className="max-w-3xl mx-auto w-full">
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
              Configure your LLM providers, prompts, and application preferences.
            </CardDescription>
          </CardHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="px-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="prompts">Prompts & Instructions</TabsTrigger>
              </TabsList>
            </div>
            
            <CardContent className="pt-6">
              <TabsContent value="general" className="space-y-6">
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
              </TabsContent>
              
              <TabsContent value="prompts" className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="customInstructions">Custom Instructions</Label>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={resetCustomInstructions}
                      className="h-8 text-xs"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Reset to Default
                    </Button>
                  </div>
                  <Textarea 
                    id="customInstructions" 
                    value={customInstructions} 
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    placeholder="Enter custom instructions for the AI"
                    className="min-h-[100px] font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    These instructions will be included in every prompt to guide the AI's responses.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="promptTemplate">Prompt Template</Label>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={resetPromptTemplate}
                      className="h-8 text-xs"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Reset to Default
                    </Button>
                  </div>
                  <Textarea 
                    id="promptTemplate" 
                    value={promptTemplate} 
                    onChange={(e) => setPromptTemplate(e.target.value)}
                    placeholder="Enter your prompt template"
                    className="min-h-[300px] font-mono text-sm"
                  />
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Available variables:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><code>{'{{userMessage}}'}</code> - The user's message</li>
                      <li><code>{'{{customInstructions}}'}</code> - Your custom instructions</li>
                      <li><code>{'{{contextDocuments}}'}</code> - Array of context documents</li>
                      <li><code>{'{{#if contextDocuments}}...{{/if}}'}</code> - Conditional block</li>
                      <li><code>{'{{#each contextDocuments}}...{{/each}}'}</code> - Loop through documents</li>
                      <li><code>{'{{@index}}'}</code> - Current index in a loop</li>
                    </ul>
                  </div>
                </div>
                
                <div className="space-y-4 mt-6 border-t pt-4">
                  <Collapsible>
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium">Template Language Documentation</h3>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <ChevronDown className="h-4 w-4" />
                          <span className="sr-only">Toggle</span>
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                    
                    <CollapsibleContent className="mt-2">
                      <div className="rounded-md border p-4 text-sm space-y-4">
                        <p>
                          The template language is inspired by Handlebars and Mustache, providing a simple yet powerful way to create dynamic prompts.
                        </p>
                        
                        <div className="space-y-2">
                          <h4 className="font-medium">Basic Syntax</h4>
                          <ul className="list-disc pl-5 space-y-1">
                            <li><code>{'{{variable}}'}</code> - Variable substitution</li>
                            <li><code>{'{{#if condition}}...{{/if}}'}</code> - Conditional blocks</li>
                            <li><code>{'{{#each array}}...{{/each}}'}</code> - Iteration blocks</li>
                            <li><code>{'{{@index}}'}</code> - Current index in a loop (0-based)</li>
                            <li><code>{'{{@index + 1}}'}</code> - Arithmetic with index (for 1-based numbering)</li>
                          </ul>
                        </div>
                        
                        <div className="space-y-2">
                          <h4 className="font-medium">Available Variables</h4>
                          <ul className="list-disc pl-5 space-y-1">
                            <li><code>{'{{userMessage}}'}</code> - The user's message</li>
                            <li><code>{'{{customInstructions}}'}</code> - Your custom instructions</li>
                            <li><code>{'{{contextDocuments}}'}</code> - Array of context documents</li>
                          </ul>
                        </div>
                        
                        <div className="space-y-2">
                          <h4 className="font-medium">Example</h4>
                          <pre className="bg-muted p-2 rounded-md text-xs overflow-x-auto">
{`{{#if contextDocuments}}
Context Documents:

{{#each contextDocuments}}
Document {{@index + 1}} Title: {{name}}
Document {{@index + 1}} Content:
{{content}}

{{/each}}
{{/if}}

User Message: {{userMessage}}

{{customInstructions}}`}
                          </pre>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">
                            This template language is a simplified version inspired by Handlebars.
                          </p>
                          <Link 
                            href="https://handlebarsjs.com/guide/" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs flex items-center text-primary hover:underline"
                          >
                            Learn more
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </Link>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
          
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