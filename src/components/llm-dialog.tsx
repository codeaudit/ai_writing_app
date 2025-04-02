'use client';

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Popover,
  PopoverContent,
  PopoverAnchor,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, RefreshCw, Check, X, FileText, ChevronDown } from "lucide-react";
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
import { editor as monacoEditor } from "monaco-editor";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchTemplates, processTemplate } from "@/lib/api-service";

// Define window.electron for TypeScript
declare global {
  interface Window {
    electron?: {
      saveTemplate: (template: { name: string; content: string; category: string }) => Promise<void>;
      getTemplates: () => Promise<Array<{
        name: string;
        path?: string;
        category?: string;
        createdAt?: string;
        updatedAt?: string;
      }>>;
      processTemplate?: (params: { path: string; variables: Record<string, string> }) => Promise<string>;
      getTemplateContent?: (path: string) => Promise<string>;
    };
  }
}

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
  path?: string;
  category?: string;
}

// Simple check if we're in an Electron environment
function isElectron(): boolean {
  return typeof window !== 'undefined' && 
         !!window.electron;
}

// Function to get templates in an Electron environment
async function getElectronTemplates(): Promise<TemplateItem[]> {
  if (!isElectron()) {
    return [];
  }
  
  try {
    const templates = await window.electron?.getTemplates() || [];
    return templates.map(template => ({
      name: template.name,
      path: template.path || template.name, // Fallback to name if path is missing
      category: template.category
    }));
  } catch (error) {
    console.error("Error getting Electron templates:", error);
    return [];
  }
}

// Function to process an Electron template
async function processElectronTemplate(templatePath: string, variables: Record<string, string>): Promise<string> {
  if (!isElectron() || !window.electron?.processTemplate) {
    throw new Error("Template processing not available");
  }
  
  try {
    return await window.electron.processTemplate({ path: templatePath, variables }) || "";
  } catch (error) {
    console.error("Error processing Electron template:", error);
    throw error;
  }
}

