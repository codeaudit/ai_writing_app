"use client";

import { useState, useRef, useEffect } from 'react';
import { useChat } from 'ai/react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Send, User, Bot, AtSign, X, FileText, ChevronDown, ChevronUp, Eraser, ArrowLeft, Bug, Copy, Check, RefreshCw, Maximize2, Minimize2 } from 'lucide-react';
import { useDocumentStore, useLLMStore } from "@/lib/store";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import AIDebugPanel from "@/components/ai-debug-panel";
import { formatDebugPrompt } from "@/lib/ai-debug";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  model?: string;
  provider?: string;
}

interface ContextDocument {
  id: string;
  name: string;
  content: string;
}

interface AIChatProps {
  documentContent?: string;
  onInsertText?: (text: string) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export default function AIChat({ documentContent, onInsertText, isExpanded, onToggleExpand }: AIChatProps) {
  const { documents, selectedDocumentId, updateDocument } = useDocumentStore();
  const { config } = useLLMStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState<string | null>(null);
  const [contextDocuments, setContextDocuments] = useState<ContextDocument[]>([]);
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  
  // Autocomplete state
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompletePosition, setAutocompletePosition] = useState({ top: 0, left: 0 });
  const [selectedAutocompleteIndex, setSelectedAutocompleteIndex] = useState(0);
  const [filteredDocuments, setFilteredDocuments] = useState<Array<{ id: string; name: string; content: string }>>([]);

  const [showClearConfirmation, setShowClearConfirmation] = useState(false);
  const [lastPrompt, setLastPrompt] = useState<string>("");
  const [showDebugDialog, setShowDebugDialog] = useState(false);

  // Get the selected document
  const selectedDocument = documents.find(doc => doc.id === selectedDocumentId);

