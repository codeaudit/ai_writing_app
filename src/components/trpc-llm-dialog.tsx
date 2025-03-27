'use client';

import React, { useState, useEffect, useRef } from "react";
import {
  Popover,
  PopoverContent,
  PopoverAnchor,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, RefreshCw, X, ChevronDown } from "lucide-react";
import { useDocumentStore } from "@/lib/store";
import { useTrpcConfigStore } from "@/lib/trpc-config-store";
import { useTemplateStore } from "@/lib/trpc-template-store";
import { trpc } from "@/utils/trpc";
import { toast } from "@/components/ui/use-toast";
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Interface for the Monaco Editor
interface MonacoEditor {
  IStandaloneCodeEditor: any;
}

// Interface for context files (existing files used as context for the AI)
interface ContextFile {
  id: string;
  name: string;
  selected: boolean;
}

interface TrpcLLMDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedText: string;
  editor?: any; // Monaco editor instance
  selection?: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number } | null;
}

export function TrpcLLMDialog({ isOpen, onClose, selectedText, editor, selection }: TrpcLLMDialogProps) {
  // Local state
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [modelInfo, setModelInfo] = useState<{ model: string; provider: string } | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [contextFiles, setContextFiles] = useState<ContextFile[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [templateError, setTemplateError] = useState<string>("");
  
  // Store the range of the inserted text for later reference
  const [insertedTextRange, setInsertedTextRange] = useState<{
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  } | null>(null);

  // Store decorations IDs for removal later
  const [decorations, setDecorations] = useState<string[]>([]);

  // Create refs for focus management
  const inputRef = useRef<HTMLInputElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  // Access stores
  const { config, saveConfig } = useTrpcConfigStore();
  const { templates, loadTemplates, processTemplate } = useTemplateStore();
  const { documents } = useDocumentStore();
  
  // tRPC hooks
  const generateText = trpc.llm.generateText.useMutation({
    onSuccess: (data) => {
      // After text is generated successfully
      setResponse(data.text);
      setModelInfo({
        model: data.model,
        provider: config.provider, // Use the provider from config since it's not in the response
      });
      
      // Close the initial dialog and clear the prompt
      onClose();
      setPrompt("");
      
      // Apply the changes to the editor with highlighting
      if (editor && selection) {
        applyChangesToEditor(data.text);
      }
    },
    onError: (error) => {
      setIsLoading(false);
      toast({
        title: "Error",
        description: error.message || "Failed to generate text. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Load available models
  const { data: availableModels } = trpc.config.getAvailableModels.useQuery(
    { provider: config.provider },
    { enabled: isOpen }
  );

  // Load context files from localStorage when dialog opens
  useEffect(() => {
    if (isOpen) {
      loadContextFiles();
      loadTemplates();
    }
  }, [isOpen, loadTemplates]);
  
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

  // Focus the input field when the dialog opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Short timeout to ensure the dialog is fully rendered before focusing
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Handle form submission
  const handleSubmit = async () => {
    // Allow empty prompt if a template is selected
    if (!prompt.trim() && !selectedTemplateId) return;
    
    setIsLoading(true);
    setResponse("");
    
    try {
      let finalPrompt = prompt;
      
      // If a template is selected, process it first
      if (selectedTemplateId) {
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
          finalPrompt = await processTemplate(selectedTemplateId, variables);
        } catch (error) {
          console.error('Error processing template:', error);
          toast({
            title: "Template Error",
            description: "Failed to process the template. Using raw prompt instead.",
            variant: "destructive"
          });
          
          // Fallback to raw prompt if template processing fails
          finalPrompt = prompt;
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
      
      // Call the tRPC mutation to generate text
      generateText.mutate({ 
        prompt: finalPrompt,
        stream: false,
        aiRole: config.aiRole
      });
    } catch (error) {
      console.error('Error generating text:', error);
      toast({
        title: "Error",
        description: "Failed to generate text. Please try again.",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  // Handle key press in input field
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // This function updates the editor with generated text and adds the highlighting
  const applyChangesToEditor = (text: string) => {
    if (!editor || !selection) return;
    
    // Start a new stack element so the entire operation can be undone with a single undo
    editor.pushUndoStop();
    
    // Create an edit operation to replace the selected text
    const editOperation = {
      range: selection,
      text,
      forceMoveMarkers: true,
    };
    
    // Execute the operation
    editor.executeEdits('ai-edit', [editOperation]);

    // Get the updated selection after insertion
    const selectionAfterInsertion = editor.getSelection();
    
    if (selectionAfterInsertion) {
      // Convert the selection to a range
      const range = {
        startLineNumber: selectionAfterInsertion.startLineNumber,
        startColumn: selectionAfterInsertion.startColumn,
        endLineNumber: selectionAfterInsertion.endLineNumber,
        endColumn: selectionAfterInsertion.endColumn,
      };
      
      // Store the range for reference
      setInsertedTextRange(range);
      
      // Add highlighting to the inserted text
      const newDecorations = editor.deltaDecorations([], [
        {
          range: range,
          options: {
            className: 'ai-generated-text', // This class should be defined in your CSS
            isWholeLine: false,
            hoverMessage: { value: 'AI-generated text' },
          },
        },
      ]);
      
      // Save decoration IDs for removal later
      setDecorations(newDecorations);
      
      // Focus the editor
      editor.focus();
      
      // Position cursor at the end of the inserted text
      editor.setPosition({
        lineNumber: range.endLineNumber,
        column: range.endColumn,
      });
      
      // Create the confirmation dialog
      setShowConfirmation(true);
    }
  };

  // Accept the changes and keep the text
  const acceptChanges = () => {
    // Clear decorations
    if (editor && decorations.length > 0) {
      editor.deltaDecorations(decorations, []);
      setDecorations([]);
    }
    
    // Close the confirmation dialog
    setShowConfirmation(false);
    
    // Reset state
    setInsertedTextRange(null);
    setResponse("");
  };

  // Reject the changes and restore the original text
  const rejectChanges = () => {
    if (editor && insertedTextRange) {
      // Start a new undo operation
      editor.pushUndoStop();
      
      // Create an edit operation to replace the AI text with the original selection
      const editOperation = {
        range: insertedTextRange,
        text: selectedText,
        forceMoveMarkers: true,
      };
      
      // Execute the operation
      editor.executeEdits('ai-revert', [editOperation]);
      
      // Clear decorations
      if (decorations.length > 0) {
        editor.deltaDecorations(decorations, []);
        setDecorations([]);
      }
      
      // Close the confirmation dialog
      setShowConfirmation(false);
      
      // Reset state
      setInsertedTextRange(null);
      setResponse("");
      
      // Focus the editor
      editor.focus();
    }
  };

  // Handle template selection
  const handleTemplateSelection = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setTemplateError("");
    
    // If "none" selected, clear the selected template
    if (templateId === "none") {
      setSelectedTemplateId("");
      return;
    }
  };

  // Update the LLM config
  const updateModelConfig = (provider: string, model: string) => {
    saveConfig({
      provider: provider as 'openai' | 'anthropic' | 'gemini',
      model
    });
  };

  // Get model display name
  const getModelDisplayName = (modelId: string) => {
    if (!availableModels) return modelId;
    
    const model = availableModels.find(m => m.id === modelId);
    return model ? model.name : modelId;
  };

  return (
    <>
      <Popover open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <PopoverAnchor className="fixed inset-0 z-50 pointer-events-none" />
        <PopoverContent
          className="w-[480px] fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 max-h-[80vh] overflow-y-auto"
          side="bottom"
          align="start"
        >
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">AI Assistant</h3>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {contextFiles.length > 0 && (
              <div className="flex flex-wrap gap-1">
                <span className="text-xs text-muted-foreground">Context:</span>
                {contextFiles.map((file) => (
                  <Badge key={file.id} variant="secondary" className="text-xs">
                    {file.name}
                  </Badge>
                ))}
              </div>
            )}
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Select 
                  value={selectedTemplateId || "none"} 
                  onValueChange={handleTemplateSelection}
                >
                  <SelectTrigger className="w-full text-xs h-7">
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No template</SelectItem>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {templateError && (
                <div className="text-xs text-red-500">{templateError}</div>
              )}
            </div>
            
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-7 px-2 text-xs"
                  >
                    {getModelDisplayName(config.model)}
                    <ChevronDown className="ml-1 h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {availableModels && availableModels.length > 0 ? (
                    <>
                      {/* Group models by provider */}
                      {['openai', 'anthropic', 'gemini'].map(provider => {
                        const providerModels = availableModels.filter(m => m.provider === provider);
                        if (providerModels.length === 0) return null;
                        
                        return (
                          <div key={provider}>
                            <DropdownMenuLabel className="text-xs text-muted-foreground px-2 py-1">
                              {provider === 'openai' ? 'OpenAI' : 
                               provider === 'anthropic' ? 'Anthropic' : 
                               provider === 'gemini' ? 'Google' : provider}
                            </DropdownMenuLabel>
                            {providerModels.map(model => (
                              <DropdownMenuItem 
                                key={model.id}
                                onClick={() => updateModelConfig(provider, model.id)}
                                className="text-xs py-1"
                              >
                                {model.name}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator className="my-0.5" />
                          </div>
                        );
                      })}
                    </>
                  ) : (
                    <DropdownMenuItem disabled className="text-xs py-1">
                      Loading models...
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <div className="flex items-center space-x-2">
              <Input
                ref={inputRef}
                placeholder="Ask a question..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleInputKeyDown}
                className="flex-1"
              />
              <Button 
                ref={submitButtonRef}
                size="icon" 
                onClick={handleSubmit} 
                disabled={isLoading || (!prompt.trim() && !selectedTemplateId)}
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
      
      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent className="w-[400px] fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
          <AlertDialogHeader>
            <AlertDialogTitle>AI-Generated Text</AlertDialogTitle>
            <AlertDialogDescription>
              Do you want to keep the AI-generated text?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={rejectChanges}>Reject</AlertDialogCancel>
            <AlertDialogAction onClick={acceptChanges}>Accept</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 