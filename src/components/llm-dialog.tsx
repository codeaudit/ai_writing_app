'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverAnchor,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, RefreshCw, Check, X, FileText, Trash2, ChevronDown } from "lucide-react";
import { useLLMStore, useDocumentStore } from "@/lib/store";
import { generateText } from "@/lib/llm-service";
import { toast } from "@/components/ui/use-toast";
import { LLM_PROVIDERS, LLM_MODELS } from "@/lib/config";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { editor as monacoEditor } from "monaco-editor";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchTemplates } from "@/lib/api-service";

interface LLMDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedText: string;
  position: { x: number; y: number } | null;
  editor?: monacoEditor.IStandaloneCodeEditor | null;
  selection?: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number } | null;
}

interface ContextFile {
  id: string;
  name: string;
}

interface ProviderOption {
  value: keyof typeof LLM_MODELS;
  label: string;
}

interface ModelOption {
  value: string;
  label: string;
}

interface TemplateItem {
  name: string;
  path: string;
}

export function LLMDialog({ isOpen, onClose, selectedText, position, editor, selection }: LLMDialogProps) {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [modelInfo, setModelInfo] = useState<{ model: string; provider: string } | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [editorLeftPosition, setEditorLeftPosition] = useState<number>(0);
  const [contextFiles, setContextFiles] = useState<ContextFile[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [templateValid, setTemplateValid] = useState<boolean>(false);
  const [templateError, setTemplateError] = useState<string>("");
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const { config, updateConfig } = useLLMStore();
  const { documents } = useDocumentStore();
  
  // Store the range of the inserted text for later reference
  const [insertedTextRange, setInsertedTextRange] = useState<{
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  } | null>(null);
  
  // Store the original text that was inserted
  const [insertedText, setInsertedText] = useState<string>("");

  // Store decorations IDs for removal later
  const [decorations, setDecorations] = useState<string[]>([]);

  // Load context files from localStorage when dialog opens
  useEffect(() => {
    if (isOpen) {
      loadContextFiles();
    }
  }, [isOpen]);
  
  // Function to load context files from localStorage
  const loadContextFiles = () => {
    try {
      const contextData = localStorage.getItem('aiComposerContext');
      if (contextData) {
        const parsedContext = JSON.parse(contextData) as ContextFile[];
        setContextFiles(parsedContext);
      }
    } catch (error) {
      console.error('Error loading context files:', error);
    }
  };
  
  // Listen for context updates from the Composition Composer
  useEffect(() => {
    const handleContextUpdate = (event: CustomEvent<{ context: ContextFile[] }>) => {
      setContextFiles(event.detail.context);
    };
    
    // Add event listener
    window.addEventListener('aiContextUpdated', handleContextUpdate as EventListener);
    
    // Clean up
    return () => {
      window.removeEventListener('aiContextUpdated', handleContextUpdate as EventListener);
    };
  }, []);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      // Clear response when dialog closes
      setResponse("");
      setModelInfo(null);
    }
  }, [isOpen]);

  // Save LLM config to cookies on component mount
  useEffect(() => {
    useLLMStore.getState().saveToCookies();
  }, []);

  // Get the editor's left position when the component mounts or when the editor changes
  useEffect(() => {
    if (editor) {
      const editorContainer = editor.getContainerDomNode();
      const editorRect = editorContainer.getBoundingClientRect();
      setEditorLeftPosition(editorRect.left);
    }
  }, [editor]);

  // Load templates from API when dialog opens
  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  // Function to load templates from API
  const loadTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const templateList = await fetchTemplates();
      setTemplates(templateList);
      
      // Keep the blank selection as default
      setSelectedTemplate("none");
      setTemplateValid(true);
      setPrompt("");
    } catch (error) {
      console.error("Error loading templates:", error);
      setTemplateError("Failed to load templates");
      setTemplates([]);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const handleSubmit = async () => {
    if (!prompt.trim()) return;
    
    setIsLoading(true);
    setResponse("");
    
    try {
      // Create a prompt that includes the selected text and context files
      let fullPrompt = `Selected Text: ${selectedText}\n\n`;
      
      // Add context files if available
      if (contextFiles.length > 0) {
        fullPrompt += "Context Files:\n";
        
        // Find the actual document content for each context file
        for (const contextFile of contextFiles) {
          const document = documents.find(doc => doc.id === contextFile.id);
          if (document) {
            fullPrompt += `--- ${document.name} ---\n${document.content}\n\n`;
          }
        }
        
        fullPrompt += "\n";
      }
      
      fullPrompt += `User Query: ${prompt}\n\nPlease provide a helpful response based on the selected text, context files, and user query.`;
      
      // Call the server action
      const result = await generateText({ 
        prompt: fullPrompt,
        stream: false // We don't support streaming in the dialog yet
      });
      
      // Update the response and model info
      setResponse(result.text);
      setModelInfo({
        model: result.model,
        provider: result.provider
      });

      // Close the initial dialog and clear the prompt
      onClose();
      setPrompt("");
      
      // Apply the changes to the editor with highlighting
      if (editor && selection) {
        applyChangesToEditor(result.text);
      }
      
      // Clear the response after it's been applied to the editor
      setResponse("");
      setModelInfo(null);
    } catch (error) {
      console.error('Error generating LLM response:', error);
      setResponse("Sorry, I encountered an error while processing your request. Please try again later.");
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate response",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const removeContextFile = (id: string) => {
    const updatedFiles = contextFiles.filter(file => file.id !== id);
    setContextFiles(updatedFiles);
    localStorage.setItem('aiComposerContext', JSON.stringify(updatedFiles));
  };

  const clearAllContextFiles = () => {
    setContextFiles([]);
    localStorage.removeItem('aiComposerContext');
  };

  const applyChangesToEditor = (responseText: string) => {
    if (!editor || !selection) return;
    
    const model = editor.getModel();
    if (!model) return;
    
    // Get the end position of the selection
    const endLineNumber = selection.endLineNumber;
    const endColumn = selection.endColumn;
    
    // Format the text to insert with newlines
    const insertText = `\n\n${responseText}`;
    
    // Store the inserted text for later reference
    setInsertedText(insertText);
    
    // Insert the response text after the selection
    const insertOperation = { range: { startLineNumber: endLineNumber, startColumn: endColumn, endLineNumber, endColumn }, text: insertText };
    
    // Apply the edit
    model.pushEditOperations([], [insertOperation], () => null);
    
    // Calculate the range of the inserted text
    const insertedStartLine = endLineNumber;
    const insertedStartColumn = endColumn;
    
    // Get the exact end position after insertion
    const lines = insertText.split('\n');
    let newEndLine = insertedStartLine + lines.length - 1;
    let newEndColumn = lines.length > 1 
      ? lines[lines.length - 1].length + 1 
      : insertedStartColumn + insertText.length;
    
    // Store the range of the inserted text
    setInsertedTextRange({
      startLineNumber: insertedStartLine,
      startColumn: insertedStartColumn,
      endLineNumber: newEndLine,
      endColumn: newEndColumn
    });
    
    // Add decorations
    const oldDecorations = model.deltaDecorations([], [
      // Highlight the original selection in light red
      {
        range: selection,
        options: {
          inlineClassName: 'original-text-highlight',
          hoverMessage: { value: 'Original text' }
        }
      },
      // Highlight the new text in green
      {
        range: {
          startLineNumber: insertedStartLine,
          startColumn: insertedStartColumn,
          endLineNumber: newEndLine,
          endColumn: newEndColumn
        },
        options: {
          inlineClassName: 'new-text-highlight',
          hoverMessage: { value: 'Generated text' }
        }
      }
    ]);
    
    setDecorations(oldDecorations);
    
    // Update the editor's left position
    const editorContainer = editor.getContainerDomNode();
    const editorRect = editorContainer.getBoundingClientRect();
    setEditorLeftPosition(editorRect.left);
    
    // Show confirmation dialog
    setShowConfirmation(true);
    
    // Scroll to make the inserted text visible
    editor.revealLineInCenter(newEndLine);
  };

  const handleAcceptChanges = () => {
    if (!editor || !selection || !insertedTextRange) return;
    
    const model = editor.getModel();
    if (!model) return;
    
    // Remove decorations
    if (decorations.length > 0) {
      model.deltaDecorations(decorations, []);
      setDecorations([]);
    }
    
    // Remove the original selected text
    model.pushEditOperations([], [
      { range: selection, text: '' }
    ], () => null);
    
    setShowConfirmation(false);
    
    toast({
      title: "Changes applied",
      description: "The generated text has been applied to your document.",
    });
  };

  const handleRejectChanges = () => {
    if (!editor || !selection || !insertedTextRange) return;
    
    const model = editor.getModel();
    if (!model) return;
    
    // Remove only the inserted text using the exact range we stored
    model.pushEditOperations([], [
      { 
        range: insertedTextRange, 
        text: '' 
      }
    ], () => null);
    
    // Remove decorations
    if (decorations.length > 0) {
      model.deltaDecorations(decorations, []);
      setDecorations([]);
    }
    
    setShowConfirmation(false);
    
    toast({
      title: "Changes rejected",
      description: "The generated text has been removed.",
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Add a helper function to get the model label
  const getModelLabel = (modelValue: string) => {
    for (const provider of LLM_PROVIDERS) {
      const model = LLM_MODELS[provider.value as keyof typeof LLM_MODELS]
        .find(m => m.value === modelValue);
      if (model) return model.label;
    }
    return modelValue;
  };

  // This function is for the template dropdown in the LLM dialog
  const handleTemplateSelection = (templateId: string) => {
    // Set the selected template
    setSelectedTemplate(templateId);
    setTemplateValid(true);
    setTemplateError("");
    
    // If blank option selected, clear the prompt
    if (templateId === "none") {
      setPrompt("");
      return;
    }
    
    // Find the template in the templates array
    const template = templates.find((t) => t.name === templateId);
    if (template) {
      // Update the prompt based on template name (simplified version)
      setPrompt(`Can you help with: ${template.name}?`);
    }
  };

  return (
    <>
      <Popover open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <PopoverAnchor>
          <div style={{ 
              position: 'absolute', 
              left: position?.x || 0, 
              top: position?.y || 0,
              width: '1px',
              height: '1px'
            }} 
          />
        </PopoverAnchor>
        <PopoverContent 
          className="w-80 p-4" 
          side="bottom" 
          align="start"
          sideOffset={10}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="relative">
                <Select
                  value={selectedTemplate}
                  onValueChange={handleTemplateSelection}
                  disabled={templates.length === 0 || isLoading || isLoadingTemplates}
                >
                  <SelectTrigger 
                    className="h-7 px-2 text-xs"
                  >
                    <SelectValue placeholder={isLoadingTemplates ? "Loading templates..." : "Select template"} />
                  </SelectTrigger>
                  <SelectContent align="start" className="w-48">
                    <SelectItem value="none" className="text-xs py-1 text-muted-foreground italic">
                      No template
                    </SelectItem>
                    {templates.map((template) => (
                      <SelectItem key={template.name} value={template.name} className="text-xs py-1">
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {templateError && (
                  <p className="text-xs text-red-500 absolute -bottom-4">{templateError}</p>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-7 px-2 text-xs"
                  >
                    {getModelLabel(config.model)}
                    <ChevronDown className="ml-1 h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {(LLM_PROVIDERS as ProviderOption[]).map((provider: ProviderOption) => (
                    <div key={provider.value}>
                      <DropdownMenuLabel className="text-xs text-muted-foreground px-2 py-1">
                        {provider.label}
                      </DropdownMenuLabel>
                      {LLM_MODELS[provider.value].map((model: ModelOption) => (
                        <DropdownMenuItem 
                          key={model.value}
                          onClick={() => updateConfig({ 
                            provider: provider.value, 
                            model: model.value 
                          })}
                          className="text-xs py-1"
                        >
                          {model.label}
                        </DropdownMenuItem>
                      ))}
                      {provider.value !== 'openrouter' && <DropdownMenuSeparator className="my-0.5" />}
                    </div>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {contextFiles.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium text-muted-foreground">Context Files</div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 px-2 text-xs" 
                    onClick={clearAllContextFiles}
                  >
                    Clear All
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {contextFiles.map(file => (
                    <Badge key={file.id} variant="secondary" className="flex items-center gap-1 text-xs py-1">
                      <FileText className="h-3 w-3" />
                      <span className="max-w-[100px] truncate">{file.name}</span>
                      <button 
                        className="ml-1 rounded-full hover:bg-muted p-0.5" 
                        onClick={() => removeContextFile(file.id)}
                      >
                        <X className="h-2 w-2" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <Input
                placeholder="Ask a question..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1"
              />
              <Button 
                size="icon" 
                onClick={handleSubmit} 
                disabled={isLoading || !prompt.trim()}
              >
                {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            
            {response && (
              <div className="p-3 bg-muted rounded-md text-sm">
                {response}
                {modelInfo && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Generated with {modelInfo.provider} {modelInfo.model}
                  </div>
                )}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
      
      {showConfirmation && (
        <div 
          className="fixed z-50 bg-background border rounded-lg shadow-lg p-4 w-80"
          style={{
            left: `${editorLeftPosition + 100}px`,
            top: '50%',
            transform: 'translateY(-50%)'
          }}
        >
          <div className="space-y-4">
            <div className="font-medium">Apply Changes?</div>
            <div className="text-sm text-muted-foreground">
              Do you want to apply the generated text and remove the original selection?
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <Button variant="outline" onClick={handleRejectChanges} className="h-8 px-3 text-xs">
                <X className="h-3 w-3 mr-2" />
                Reject
              </Button>
              <Button onClick={handleAcceptChanges} className="h-8 px-3 text-xs">
                <Check className="h-3 w-3 mr-2" />
                Accept
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 