// Function to get template content in an Electron environment
async function getElectronTemplateContent(templatePath: string): Promise<string> {
  if (!isElectron() || !window.electron?.getTemplateContent) {
    throw new Error("Template content not available");
  }
  
  try {
    return await window.electron.getTemplateContent(templatePath) || "";
  } catch (error) {
    console.error("Error getting Electron template content:", error);
    throw error;
  }
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

  // Create refs for focus management
  const inputRef = useRef<HTMLInputElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);

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
      let templateList;
      
      // Check if running in Electron
      if (isElectron()) {
        // Use Electron's template functions
        templateList = await getElectronTemplates();
      } else {
        // Use web API for templates
        templateList = await fetchTemplates();
      }
      
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

  // Focus the input field when the dialog opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Short timeout to ensure the dialog is fully rendered before focusing
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    // Allow empty prompt if a template is selected
    if (!prompt.trim() && (selectedTemplate === "none" || !selectedTemplate)) return;
    
    setIsLoading(true);
    setResponse("");
    
    try {
      let finalPrompt = prompt;
      
      // If a template is selected (and it's not the "none" option), process it first
      if (selectedTemplate && selectedTemplate !== "none") {
        try {
          // Prepare context variables for the template
          const variables: Record<string, string> = {
            selectedText: selectedText || "",
            userPrompt: prompt || ""
          };
          
          // Add context files to variables if available
          if (contextFiles.length > 0) {
            let contextFilesContent = "";
            
            // Find the actual document content for each context file
            for (const contextFile of contextFiles) {
              const document = documents.find(doc => doc.id === contextFile.id);
              if (document) {
                contextFilesContent += `--- ${document.name} ---\n${document.content}\n\n`;
              }
            }
            
            variables.contextFiles = contextFilesContent;
          }
          
          // Process the template with variables
          if (isElectron()) {
            // Use Electron's template processing
            finalPrompt = await processElectronTemplate(selectedTemplate, variables);
          } else {
            // Use web API for template processing
            finalPrompt = await processTemplate(selectedTemplate, variables);
          }
          
          // Ensure we have content - this is a critical validation step
          if (!finalPrompt || finalPrompt.trim() === "") {
            toast({
              title: "Template Error",
              description: "The processed template returned empty content. Please try a different template.",
              variant: "destructive"
            });
            setIsLoading(false);
            return; // Don't proceed with empty content
          }
        } catch (error) {
          console.error('Error processing template:', error);
          toast({
            title: "Template Error",
            description: "Failed to process template. Using fallback content instead.",
            variant: "destructive"
          });
          // Create a fallback prompt with essential information
          finalPrompt = `Selected Text: ${selectedText || "(No text selected)"}\n\n`;
          
          // Add context files if available
          if (contextFiles.length > 0) {
            finalPrompt += "Context Files:\n";
            contextFiles.forEach(file => {
              const document = documents.find(doc => doc.id === file.id);
              if (document) {
                finalPrompt += `--- ${document.name} ---\n[Document content included]\n\n`;
              }
            });
          }
          
          finalPrompt += `User Request: ${prompt || "Please analyze the provided text."}\n\n`;
          finalPrompt += `The template "${selectedTemplate}" failed to process. Please analyze the content anyway.`;
        }
      } else {
        // Create a prompt that includes the selected text and context files
        finalPrompt = `Selected Text: ${selectedText || "(No text selected)"}\n\n`;
        
        // Add context files if available
        if (contextFiles.length > 0) {
          finalPrompt += "Context Files:\n";
          
          // Find the actual document content for each context file
          for (const contextFile of contextFiles) {
            const document = documents.find(doc => doc.id === contextFile.id);
            if (document) {
              finalPrompt += `--- ${document.name} ---\n${document.content}\n\n`;
            }
          }
          
          finalPrompt += "\n";
        }
        
        finalPrompt += `User Query: ${prompt || "Please help with the following task"}\n\nPlease provide a helpful response based on the selected text, context files, and user query.`;
      }
      
      // Final check for empty content before sending to LLM service
      if (!finalPrompt || finalPrompt.trim() === "") {
        toast({
          title: "Error",
          description: "Cannot send empty content to the AI. Please provide some input or select a template.",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }
      
      // Call the server action with the final prompt
      const result = await generateText({ 
        prompt: finalPrompt,
        stream: false, // We don't support streaming in the dialog yet
        aiRole: config.aiRole || 'assistant' // Include the AI role from config
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
    const newEndLine = insertedStartLine + lines.length - 1;
    const newEndColumn = lines.length > 1 
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

  const handleKeepBothChanges = () => {
    if (!editor || !selection || !insertedTextRange) return;
    
    const model = editor.getModel();
    if (!model) return;
    
    // Remove decorations but keep both texts
    if (decorations.length > 0) {
      model.deltaDecorations(decorations, []);
      setDecorations([]);
    }
    
    setShowConfirmation(false);
    
    toast({
      title: "Both texts kept",
      description: "Both the original and generated text have been kept.",
    });
  };

  // Handle key down events for the prompt input
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Function to handle key down events for the entire dialog
  const handleDialogKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Prevent the popover from closing when tabbing
    if (e.key === "Tab") {
      e.stopPropagation();
    }
    
    // Close the dialog when pressing escape
    if (e.key === "Escape") {
      onClose();
    }
  }, [onClose]);

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
      // Attempt to load the template preview
      const loadTemplatePreview = async () => {
        try {
          setIsLoading(true);
          
          // Prepare basic variables for preview - these will just be placeholders
          const variables: Record<string, string> = {
            selectedText: selectedText || "[Selected text will appear here]",
            userPrompt: prompt || "[Your input will go here]"
          };
          
          // Add context files to variables if available
          if (contextFiles.length > 0) {
            let contextFilesContent = "Context Files:\n";
            
            // Find the actual document content for each context file
            for (const contextFile of contextFiles) {
              const document = documents.find(doc => doc.id === contextFile.id);
              if (document) {
                contextFilesContent += `--- ${document.name} ---\n[Document content will be included]\n\n`;
              }
            }
            
            variables.contextFiles = contextFilesContent;
          }
          
          let previewContent = "";
          
          if (isElectron()) {
            // For Electron, first get the raw content, then process with basic variables
            previewContent = await getElectronTemplateContent(templateId);
            
            // Show a simplified preview or try to process it with placeholder variables
            if (previewContent) {
              try {
                previewContent = await processElectronTemplate(templateId, variables);
              } catch (_error) {
                // If processing fails, just show raw content with a note
                previewContent = `Template Preview (unprocessed):\n\n${previewContent}`;
              }
            }
          } else {
            // For web, try to get the raw content first
            try {
              const response = await fetch(`/api/templates/preview?name=${encodeURIComponent(templateId)}`);
              if (response.ok) {
                const data = await response.json();
                previewContent = data.content;
                
                // Try to process the template with placeholder variables
                try {
                  previewContent = await processTemplate(templateId, variables);
                } catch (_error) {
                  // If processing fails, just show raw content with a note
                  previewContent = `Template Preview (unprocessed):\n\n${previewContent}`;
                }
              }
            } catch (error) {
              console.error('Error loading template preview:', error);
              setTemplateError("Couldn't load template preview");
            }
          }
          
          // Set the preview as the prompt text (don't include placeholder text when empty)
          if (previewContent && previewContent.trim() !== "") {
            setPrompt(previewContent);
          } else {
            setPrompt(`[Template: ${templateId}] (No preview available)`);
          }
        } catch (error) {
          console.error('Error loading template preview:', error);
          setTemplateError("Couldn't load template preview");
          setPrompt(`[Template: ${templateId}] (Preview failed to load)`);
        } finally {
          setIsLoading(false);
        }
      };
      
      loadTemplatePreview();
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
          onKeyDown={handleDialogKeyDown}
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
                    tabIndex={2}
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
                    tabIndex={3}
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
                        aria-label="Remove context file"
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
                ref={inputRef}
                placeholder="Ask a question..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleInputKeyDown}
                className="flex-1"
                tabIndex={1}
              />
              <Button 
                ref={submitButtonRef}
                size="icon" 
                onClick={handleSubmit} 
                disabled={isLoading || (!prompt.trim() && (selectedTemplate === "none" || !selectedTemplate))}
                tabIndex={4}
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
          className="fixed z-50 bg-background border rounded-lg shadow-lg p-4 w-[300px]"
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
            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="outline" onClick={handleRejectChanges} className="h-8 px-2 text-xs flex-1">
                <X className="h-3 w-3 mr-1" />
                Reject
              </Button>
              <Button 
                variant="secondary" 
                onClick={handleKeepBothChanges} 
                className="h-8 px-2 text-xs flex-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50"
                aria-label="Keep Both"
              >
                <FileText className="h-3 w-3 mr-1" />
                Keep Both
              </Button>
              <Button onClick={handleAcceptChanges} className="h-8 px-2 text-xs flex-1">
                <Check className="h-3 w-3 mr-1" />
                Accept
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 