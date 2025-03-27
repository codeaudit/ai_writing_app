"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fetchTemplates, processTemplate } from "@/lib/api-service";
import { generateText } from "@/lib/llm-service";
import { toast } from "@/components/ui/use-toast";
import { RefreshCw, Copy, Code, Bot } from "lucide-react";
import { useLLMStore } from "@/lib/store";

interface TemplateTesterProps {
  className?: string;
}

export function TemplateTester({ className }: TemplateTesterProps) {
  // Templates
  const [templates, setTemplates] = useState<{ name: string; path: string }[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  
  // Variables for template processing
  const [selectedText, setSelectedText] = useState<string>("");
  const [userPrompt, setUserPrompt] = useState<string>("");
  const [contextFiles, setContextFiles] = useState<string>("");
  
  // Processed content
  const [rawTemplateContent, setRawTemplateContent] = useState<string>("");
  const [processedTemplate, setProcessedTemplate] = useState<string>("");
  const [llmResponse, setLlmResponse] = useState<string>("");
  
  // Processing states
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingLLM, setIsGeneratingLLM] = useState(false);
  
  // LLM configuration
  const { config } = useLLMStore();
  
  // Load templates on component mount
  useEffect(() => {
    loadTemplates();
  }, []);
  
  // Load templates from the API
  const loadTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const templateList = await fetchTemplates();
      setTemplates(templateList);
    } catch (error) {
      console.error("Error loading templates:", error);
      toast({
        title: "Error",
        description: "Failed to load templates",
        variant: "destructive",
      });
    } finally {
      setIsLoadingTemplates(false);
    }
  };
  
  // Fetch the raw template content
  const fetchRawTemplateContent = async (templateName: string) => {
    try {
      const response = await fetch(`/api/templates/preview?name=${encodeURIComponent(templateName)}`);
      if (response.ok) {
        const data = await response.json();
        setRawTemplateContent(data.content);
        return data.content;
      } else {
        throw new Error("Failed to fetch template content");
      }
    } catch (error) {
      console.error("Error fetching template content:", error);
      toast({
        title: "Error",
        description: "Failed to fetch template content",
        variant: "destructive",
      });
      return "";
    }
  };
  
  // Handle template selection
  const handleTemplateSelection = async (templateName: string) => {
    setSelectedTemplate(templateName);
    if (templateName) {
      await fetchRawTemplateContent(templateName);
    } else {
      setRawTemplateContent("");
      setProcessedTemplate("");
    }
  };
  
  // Process the template with variables
  const handleProcessTemplate = async () => {
    if (!selectedTemplate) {
      toast({
        title: "Error",
        description: "Please select a template first",
        variant: "destructive",
      });
      return;
    }
    
    setIsProcessing(true);
    try {
      // Prepare variables for the template
      const variables: Record<string, string> = {
        selectedText: selectedText || "",
        userPrompt: userPrompt || ""
      };
      
      if (contextFiles.trim()) {
        variables.contextFiles = contextFiles;
      }
      
      // Process the template
      const processed = await processTemplate(selectedTemplate, variables);
      setProcessedTemplate(processed);
    } catch (error) {
      console.error("Error processing template:", error);
      toast({
        title: "Error",
        description: "Failed to process template",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Generate LLM response from the processed template
  const handleGenerateLLM = async () => {
    if (!processedTemplate) {
      toast({
        title: "Error",
        description: "Please process a template first",
        variant: "destructive",
      });
      return;
    }
    
    setIsGeneratingLLM(true);
    try {
      // Call the LLM service with the processed template as the prompt
      const result = await generateText({
        prompt: processedTemplate,
        aiRole: config.aiRole || "assistant",
        stream: false
      });
      
      setLlmResponse(result.text);
    } catch (error) {
      console.error("Error generating LLM response:", error);
      toast({
        title: "Error",
        description: "Failed to generate LLM response",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingLLM(false);
    }
  };
  
  // Copy text to clipboard
  const copyToClipboard = (text: string, message: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: message,
    });
  };
  
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Template Tester</CardTitle>
        <CardDescription>
          Test your templates with different inputs and see the LLM responses.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Template Selection */}
        <div className="space-y-2">
          <Label htmlFor="template-select">Template</Label>
          <div className="flex space-x-2">
            <Select 
              value={selectedTemplate} 
              onValueChange={handleTemplateSelection}
              disabled={isLoadingTemplates}
            >
              <SelectTrigger id="template-select" className="flex-1">
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.name} value={template.name}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button 
              variant="outline" 
              size="icon" 
              onClick={loadTemplates}
              disabled={isLoadingTemplates}
              title="Refresh templates"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Variables Section */}
        <div className="space-y-4 border p-4 rounded-md">
          <h3 className="font-medium text-sm">Template Variables</h3>
          
          <div className="space-y-2">
            <Label htmlFor="selected-text">Selected Text</Label>
            <Textarea 
              id="selected-text"
              placeholder="Enter text that would be selected in the editor"
              value={selectedText}
              onChange={(e) => setSelectedText(e.target.value)}
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="user-prompt">User Prompt</Label>
            <Input
              id="user-prompt"
              placeholder="Enter a user prompt"
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="context-files">Context Files (optional)</Label>
            <Textarea
              id="context-files"
              placeholder="Enter context files content"
              value={contextFiles}
              onChange={(e) => setContextFiles(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Format: <code>--- Filename ---<br />Content<br /><br />--- Another file ---<br />Content</code>
            </p>
          </div>
          
          <Button 
            onClick={handleProcessTemplate} 
            disabled={!selectedTemplate || isProcessing}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Code className="h-4 w-4 mr-2" />
                Process Template
              </>
            )}
          </Button>
        </div>
        
        {/* Results Section */}
        <Tabs defaultValue="processed" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="raw">Raw Template</TabsTrigger>
            <TabsTrigger value="processed">Processed Template</TabsTrigger>
            <TabsTrigger value="llm">LLM Response</TabsTrigger>
          </TabsList>
          
          <TabsContent value="raw" className="space-y-4 mt-4">
            <ScrollArea className="h-[300px] w-full border rounded-md p-4">
              <pre className="whitespace-pre-wrap text-sm font-mono">{rawTemplateContent || "No template selected"}</pre>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="processed" className="space-y-4 mt-4">
            <ScrollArea className="h-[300px] w-full border rounded-md p-4">
              <pre className="whitespace-pre-wrap text-sm font-mono">{processedTemplate || "Process a template to see the result"}</pre>
            </ScrollArea>
            
            <div className="flex justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(processedTemplate, "Processed template copied to clipboard")}
                disabled={!processedTemplate}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
              
              <Button
                onClick={handleGenerateLLM}
                disabled={!processedTemplate || isGeneratingLLM}
                size="sm"
              >
                {isGeneratingLLM ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Bot className="h-4 w-4 mr-2" />
                    Generate LLM Response
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="llm" className="space-y-4 mt-4">
            <ScrollArea className="h-[300px] w-full border rounded-md p-4">
              <div className="whitespace-pre-wrap text-sm">
                {llmResponse || "Generate an LLM response to see the result"}
              </div>
            </ScrollArea>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(llmResponse, "LLM response copied to clipboard")}
              disabled={!llmResponse}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="border-t pt-4 text-sm text-muted-foreground">
        This tool helps debug templates by showing the raw template, processed output, and LLM response.
      </CardFooter>
    </Card>
  );
} 