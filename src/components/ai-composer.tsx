"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { SendHorizontal, Settings, RefreshCw, Copy, Check, Wand2, AtSign, X, FileText, ChevronDown, ChevronUp, Trash2, ArrowLeft, Bug } from "lucide-react";
import { useDocumentStore, useLLMStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { generateText } from "@/lib/llm-service";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
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
import { parseTemplate } from "@/lib/template-parser";

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

interface AIComposerProps {}

// Add a safe logging function at the top of the file
const safeLog = (message: string, error?: any) => {
  try {
    if (typeof console !== 'undefined' && console.error) {
      if (error) {
        console.error(message, error);
      } else {
        console.error(message);
      }
    }
  } catch (e) {
    // Silently fail if console logging isn't available
  }
};

export default function AIComposer({}: AIComposerProps) {
  const router = useRouter();
  const { documents, selectedDocumentId, updateDocument } = useDocumentStore();
  const { config, updateConfig } = useLLMStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [showClearConfirmation, setShowClearConfirmation] = useState(false);
  const [lastPrompt, setLastPrompt] = useState<string>("");
  const [showDebugDialog, setShowDebugDialog] = useState(false);

  // Get the selected document
  const selectedDocument = documents.find(doc => doc.id === selectedDocumentId);

  // Scroll to bottom of messages when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const generateId = () => `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  const handleSendMessage = async () => {
    if (!input.trim() || !selectedDocumentId) return;
    
    // Add user message to chat
    const userMessageId = generateId();
    const userMessage: Message = { 
      id: userMessageId,
      role: "user", 
      content: input,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    
    try {
      await generateAIResponse(userMessage.content);
    } catch (error) {
      safeLog('Error generating AI response:', error);
      
      // Add error message
      const errorMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: "I'm sorry, I encountered an error while processing your request. Please check your API key in settings or try again later.",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate response",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateAIResponse = async (userMessage: string) => {
    // Get the template and custom instructions from the LLM store
    const { promptTemplate, customInstructions } = config;
    
    // Debug the inputs
    safeLog(`Template processing inputs:
      - Template length: ${promptTemplate?.length || 0}
      - Custom instructions length: ${customInstructions?.length || 0}
      - User message: ${userMessage}
      - Context documents: ${contextDocuments.length}
    `);
    
    // Create the context for the template
    const templateContext = {
      userMessage,
      customInstructions: customInstructions || '',
      contextDocuments: contextDocuments.length > 0 ? contextDocuments : undefined
    };
    
    let prompt = "";
    
    try {
      // Check if template is valid
      if (!promptTemplate || promptTemplate.trim() === '') {
        safeLog("Empty template, using default template");
        // Use a default template if none is provided
        prompt = `User Message: ${userMessage}\n\n${customInstructions || ''}\n\nPlease provide a helpful response.`;
      } else {
        // Parse the template to generate the prompt
        safeLog("Parsing template...");
        prompt = parseTemplate(promptTemplate, templateContext);
        safeLog(`Template parsed, prompt length: ${prompt?.length || 0}`);
      }
    } catch (error) {
      safeLog("Error parsing template:", error);
      
      // Fallback to a simple prompt if template parsing fails
      prompt = `User Message: ${userMessage}\n\n${customInstructions || ''}\n\nPlease provide a helpful response.`;
      
      // Show warning toast
      toast({
        title: "Template Warning",
        description: "Your template produced an empty prompt. Using a simple template instead.",
        variant: "destructive"
      });
    }
    
    // Check if prompt is empty after template processing
    if (!prompt || prompt.trim() === '') {
      safeLog("Empty prompt after template processing, using fallback");
      prompt = `User Message: ${userMessage}\n\nPlease provide a helpful response.`;
      
      // Show warning toast
      toast({
        title: "Template Warning",
        description: "Your template produced an empty prompt. Using a simple template instead.",
        variant: "destructive"
      });
    }
    
    // Store the prompt for debugging
    setLastPrompt(prompt);
    safeLog(`Final prompt length: ${prompt.length}`);
    
    try {
      // Call the LLM service
      safeLog("Calling LLM service...");
      const response = await generateText({ prompt });
      safeLog("LLM service response received");
      
      // Create AI message
      const aiMessage: Message = { 
        id: generateId(),
        role: "assistant", 
        content: response.text,
        timestamp: new Date(),
        model: response.model,
        provider: response.provider
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      safeLog("Error generating AI response:", error);
      
      // Add error message to chat
      const errorMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: "I'm sorry, I encountered an error while processing your request. Please check your API key in settings or try again later.",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      // Show error toast
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate response",
        variant: "destructive"
      });
    }
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
    
    // Check if we should show autocomplete
    const lastAtIndex = value.lastIndexOf('@');
    
    // Debug the @ detection
    console.log('Input changed:', { 
      value, 
      lastAtIndex, 
      hasAtSymbol: lastAtIndex !== -1,
      isValidPosition: lastAtIndex === 0 || (lastAtIndex > 0 && /\s/.test(value[lastAtIndex - 1]))
    });
    
    if (lastAtIndex !== -1 && (lastAtIndex === 0 || /\s/.test(value[lastAtIndex - 1]))) {
      // Get the query text after the @ symbol
      const query = value.slice(lastAtIndex + 1).split(/\s/)[0].toLowerCase();
      
      // Filter documents based on the query
      const availableDocs = getAvailableDocuments();
      const filtered = availableDocs.filter(doc => 
        query ? doc.name.toLowerCase().includes(query) : true
      );
      
      console.log('Autocomplete:', { 
        query, 
        availableDocsCount: availableDocs.length, 
        filteredDocsCount: filtered.length 
      });
      
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
          
          console.log('Positioning dropdown:', { 
            textareaHeight: textareaRect.height,
            textareaWidth: textareaRect.width
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
        console.log('@ key pressed, showing autocomplete with', availableDocs.length, 'documents');
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
      handleSendMessage();
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

  const handleApplyToDocument = (content: string, messageId: string) => {
    if (selectedDocumentId && selectedDocument) {
      // Find the current message
      const currentMessage = messages.find(msg => msg.id === messageId);
      if (!currentMessage || currentMessage.role !== "assistant") return;
      
      // Find the user message that preceded this assistant message
      const messageIndex = messages.findIndex(msg => msg.id === messageId);
      let promptMessage: Message | undefined;
      
      // Look for the most recent user message before this assistant message
      if (messageIndex > 0) {
        for (let i = messageIndex - 1; i >= 0; i--) {
          if (messages[i].role === "user") {
            promptMessage = messages[i];
            break;
          }
        }
      }
      
      // Format the content to include the prompt and context documents
      let formattedContent = "";
      
      // Add the prompt if available
      if (promptMessage) {
        formattedContent += `## Prompt\n\n${promptMessage.content}\n\n`;
      }
      
      // Add context documents if any
      if (contextDocuments.length > 0) {
        formattedContent += `## Context Documents\n\n`;
        contextDocuments.forEach((doc, index) => {
          formattedContent += `### ${index + 1}. ${doc.name}\n\n`;
        });
        formattedContent += `\n`;
      }
      
      // Add the AI response
      formattedContent += `## Response\n\n${content}`;
      
      // Update the document
      updateDocument(selectedDocumentId, {
        content: selectedDocument.content + "\n\n" + formattedContent
      }, true, "Applied AI suggestion with context");
      
      toast({
        title: "Added to document",
        description: `Content added to "${selectedDocument.name}" with context`,
      });
    } else {
      toast({
        title: "No document selected",
        description: "Please select a document first.",
        variant: "destructive"
      });
    }
  };

  const handleCopyToClipboard = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setIsCopied(id);
    
    toast({
      title: "Copied to clipboard",
      description: "The content has been copied to your clipboard.",
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
      });
      return;
    }
    
    // Check if document is the currently selected document
    if (document.id === selectedDocumentId) {
      toast({
        title: "Document already in context",
        description: `"${document.name}" is already the primary document.`,
      });
      return;
    }
    
    // Add document to context
    setContextDocuments(prev => [...prev, document]);
    
    toast({
      title: "Document added to context",
      description: `"${document.name}" has been added to the conversation context.`,
    });
    
    // Close the dropdown
    setIsContextMenuOpen(false);
  };

  const handleRemoveContextDocument = (documentId: string) => {
    setContextDocuments(prev => prev.filter(doc => doc.id !== documentId));
    
    toast({
      title: "Document removed from context",
      description: "The document has been removed from the conversation context.",
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
    // Reset messages to an empty array
    setMessages([]);
    
    // Clear input field
    setInput("");
    
    // Clear context documents
    setContextDocuments([]);
    
    // Show confirmation toast
    toast({
      title: "Chat cleared",
      description: "Your conversation has been reset.",
    });
    
    // Close confirmation dialog
    setShowClearConfirmation(false);
  };

  if (!selectedDocumentId || !selectedDocument) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card className="p-6 max-w-md text-center">
          <h2 className="text-xl font-semibold mb-2">AI Composer</h2>
          <p className="text-muted-foreground mb-4">Select a document to start using the AI assistant.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">AI Composer</h2>
          <DropdownMenu open={isContextMenuOpen} onOpenChange={setIsContextMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="ml-2"
                title="Add document to context"
              >
                <AtSign className="h-4 w-4 mr-1" />
                Add Context
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
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
        </div>
        
        <div className="flex items-center gap-2">
          
          
          <Dialog open={showDebugDialog} onOpenChange={setShowDebugDialog}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="text-muted-foreground"
                title="Show debug information"
              >
                <Bug className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>Debug: Last Prompt Sent to LLM</DialogTitle>
                <DialogDescription>
                  This is the exact prompt that was sent to the language model in the last request.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4 border rounded-md p-4 bg-muted/50 overflow-auto max-h-[60vh]">
                <pre className="whitespace-pre-wrap text-sm font-mono">{lastPrompt || "No prompt has been sent yet."}</pre>
              </div>
              <DialogFooter className="mt-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(lastPrompt);
                    toast({
                      title: "Copied to clipboard",
                      description: "The prompt has been copied to your clipboard.",
                    });
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy to Clipboard
                </Button>
                <DialogClose asChild>
                  <Button>Close</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <AlertDialog open={showClearConfirmation} onOpenChange={setShowClearConfirmation}>
            <AlertDialogTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-muted-foreground hover:text-destructive"
                title="Clear chat history"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
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
      
      {/* Context documents list */}
      {contextDocuments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4 p-2 bg-muted/50 rounded-md">
          <span className="text-xs text-muted-foreground py-1">Additional context:</span>
          {contextDocuments.map(doc => (
            <Badge key={doc.id} variant="secondary" className="flex items-center gap-1 pl-2">
              {doc.name}
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 ml-1 rounded-full"
                onClick={() => handleRemoveContextDocument(doc.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
      
      <div className="flex-1 overflow-auto mb-4 space-y-4 pr-1">
        {messages.map((message) => (
          <div 
            key={message.id} 
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div 
              className={`max-w-[90%] rounded-lg p-3 group ${
                message.role === "user" 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted"
              }`}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>
              
              {message.role === "assistant" && (
                <>
                  <div className="mt-3 pt-2 border-t border-border flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs border border-border"
                      onClick={() => handleApplyToDocument(message.content, message.id)}
                      title="Add this response to your current document"
                    >
                      <ArrowLeft className="h-3 w-3 mr-1" />
                      Add to Document
                    </Button>
                    
                    <div className="flex items-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-70 hover:opacity-100"
                        onClick={() => handleCopyToClipboard(message.content, message.id)}
                        title="Copy to clipboard"
                      >
                        {isCopied === message.id ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="mt-1 text-xs text-muted-foreground">
                    {message.provider && message.model && (
                      <span>{message.provider === 'gemini' ? 'Gemini' : 'OpenAI'} • {message.model}</span>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg p-3 bg-muted flex items-center">
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              Thinking...
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <div className="flex gap-2 mt-auto relative">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            placeholder="Ask the AI assistant... (Type @ to reference documents)"
            className="resize-none min-h-[80px] w-full pr-8"
            disabled={isLoading}
          />
          <div className="absolute right-2 bottom-2 text-xs text-muted-foreground bg-background px-1 rounded">
            <span className="opacity-70">Type</span> <span className="font-bold">@</span> <span className="opacity-70">to add documents</span>
          </div>
        </div>
        <Button 
          className="self-end" 
          size="icon" 
          onClick={handleSendMessage}
          disabled={!input.trim() || isLoading}
          title="Send message"
        >
          <SendHorizontal className="h-4 w-4" />
        </Button>
        
        {/* Autocomplete dropdown */}
        {showAutocomplete && filteredDocuments.length > 0 && (
          <div 
            className="absolute z-50 bg-background border rounded-md shadow-md w-64 max-h-60 overflow-y-auto"
            style={{ 
              top: '-5px',
              left: '0',
              transform: 'translateY(-100%)'
            }}
          >
            <div className="p-2 border-b bg-muted flex items-center justify-between">
              <span className="text-xs font-semibold">Add document to context</span>
              <div className="flex text-xs text-muted-foreground">
                <span className="flex items-center mr-2">
                  <ChevronUp className="h-3 w-3 mr-1" />
                  <ChevronDown className="h-3 w-3" />
                  Navigate
                </span>
                <span className="flex items-center">
                  <span className="border px-1 text-[10px] rounded mr-1">↵</span>
                  Select
                </span>
              </div>
            </div>
            <div className="p-1">
              {filteredDocuments.map((doc, index) => (
                <div
                  key={doc.id}
                  className={cn(
                    "px-2 py-2 text-sm cursor-pointer rounded hover:bg-accent",
                    selectedAutocompleteIndex === index && "bg-accent"
                  )}
                  onClick={() => selectAutocompleteDocument(doc)}
                >
                  <div className="flex items-center">
                    <FileText className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                    <span className="truncate">{doc.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 