  // Initialize chat with AI SDK
  const { messages: aiMessages, input: aiInput, handleInputChange: aiHandleInputChange, handleSubmit: aiHandleSubmit, isLoading: aiIsLoading, error, setMessages: setAiMessages } = useChat({
    api: '/api/ai',
    body: {
      context: documentContent,
      contextDocuments
    },
    onResponse: (response) => {
      // You can handle the response here if needed
      console.log('AI response received');
      
      // We'll rely on the handleFormSubmit method to set the last prompt
      // since we can't easily access the request body from the response
    },
    onError: (error) => {
      console.error('Error in AI chat:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate response",
        variant: "destructive",
        duration: 5000, // Auto-dismiss after 5 seconds for errors
      });
    }
  });

  // Update useEffect to watch for errors and display toast notifications
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
        duration: 5000, // Auto-dismiss after 5 seconds for errors
      });
    }
  }, [error]);

  // Scroll to bottom of messages when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, aiMessages]);

  const generateId = () => `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!input.trim() || !selectedDocumentId) return;
    
    // Create context for the AI
    const contextData = {
      context: documentContent,
      contextDocuments: contextDocuments.map(doc => ({
        title: doc.name,
        content: doc.content
      }))
    };
    
    // Create a debug version of the prompt that will be sent
    let debugSystemMessage = 'You are a helpful writing assistant.';
    
    if (documentContent) {
      debugSystemMessage += ` Use the following context to inform your responses: ${documentContent}`;
    }
    
    if (contextDocuments && contextDocuments.length > 0) {
      debugSystemMessage += ' Use the following additional context documents to inform your responses:\n\n';
      contextDocuments.forEach(doc => {
        debugSystemMessage += `Document: ${doc.name}\n${doc.content}\n\n`;
      });
    }
    
    // Store the debug prompt using our utility function
    setLastPrompt(formatDebugPrompt(
      debugSystemMessage,
      input,
      config.provider || 'openai',
      config.model || 'gpt-4o'
    ));
    
    // Submit with the AI SDK
    aiHandleSubmit(e, {
      body: contextData
    });
    
    // Clear input
    setInput("");
  };

  // Filter out documents that are already in context or are the current document
  const getAvailableDocuments = () => {
    return documents.filter(doc => 
      doc.id !== selectedDocumentId && 
      !contextDocuments.some(contextDoc => contextDoc.id === doc.id)
    );
  };

  // Handle input change to detect @ symbol for autocomplete
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);
    aiHandleInputChange(e);
    
    // Check if we should show autocomplete
    const lastAtIndex = value.lastIndexOf('@');
    
    if (lastAtIndex !== -1 && (lastAtIndex === 0 || /\s/.test(value[lastAtIndex - 1]))) {
      // Get the query text after the @ symbol
      const query = value.slice(lastAtIndex + 1).split(/\s/)[0].toLowerCase();
      
      // Filter documents based on the query
      const availableDocs = getAvailableDocuments();
      const filtered = availableDocs.filter(doc => 
        query ? doc.name.toLowerCase().includes(query) : true
      );
      
      setFilteredDocuments(filtered);
      
      if (filtered.length > 0) {
        // Position the autocomplete dropdown
        if (textareaRef.current) {
          const textarea = textareaRef.current;
          
          // Get textarea position
          const textareaRect = textarea.getBoundingClientRect();
          
          // Set position relative to the textarea
          setAutocompletePosition({
            top: textareaRect.height + 5, // Position below the textarea
            left: 0 // Align with the left edge of the textarea
          });
        }
        
        setShowAutocomplete(true);
        setSelectedAutocompleteIndex(0);
      } else {
        setShowAutocomplete(false);
      }
    } else {
      setShowAutocomplete(false);
    }
  };
  
  // Handle keyboard navigation in autocomplete
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Directly detect @ key press to trigger autocomplete
    if (e.key === '@') {
      // Get available documents for autocomplete
      const availableDocs = getAvailableDocuments();
      
      if (availableDocs.length > 0) {
        setFilteredDocuments(availableDocs);
        setShowAutocomplete(true);
        setSelectedAutocompleteIndex(0);
        
        // We still need to let the @ character be typed
        setTimeout(() => {
          if (textareaRef.current) {
            const cursorPos = textareaRef.current.selectionStart;
            if (input[cursorPos - 1] === '@') {
              console.log('@ character confirmed at position', cursorPos - 1);
            }
          }
        }, 0);
        
        return;
      }
    }
    
    // Handle autocomplete navigation
    if (showAutocomplete) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedAutocompleteIndex(prev => 
          prev < filteredDocuments.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedAutocompleteIndex(prev => prev > 0 ? prev - 1 : 0);
      } else if (e.key === 'Enter' && filteredDocuments.length > 0) {
        e.preventDefault();
        selectAutocompleteDocument(filteredDocuments[selectedAutocompleteIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowAutocomplete(false);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        if (filteredDocuments.length > 0) {
          selectAutocompleteDocument(filteredDocuments[selectedAutocompleteIndex]);
        }
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleFormSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
    }
  };
  
  // Select a document from autocomplete
  const selectAutocompleteDocument = (document: { id: string; name: string; content: string }) => {
    // Add document to context
    handleAddContextDocument(document);
    
    // Replace the @query with the document name
    const lastAtIndex = input.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const beforeAt = input.substring(0, lastAtIndex);
      const afterAt = input.substring(lastAtIndex).split(' ');
      afterAt.shift(); // Remove the @query part
      
      // Set the new input value
      setInput(beforeAt + document.name + ' ' + afterAt.join(' '));
    }
    
    // Hide autocomplete
    setShowAutocomplete(false);
    
    // Focus back on textarea
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleInsertResponse = (content: string) => {
    if (onInsertText) {
      onInsertText(content);
      
      toast({
        title: "Added to document",
        description: "AI response has been added to your document.",
        duration: 3000, // Auto-dismiss after 3 seconds
      });
    }
  };

  const handleCopyToClipboard = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setIsCopied(id);
    
    toast({
      title: "Copied to clipboard",
      description: "The content has been copied to your clipboard.",
      duration: 2000, // Auto-dismiss after 2 seconds
    });
    
    setTimeout(() => {
      setIsCopied(null);
    }, 2000);
  };

  const handleAddContextDocument = (document: { id: string; name: string; content: string }) => {
    // Check if document is already in context
    if (contextDocuments.some(doc => doc.id === document.id)) {
      toast({
        title: "Document already in context",
        description: `"${document.name}" is already added to the context.`,
        duration: 3000, // Auto-dismiss after 3 seconds
      });
      return;
    }
    
    // Check if document is the currently selected document
    if (document.id === selectedDocumentId) {
      toast({
        title: "Document already in context",
        description: `"${document.name}" is already the primary document.`,
        duration: 3000, // Auto-dismiss after 3 seconds
      });
      return;
    }
    
    // Add document to context
    setContextDocuments(prev => [...prev, document]);
    
    toast({
      title: "Document added to context",
      description: `"${document.name}" has been added to the conversation context.`,
      duration: 3000, // Auto-dismiss after 3 seconds
    });
    
    // Close the dropdown
    setIsContextMenuOpen(false);
  };

  const handleRemoveContextDocument = (documentId: string) => {
    const docToRemove = contextDocuments.find(doc => doc.id === documentId);
    setContextDocuments(prev => prev.filter(doc => doc.id !== documentId));
    
    toast({
      title: "Document removed",
      description: docToRemove ? `"${docToRemove.name}" removed from context.` : "Document removed from context.",
      duration: 3000, // Auto-dismiss after 3 seconds
    });
  };

  // Add a focus event handler for the textarea
  const handleFocus = () => {
    // Check if the input already contains an @ symbol
    const lastAtIndex = input.lastIndexOf('@');
    if (lastAtIndex !== -1 && (lastAtIndex === 0 || /\s/.test(input[lastAtIndex - 1]))) {
      // Get the query text after the @ symbol
      const query = input.slice(lastAtIndex + 1).split(/\s/)[0].toLowerCase();
      
      // Show autocomplete if there's an @ symbol
      const availableDocs = getAvailableDocuments();
      const filtered = availableDocs.filter(doc => 
        query ? doc.name.toLowerCase().includes(query) : true
      );
      
      if (filtered.length > 0) {
        setFilteredDocuments(filtered);
        setShowAutocomplete(true);
        setSelectedAutocompleteIndex(0);
      }
    }
  };

  // Add a function to handle clearing the chat
  const handleClearChat = () => {
    // Reset AI SDK messages to an empty array
    setAiMessages([]);
    
    // Reset local messages to an empty array
    setMessages([]);
    
    // Clear input field
    setInput("");
    
    // Clear context documents
    setContextDocuments([]);
    
    // Show confirmation toast
    toast({
      title: "Chat cleared",
      description: "Your conversation has been reset.",
      duration: 3000, // Auto-dismiss after 3 seconds
    });
    
    // Close confirmation dialog
    setShowClearConfirmation(false);
  };

  return (
    <Card className={cn(
      "flex flex-col h-full border-none shadow-none",
      isExpanded && "border rounded-none"
    )}>
      <CardHeader className="px-4 py-2 border-b">
        <div className="flex items-center justify-between">
          
          {isExpanded && (
            <div className="flex items-center">
              <span className="text-sm font-medium">AI Composer - Expanded Mode</span>
            </div>
          )}
          
          <div className={cn(
            "flex items-center gap-1",
            isExpanded ? "" : "ml-auto" // Push to right when not expanded
          )}>
            <DropdownMenu open={isContextMenuOpen} onOpenChange={setIsContextMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 px-2"
                  title="Add document to context"
                >
                  <AtSign className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Add document to context</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <ScrollArea className="h-[200px]">
                  {documents.length > 0 ? (
                    documents.map(doc => (
                      <DropdownMenuItem 
                        key={doc.id}
                        onClick={() => handleAddContextDocument(doc)}
                        disabled={doc.id === selectedDocumentId || contextDocuments.some(d => d.id === doc.id)}
                        className="flex items-center justify-between"
                      >
                        <span className="truncate">{doc.name}</span>
                        {doc.id === selectedDocumentId && (
                          <Badge variant="outline" className="ml-2 text-xs">Primary</Badge>
                        )}
                        {contextDocuments.some(d => d.id === doc.id) && (
                          <Badge variant="outline" className="ml-2 text-xs">Added</Badge>
                        )}
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                      No documents found
                    </div>
                  )}
                </ScrollArea>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Dialog open={showDebugDialog} onOpenChange={setShowDebugDialog}>
              <DialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-8 px-2 text-muted-foreground"
                  title="Show debug information"
                >
                  <Bug className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>Debug: AI Request Information</DialogTitle>
                  <DialogDescription>
                    This shows the details of the last request sent to the language model.
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-4">
                  <AIDebugPanel 
                    lastPrompt={lastPrompt} 
                    contextDocuments={contextDocuments} 
                    primaryDocument={documentContent}
                  />
                </div>
                <DialogFooter className="mt-4">
                  <DialogClose asChild>
                    <Button>Close</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            <Button 
              variant="ghost" 
              size="sm"
              className="h-8 px-2 text-muted-foreground"
              title="Clear chat history"
              onClick={() => setShowClearConfirmation(true)}
            >
              <Eraser className="h-4 w-4" />
            </Button>
            
            {onToggleExpand && (
              <Button 
                variant="ghost" 
                size="sm"
                className="h-8 px-2 text-muted-foreground"
                title={isExpanded ? "Exit full screen" : "Expand to full screen"}
                onClick={onToggleExpand}
              >
                {isExpanded ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            )}
            
            <AlertDialog open={showClearConfirmation} onOpenChange={setShowClearConfirmation}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear Chat History</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove all messages and context documents from the current conversation. 
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleClearChat}
                    className="bg-destructive hover:bg-destructive/90 text-white font-medium"
                  >
                    Clear Chat
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>
      
      {/* Context documents list - simplified */}
      {contextDocuments.length > 0 && (
        <div className="flex flex-wrap gap-1 mx-4 mt-1 p-1 bg-muted/30 rounded-md">
          {contextDocuments.map(doc => (
            <Badge key={doc.id} variant="secondary" className="flex items-center gap-1 pl-2 text-xs">
              {doc.name}
              <Button
                variant="ghost"
                size="icon"
                className="h-3 w-3 ml-1 rounded-full"
                onClick={() => handleRemoveContextDocument(doc.id)}
              >
                <X className="h-2 w-2" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
      
      <CardContent className="p-0 flex-1">
        <ScrollArea className="h-[calc(100vh-300px)]">
          <div className="flex flex-col p-3 gap-3">
            {aiMessages.length === 0 ? (
              <div className="text-center text-muted-foreground py-6">
                <Sparkles className="h-6 w-6 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Ask me anything about your document</p>
                <div className="mt-3 grid grid-cols-1 gap-2 mx-auto max-w-md">
                  <SuggestionButton 
                    text="Summarize this document" 
                    onClick={() => {
                      const text = "Summarize this document in a few paragraphs.";
                      setInput(text);
                      // Create a synthetic event to update AI SDK's input state
                      const syntheticEvent = {
                        target: { value: text }
                      } as React.ChangeEvent<HTMLTextAreaElement>;
                      aiHandleInputChange(syntheticEvent);
                    }}
                  />
                  <SuggestionButton 
                    text="Improve the writing style" 
                    onClick={() => {
                      const text = "Improve the writing style of this document to make it more engaging.";
                      setInput(text);
                      // Create a synthetic event to update AI SDK's input state
                      const syntheticEvent = {
                        target: { value: text }
                      } as React.ChangeEvent<HTMLTextAreaElement>;
                      aiHandleInputChange(syntheticEvent);
                    }}
                  />
                  <SuggestionButton 
                    text="Generate a conclusion" 
                    onClick={() => {
                      const text = "Generate a conclusion for this document.";
                      setInput(text);
                      // Create a synthetic event to update AI SDK's input state
                      const syntheticEvent = {
                        target: { value: text }
                      } as React.ChangeEvent<HTMLTextAreaElement>;
                      aiHandleInputChange(syntheticEvent);
                    }}
                  />
                </div>
              </div>
            ) : (
              aiMessages.map((message, index) => (
                <div 
                  key={index} 
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[90%] rounded-lg p-2 group ${
                      message.role === 'user' 
                        ? 'bg-primary/90 text-primary-foreground' 
                        : 'bg-muted/70'
                    }`}
                  >
                    <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                    
                    {message.role === 'assistant' && (
                      <div className="mt-2 pt-1 border-t border-border flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleInsertResponse(message.content)}
                          title="Add to document"
                        >
                          <ArrowLeft className="h-3 w-3" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleCopyToClipboard(message.content, `msg-${index}`)}
                          title="Copy to clipboard"
                        >
                          {isCopied === `msg-${index}` ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            
            {aiIsLoading && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-lg p-2 bg-muted/70 flex items-center text-sm">
                  <RefreshCw className="h-3 w-3 animate-spin mr-2" />
                  Thinking...
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </CardContent>
      
      <CardFooter className="p-3 pt-2 border-t">
        <div className="flex gap-2 w-full relative">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              placeholder="Ask ..."
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              className="min-h-[50px] flex-1 resize-none text-sm"
              disabled={aiIsLoading}
            />
            <div className="absolute right-2 bottom-2 text-xs text-muted-foreground bg-background px-1 rounded opacity-50">
              <span className="font-bold">@</span> <span>to add documents</span>
            </div>
          </div>
          <Button 
            type="submit" 
            size="icon" 
            variant="ghost"
            className="h-[50px] w-[50px] rounded-full bg-primary/10 hover:bg-primary/20"
            onClick={(e) => handleFormSubmit(e as unknown as React.FormEvent<HTMLFormElement>)}
            disabled={aiIsLoading || !input.trim()}
          >
            <Send className="h-4 w-4 text-primary" />
          </Button>
          
          {/* Autocomplete dropdown - simplified */}
          {showAutocomplete && filteredDocuments.length > 0 && (
            <div 
              className="absolute z-50 bg-background border rounded-md shadow-md w-64 max-h-60 overflow-y-auto"
              style={{ 
                top: '-5px',
                left: '0',
                transform: 'translateY(-100%)'
              }}
            >
              <div className="p-1 border-b bg-muted/50 flex items-center justify-between">
                <span className="text-xs font-medium">Add document to context</span>
              </div>
              <div className="p-1">
                {filteredDocuments.map((doc, index) => (
                  <div
                    key={doc.id}
                    className={cn(
                      "px-2 py-1 text-xs cursor-pointer rounded hover:bg-accent",
                      selectedAutocompleteIndex === index && "bg-accent"
                    )}
                    onClick={() => selectAutocompleteDocument(doc)}
                  >
                    <div className="flex items-center">
                      <FileText className="h-3 w-3 mr-2 text-muted-foreground" />
                      <span className="truncate">{doc.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}

function SuggestionButton({ text, onClick }: { text: string; onClick: () => void }) {
  return (
    <Button 
      variant="outline" 
      size="sm"
      className="justify-start text-left h-auto py-1 text-xs"
      onClick={onClick}
    >
      {text}
    </Button>
  );
} 