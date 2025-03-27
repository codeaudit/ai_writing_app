"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/components/ui/use-toast";
import { RefreshCw, Copy, Code, Bot, Settings, Save, Edit } from "lucide-react";
import { trpc } from "@/utils/trpc";
import { useTemplateStore } from "@/lib/trpc-template-store";
import { useTrpcConfigStore } from "@/lib/trpc-config-store";
import { useTrpcAIRolesStore } from "@/lib/trpc-ai-roles-store";
import { LLMProvider } from "@/lib/trpc-config-store";

interface TrpcTemplateTesterProps {
  className?: string;
}

export function TrpcTemplateTester({ className }: TrpcTemplateTesterProps) {
  // Templates
  const { templates, loadTemplates, processTemplate } = useTemplateStore();
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  
  // Variables for template processing
  const [selectedText, setSelectedText] = useState<string>("");
  const [userPrompt, setUserPrompt] = useState<string>("");
  const [contextFiles, setContextFiles] = useState<string>("");
  
  // Processed content
  const [rawTemplateContent, setRawTemplateContent] = useState<string>("");
  const [editableRawTemplate, setEditableRawTemplate] = useState<string>("");
  const [processedTemplate, setProcessedTemplate] = useState<string>("");
  const [llmResponse, setLlmResponse] = useState<string>("");
  
  // Processing states
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingLLM, setIsGeneratingLLM] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // LLM configuration from tRPC store
  const { config, saveConfig, loadAvailableModels } = useTrpcConfigStore();
  
  // AI Roles from tRPC store
  const { availableRoles, loadAvailableRoles } = useTrpcAIRolesStore();
  
  // LLM model selection
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider>(config.provider);
  const [selectedModel, setSelectedModel] = useState<string>(config.model);
  const [selectedRole, setSelectedRole] = useState<string>(config.aiRole);
  
  // tRPC queries and mutations
  const { data: availableModels, isLoading: isLoadingModels } = trpc.config.getAvailableModels.useQuery(
    { provider: selectedProvider },
    { enabled: true }
  );
  
  const saveTemplateContent = trpc.template.saveTemplate.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Template saved successfully",
      });
      setIsEditing(false);
      setRawTemplateContent(editableRawTemplate);
    }
  });
  
  const generateText = trpc.llm.generateText.useMutation({
    onSuccess: (data) => {
      setLlmResponse(data.text);
      setIsGeneratingLLM(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate text",
        variant: "destructive",
      });
      setIsGeneratingLLM(false);
    }
  });
  
  // Load templates and AI roles on component mount
  useEffect(() => {
    loadTemplates();
    loadAvailableRoles();
  }, [loadTemplates, loadAvailableRoles]);
  
  // Update model when provider changes
  useEffect(() => {
    if (selectedProvider !== config.provider) {
      // Load models for the new provider
      loadAvailableModels(selectedProvider).then(models => {
        if (models && models.length > 0) {
          // Select the first model of the new provider if current model doesn't match
          const modelExists = models.some(m => m.id === selectedModel);
          if (!modelExists && models.length > 0) {
            setSelectedModel(models[0].id);
          }
        }
      });
    }
  }, [selectedProvider, selectedModel, config.provider, loadAvailableModels]);
  
  // Fetch the raw template content
  const fetchRawTemplateContent = async (templateId: string) => {
    try {
      // Find the template in the store
      const template = templates.find(t => t.id === templateId);
      if (!template) {
        throw new Error("Template not found");
      }
      
      setRawTemplateContent(template.content);
      setEditableRawTemplate(template.content);
      return template.content;
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
  const handleTemplateSelection = async (templateId: string) => {
    // Reset editing state when selecting a new template
    setIsEditing(false);
    setSelectedTemplate(templateId);
    if (templateId) {
      await fetchRawTemplateContent(templateId);
    } else {
      setRawTemplateContent("");
      setEditableRawTemplate("");
      setProcessedTemplate("");
    }
  };
  
  // Save the edited template
  const handleSaveTemplate = async () => {
    if (!selectedTemplate) {
      toast({
        title: "Error",
        description: "No template selected",
        variant: "destructive",
      });
      return;
    }
    
    setIsSavingTemplate(true);
    try {
      // Find the template to get its name
      const template = templates.find(t => t.id === selectedTemplate);
      if (!template) {
        throw new Error("Template not found");
      }
      
      await saveTemplateContent.mutateAsync({
        id: selectedTemplate,
        name: template.name,
        content: editableRawTemplate,
        description: template.description || ""
      });
      
      // Update complete in mutation callback
      setIsSavingTemplate(false);
    } catch (error) {
      console.error("Error saving template:", error);
      toast({
        title: "Error",
        description: "Failed to save template",
        variant: "destructive",
      });
      setIsSavingTemplate(false);
    }
  };
  
  // Toggle editing mode
  const toggleEditMode = () => {
    if (isEditing) {
      // Discard changes if canceling edit mode
      setEditableRawTemplate(rawTemplateContent);
    }
    setIsEditing(!isEditing);
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
      // Save the current configuration
      await saveConfig({
        provider: selectedProvider,
        model: selectedModel,
        aiRole: selectedRole
      });
      
      // Call the LLM service with the processed template as the prompt
      generateText.mutate({
        prompt: processedTemplate,
        aiRole: selectedRole,
        stream: false
      });
    } catch (error) {
      console.error("Error generating LLM response:", error);
      toast({
        title: "Error",
        description: "Failed to generate LLM response",
        variant: "destructive",
      });
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
  
  // Format a role name for display
  const formatRoleName = (role: string): string => {
    return role
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
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
            >
              <SelectTrigger id="template-select" className="flex-1">
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => loadTemplates()}
              title="Refresh templates"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* LLM Configuration */}
        <div className="space-y-4 border p-4 rounded-md">
          <h3 className="font-medium text-sm flex items-center">
            <Settings className="h-4 w-4 mr-2" />
            LLM Configuration
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* AI Role Selection */}
            <div className="space-y-2">
              <Label htmlFor="ai-role-select">AI Role</Label>
              <Select 
                value={selectedRole} 
                onValueChange={setSelectedRole}
              >
                <SelectTrigger id="ai-role-select">
                  <SelectValue placeholder="Select AI role" />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {formatRoleName(role)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Provider Selection */}
            <div className="space-y-2">
              <Label htmlFor="provider-select">Provider</Label>
              <Select 
                value={selectedProvider} 
                onValueChange={(value) => setSelectedProvider(value as LLMProvider)}
              >
                <SelectTrigger id="provider-select">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                  <SelectItem value="gemini">Google</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Model Selection */}
            <div className="space-y-2">
              <Label htmlFor="model-select">Model</Label>
              <Select 
                value={selectedModel} 
                onValueChange={setSelectedModel}
              >
                <SelectTrigger id="model-select">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingModels ? (
                    <SelectItem value="loading" disabled>Loading models...</SelectItem>
                  ) : (
                    availableModels?.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    )) || []
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        {/* Template Content and Editing */}
        <Tabs defaultValue="raw" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="raw" className="flex-1">Raw Template</TabsTrigger>
            <TabsTrigger value="processed" className="flex-1">Processed</TabsTrigger>
            <TabsTrigger value="response" className="flex-1">LLM Response</TabsTrigger>
          </TabsList>
          
          <TabsContent value="raw" className="space-y-4 mt-4">
            <div className="flex justify-end">
              {!isEditing ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleEditMode}
                  disabled={!selectedTemplate}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <div className="space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleEditMode}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleSaveTemplate}
                    disabled={isSavingTemplate}
                  >
                    {isSavingTemplate ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
            
            <ScrollArea className="h-60 border rounded-md p-2">
              {isEditing ? (
                <Textarea
                  value={editableRawTemplate}
                  onChange={(e) => setEditableRawTemplate(e.target.value)}
                  className="min-h-[240px] font-mono text-sm border-none"
                />
              ) : (
                <pre className="font-mono text-sm p-2 whitespace-pre-wrap">
                  {rawTemplateContent || "Select a template to view its content"}
                </pre>
              )}
            </ScrollArea>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(rawTemplateContent, "Raw template copied to clipboard")}
              disabled={!rawTemplateContent}
              className="w-full"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Raw Template
            </Button>
          </TabsContent>
          
          <TabsContent value="processed" className="space-y-4 mt-4">
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
            
            <ScrollArea className="h-60 border rounded-md p-4">
              <pre className="font-mono text-sm whitespace-pre-wrap">
                {processedTemplate || "Process a template to see the result"}
              </pre>
            </ScrollArea>
            
            <div className="grid grid-cols-2 gap-2">
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
                variant="default"
                size="sm"
                onClick={handleGenerateLLM}
                disabled={!processedTemplate || isGeneratingLLM}
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
          
          <TabsContent value="response" className="space-y-4 mt-4">
            <ScrollArea className="h-80 border rounded-md p-4">
              <div className="font-mono text-sm whitespace-pre-wrap">
                {llmResponse || "Generate an LLM response to see the result"}
              </div>
            </ScrollArea>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(llmResponse, "LLM response copied to clipboard")}
              disabled={!llmResponse}
              className="w-full"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy LLM Response
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 