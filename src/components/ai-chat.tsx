"use client";

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Send, User, Bot, AtSign, X, FileText, ChevronDown, ChevronUp, Eraser, ArrowLeft, Bug, Copy, Check, RefreshCw, Maximize2, Minimize2, Save } from 'lucide-react';
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
import { generateChatResponse, ChatMessage, ChatContextDocument } from "@/lib/llm-service";

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
  onInsertText?: (text: string) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export default function AIChat({ onInsertText, isExpanded, onToggleExpand }: AIChatProps) {
  const { documents } = useDocumentStore();
  const { config } = useLLMStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Save LLM config to cookies on component mount
  useEffect(() => {
    useLLMStore.getState().saveToCookies();
  }, []);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState<string | null>(null);
  const [contextDocuments, setContextDocuments] = useState<ContextDocument[]>([]);
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [composerContextFiles, setComposerContextFiles] = useState<Array<{id: string; name: string}>>([]);
  
  // Autocomplete state
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompletePosition, setAutocompletePosition] = useState({ top: 0, left: 0 });
  const [selectedAutocompleteIndex, setSelectedAutocompleteIndex] = useState(0);
  const [filteredDocuments, setFilteredDocuments] = useState<Array<{ id: string; name: string; content: string }>>([]);

  const [showClearConfirmation, setShowClearConfirmation] = useState(false);
  const [lastPrompt, setLastPrompt] = useState<string>("");
  const [showDebugDialog, setShowDebugDialog] = useState(false);

  // Inside the AIChat component, add a new state for the save composition dialog
  const [showSaveCompositionDialog, setShowSaveCompositionDialog] = useState(false);
  const [compositionName, setCompositionName] = useState("");

  // Load context files from localStorage when component mounts
  useEffect(() => {
    loadComposerContextFiles();
  }, [documents]);
  
  // Function to load context files from localStorage
  const loadComposerContextFiles = () => {
    try {
      const contextData = localStorage.getItem('aiComposerContext');
      if (contextData) {
        console.log("Found context data in localStorage:", contextData);
        const parsedContext = JSON.parse(contextData) as Array<{id: string; name: string}>;
        setComposerContextFiles(parsedContext);
        
        // Convert composer context files to context documents
        const newContextDocs = parsedContext
          .map(ref => {
            const doc = documents.find(d => d.id === ref.id);
            console.log(`Loading context document with id ${ref.id}, found:`, doc);
            if (doc) {
              return {
                id: doc.id,
                name: doc.name,
                content: doc.content
              };
            }
            console.warn(`Could not find document with id ${ref.id} in the current documents list`);
            return null;
          })
          .filter((doc): doc is ContextDocument => doc !== null);
        
        console.log("Loaded context documents from localStorage:", newContextDocs);
        
        // Replace all context documents with the new ones
        if (newContextDocs.length > 0) {
          setContextDocuments(newContextDocs);
          
          toast({
            title: "Context loaded",
            description: `Loaded ${newContextDocs.length} context document(s) from previous session.`,
            duration: 3000,
          });
        }
      }
    } catch (error) {
      console.error('Error loading context files:', error);
      toast({
        title: "Error",
        description: "Failed to load context documents from previous session.",
        variant: "destructive",
        duration: 5000,
      });
    }
  };
  
  // Listen for context updates from the Composition Composer
  useEffect(() => {
    const handleContextUpdate = (event: CustomEvent<{ context: Array<{id: string; name: string}> }>) => {
      console.log("Received aiContextUpdated event with context:", event.detail.context);
      
      // Clear existing context documents first
      setContextDocuments([]);
      setComposerContextFiles(event.detail.context);
      
      // Convert composer context files to context documents
      const newContextDocs = event.detail.context
        .map(ref => {
          const doc = documents.find(d => d.id === ref.id);
          console.log(`Looking for document with id ${ref.id}, found:`, doc);
          if (doc) {
            return {
              id: doc.id,
              name: doc.name,
              content: doc.content
            };
          }
          return null;
        })
        .filter((doc): doc is ContextDocument => doc !== null);
      
      console.log("Converted context documents:", newContextDocs);
      
      // Replace all context documents with the new ones
      setContextDocuments(newContextDocs);
      
      // Also update localStorage to ensure persistence
      localStorage.setItem('aiComposerContext', JSON.stringify(event.detail.context));
    };
    
    // Add event listener
    window.addEventListener('aiContextUpdated', handleContextUpdate as EventListener);
    
    // Clean up
    return () => {
      window.removeEventListener('aiContextUpdated', handleContextUpdate as EventListener);
    };
  }, [documents]);

  // Listen for messages loaded from a composition
  useEffect(() => {
    const handleMessagesLoaded = (event: CustomEvent<{ messages: Array<{role: 'user' | 'assistant', content: string}> }>) => {
      console.log("Received aiChatMessagesLoaded event with messages:", event.detail.messages);
      
      // Convert the messages to the format expected by the AI Chat component
      // Only include the required properties for ChatMessage: id, role, and content
      const formattedMessages = event.detail.messages.map(msg => ({
        id: generateId(),
        role: msg.role,
        content: msg.content
      }));
      
      console.log("Formatted messages for AI Chat:", formattedMessages);
      
      // Clear existing messages and set the new ones
      setMessages(formattedMessages);
      
      // Scroll to the bottom of the chat
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
      
      toast({
        title: "Composition loaded",
        description: "The composition has been loaded into the AI Composer.",
        duration: 3000,
      });
    };
    
    // Add event listener
    window.addEventListener('aiChatMessagesLoaded', handleMessagesLoaded as EventListener);
    
    // Clean up
    return () => {
      window.removeEventListener('aiChatMessagesLoaded', handleMessagesLoaded as EventListener);
    };
  }, []);

  // Scroll to bottom of messages when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const generateId = () => `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!input.trim() || isLoading) return;
    
    // Create a new user message
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: input
    };
    
    // Add user message to the chat
    setMessages(prev => [...prev, userMessage]);
    
    // Clear input
    setInput("");
    
    // Set loading state
    setIsLoading(true);
    
    try {
      // Create a debug version of the prompt that will be sent
      let debugSystemMessage = 'You are a helpful writing assistant.';
      
      if (contextDocuments && contextDocuments.length > 0) {
        debugSystemMessage += ' Use the following context documents to inform your responses:\n\n';
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
      
      // Call the server action with all messages for context
      const response = await generateChatResponse({
        messages: [...messages, userMessage],
        contextDocuments: contextDocuments.map(doc => ({
          id: doc.id,
          title: doc.name, // Map name to title for the server action
          content: doc.content
        })),
        stream: false
      });
      
      // Add the assistant's response to the chat
      setMessages(prev => [...prev, response.message]);
    } catch (error) {
      console.error('Error in AI chat:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate response",
        variant: "destructive",
        duration: 5000, // Auto-dismiss after 5 seconds for errors
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filter out documents that are already in context
  const getAvailableDocuments = () => {
    return documents.filter(doc => 
      !contextDocuments.some(contextDoc => contextDoc.id === doc.id)
    );
  };

  // Handle input change to detect @ symbol for autocomplete
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);
    
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
        title: "Text inserted",
        description: "The AI response has been inserted into the editor.",
        duration: 3000,
      });
    } else {
      toast({
        title: "Cannot insert text",
        description: "There is no active editor to insert text into.",
        duration: 3000,
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
    // Remove from context documents
    setContextDocuments(prev => prev.filter(doc => doc.id !== documentId));
    
    // Also remove from composer context files in localStorage
    const updatedComposerContext = composerContextFiles.filter(ref => ref.id !== documentId);
    setComposerContextFiles(updatedComposerContext);
    localStorage.setItem('aiComposerContext', JSON.stringify(updatedComposerContext));
    
    // Dispatch event to notify other components
    const event = new CustomEvent('aiContextUpdated', { 
      detail: { context: updatedComposerContext }
    });
    window.dispatchEvent(event);
  };
  
  const handleClearAllContextDocuments = () => {
    // Clear context documents
    setContextDocuments([]);
    
    // Clear composer context files in localStorage
    setComposerContextFiles([]);
    localStorage.removeItem('aiComposerContext');
    
    // Dispatch event to notify other components
    const event = new CustomEvent('aiContextUpdated', { 
      detail: { context: [] }
    });
    window.dispatchEvent(event);
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

  // Add a common function to create and save a composition
  const createAndSaveComposition = async (
    name: string, 
    contextDocs: ContextDocument[], 
    chatMessages: ChatMessage[],
    customIntro?: string
  ) => {
    try {
      console.log(`Creating composition "${name}" with ${contextDocs.length} context documents and ${chatMessages.length} messages`);
      console.log("Context documents:", contextDocs.map(doc => ({ id: doc.id, name: doc.name })));
      
      // Format the chat transcript
      let content = `# ${name}\n\n`;
      
      // Add custom intro if provided, otherwise use default
      if (customIntro) {
        content += `${customIntro}\n`;
      } else if (contextDocs.length > 0 && chatMessages.length === 0) {
        // If there are only context documents but no messages, add a default intro
        content += `Composition with context documents.\n`;
      }
      
      // Add context documents as markdown links
      if (contextDocs.length > 0) {
        content += "Context documents:\n";
        contextDocs.forEach(doc => {
          content += `- [[${doc.name}]]\n`;
        });
        content += "\n";
      }
      
      // Add chat messages if they exist
      if (chatMessages.length > 0) {
        content += "## Chat Thread\n\n";
        chatMessages.forEach((message) => {
          const role = message.role === 'user' ? 'User' : 'AI';
          content += `### ${role}\n\n${message.content}\n\n`;
        });
      }
      
      // Don't save if there are no context documents and no messages
      if (contextDocs.length === 0 && chatMessages.length === 0) {
        toast({
          title: "Cannot save empty composition",
          description: "Please add context documents or start a conversation first.",
          variant: "destructive",
          duration: 3000,
        });
        return false;
      }
      
      // Create a clean array of context document references
      const contextDocRefs = contextDocs.map(doc => ({ 
        id: doc.id, 
        name: doc.name 
      }));
      
      // Add the composition to the store
      await useDocumentStore.getState().addComposition(
        name,
        content,
        contextDocRefs
      );
      
      toast({
        title: "Composition saved",
        description: `"${name}" has been saved to your compositions with ${contextDocs.length} context document(s).`,
        duration: 3000,
      });
      
      return true;
    } catch (error) {
      console.error('Error saving composition:', error);
      toast({
        title: "Error",
        description: "Failed to save composition.",
        variant: "destructive",
        duration: 5000,
      });
      
      return false;
    }
  };

  // Add a function to handle saving the composition from the dialog
  const handleSaveComposition = async () => {
    if (!compositionName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name for the composition.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    
    // Check if there's anything to save
    if (contextDocuments.length === 0 && messages.length === 0) {
      toast({
        title: "Nothing to save",
        description: "Please add context documents or start a conversation first.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    
    // Ensure we're using the current context documents
    const currentContextDocs = [...contextDocuments];
    console.log("Saving composition with context documents:", currentContextDocs);
    
    const success = await createAndSaveComposition(
      compositionName,
      currentContextDocs,
      messages
    );
    
    if (success) {
      // Reset state
      setCompositionName("");
      setShowSaveCompositionDialog(false);
    }
  };

  return (
    <Card className={cn(
      "w-full h-full flex flex-col border rounded-lg overflow-hidden shadow-md transition-all duration-200",
      isExpanded ? "fixed inset-4 z-50" : "relative"
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
            {/* Display the current model */}
            <Badge 
              variant="outline" 
              className="mr-2 text-xs bg-primary/5"
              title="Current AI model"
            >
              {config.provider || 'openai'}:{config.model || 'gpt-4o'}
            </Badge>
            
            <Button 
              variant="ghost" 
              size="sm"
              className="h-8 px-2 text-muted-foreground"
              title="Save as composition"
              onClick={() => setShowSaveCompositionDialog(true)}
            >
              <Save className="h-4 w-4" />
            </Button>
            
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
                        disabled={contextDocuments.some(d => d.id === doc.id)}
                        className="flex items-center justify-between"
                      >
                        <span className="truncate">{doc.name}</span>
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
                  <DialogTitle>AI Debug Information</DialogTitle>
                  <DialogDescription>
                    This shows the prompt that was sent to the AI model.
                  </DialogDescription>
                </DialogHeader>
                
                <ScrollArea className="mt-4 max-h-[60vh]">
                  <AIDebugPanel 
                    lastPrompt={lastPrompt} 
                    contextDocuments={contextDocuments}
                  />
                </ScrollArea>
                
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
          <div className="flex justify-between w-full mb-1">
            <span className="text-xs text-muted-foreground">Context documents:</span>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-2 py-0 text-xs text-muted-foreground hover:text-destructive"
                onClick={handleClearAllContextDocuments}
              >
                Clear All
              </Button>
            </div>
          </div>
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
      
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-6">
                <Sparkles className="h-6 w-6 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Ask me anything about your document(s)</p>
                <div className="mt-3 grid grid-cols-1 gap-2 mx-auto max-w-md">
                  <SuggestionButton 
                    text="Summarize this document" 
                    onClick={() => {
                      const text = "Summarize this document in a few paragraphs.";
                      setInput(text);
                    }}
                  />
                  <SuggestionButton 
                    text="Improve the writing style" 
                    onClick={() => {
                      const text = "Improve the writing style of this document to make it more engaging.";
                      setInput(text);
                    }}
                  />
                  <SuggestionButton 
                    text="Generate a conclusion" 
                    onClick={() => {
                      const text = "Generate a conclusion for this document.";
                      setInput(text);
                    }}
                  />
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <div 
                  key={message.id || index} 
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
            
            {isLoading && (
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
              disabled={isLoading}
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
            disabled={isLoading || !input.trim()}
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
      
      {/* Save Composition Dialog */}
      <Dialog open={showSaveCompositionDialog} onOpenChange={setShowSaveCompositionDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save as Composition</DialogTitle>
            <DialogDescription>
              Save this chat conversation and context documents as a composition.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="composition-name" className="text-right text-sm font-medium">
                Name
              </label>
              <input
                id="composition-name"
                value={compositionName}
                onChange={(e) => setCompositionName(e.target.value)}
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Enter a name for this composition"
              />
            </div>
            
            <div className="grid grid-cols-4 items-start gap-4">
              <span className="text-right text-sm font-medium">
                Context
              </span>
              <div className="col-span-3">
                {contextDocuments.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {contextDocuments.map((doc) => (
                      <Badge key={doc.id} variant="secondary" className="text-xs">
                        {doc.name}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No context documents added
                  </div>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-start gap-4">
              <span className="text-right text-sm font-medium">
                Messages
              </span>
              <div className="col-span-3 text-sm text-muted-foreground">
                {messages.length > 0 
                  ? `${messages.length} messages will be saved` 
                  : "No messages to save (only context documents will be saved)"}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setShowSaveCompositionDialog(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSaveComposition}>
              Save Composition
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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