"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft,
  AtSign,
  Bot,
  Bug, 
  Check,
  ChevronDown,
  ChevronUp,
  Copy, 
  Eraser, 
  FileText, 
  Maximize2, 
  Minimize2, 
  Pencil,
  RefreshCw,
  Save,
  Send,
  Sparkles, 
  X 
} from 'lucide-react';
import { useDocumentStore, useLLMStore, useAIChatStore } from "@/lib/store";
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
import { generateChatResponse, ChatMessage, ChatContextDocument } from "@/lib/llm-service";
import { LLM_PROVIDERS, LLM_MODELS } from "@/lib/config";
import { AIRoleSwitcher } from './ai-role-switcher';
import { useTheme } from "next-themes";
import { useInView } from "react-intersection-observer";
import ReactMarkdown from "react-markdown";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/components/ui/use-toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { generateId } from "@/lib/utils";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { ContextDocumentList } from "./context-document-list";
import { ContextDocument } from "@/types/contextDocument";

// Define color mapping for each model
const MODEL_COLORS = {
  // OpenAI Models
  'gpt-4o': 'bg-emerald-100 dark:bg-emerald-950/50',
  'gpt-4-turbo': 'bg-emerald-50 dark:bg-emerald-950/30',
  'gpt-4': 'bg-emerald-50/80 dark:bg-emerald-950/20',
  
  // OpenRouter Models
  'google/gemini-2.0-flash-001': 'bg-blue-100 dark:bg-blue-950/50',
  'google/gemini-2.0-flash-lite-001': 'bg-blue-50 dark:bg-blue-950/30',
  'mistralai/mistral-small-3.1-24b-instruct': 'bg-purple-100 dark:bg-purple-950/50',
  'google/gemma-3-27b-it': 'bg-indigo-100 dark:bg-indigo-950/50',
  'allenai/olmo-2-0325-32b-instruct': 'bg-cyan-100 dark:bg-cyan-950/50',
  'deepseek/deepseek-r1:free': 'bg-teal-100 dark:bg-teal-950/50',
  'deepseek/deepseek-r1': 'bg-teal-100 dark:bg-teal-950/50',
  'qwen/qwq-32b:free': 'bg-green-100 dark:bg-green-950/50',
  'meta-llama/llama-3.3-70b-instruct': 'bg-yellow-100 dark:bg-yellow-950/50',
  'nvidia/llama-3.1-nemotron-70b-instruct': 'bg-orange-100 dark:bg-orange-950/50',
  
  // Anthropic Models
  'claude-3-7-sonnet-20250219': 'bg-rose-100 dark:bg-rose-950/50',
  'claude-3-5-sonnet-v2-20241022': 'bg-rose-50 dark:bg-rose-950/30',
  'claude-3-5-haiku-20241022': 'bg-rose-50/80 dark:bg-rose-950/20',
  
  // Gemini Models
  'gemini-2.0-flash': 'bg-sky-100 dark:bg-sky-950/50',
  'gemini-2.0-flash-lite': 'bg-sky-50 dark:bg-sky-950/30',
  'gemini-2.0-flash-thinking-exp-01-21': 'bg-sky-50/80 dark:bg-sky-950/20',
};

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

interface ModelOption {
  value: string;
  label: string;
}

type ProviderValue = 'openai' | 'openrouter' | 'anthropic' | 'gemini';

interface ProviderOption {
  value: ProviderValue;
  label: string;
}

// Define the enhanced version of the ChatMessage type
interface EnhancedChatMessage extends ChatMessage {
  // New structure with separate content fields
  systemContent?: string;
  userContent?: string;
  assistantContent?: string;
}

// Helper function to get content for display based on role
const getDisplayContent = (message: EnhancedChatMessage): string => {
  if (message.systemContent && message.role === 'system' as any) {
    return message.systemContent;
  } else if (message.userContent && message.role === 'user') {
    return message.userContent;
  } else if (message.assistantContent && message.role === 'assistant') {
    return message.assistantContent;
  }
  // Fallback to the original content for backward compatibility
  return message.content;
};

// Type guard to check if a message has a specific role
const hasRole = (message: EnhancedChatMessage, role: string): boolean => {
  return message.role === role;
};

export default function AIChat({ onInsertText, isExpanded, onToggleExpand }: AIChatProps) {
  const { documents } = useDocumentStore();
  const { config, updateConfig } = useLLMStore();
  const { messages, setMessages, addMessage, clearMessages } = useAIChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Save LLM config to cookies on component mount
  useEffect(() => {
    useLLMStore.getState().saveToCookies();
  }, []);
  
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState<string | null>(null);
  const [contextDocuments, setContextDocuments] = useState<ContextDocument[]>([]);
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [composerContextFiles, setComposerContextFiles] = useState<Array<{id: string; name: string}>>([]);
  
  // For message history - ensure empty objects are initialized
  const [messageHistory, setMessageHistory] = useState<Record<string, EnhancedChatMessage[]>>({});
  const [activeResponseVersion, setActiveResponseVersion] = useState<Record<string, number>>({});
  
  // Debug messages for development
  useEffect(() => {
    console.log("Message history state:", messageHistory);
    console.log("Active response versions:", activeResponseVersion);
  }, [messageHistory, activeResponseVersion]);
  
  // Load message history and active versions from localStorage when component mounts
  useEffect(() => {
    try {
      const savedMessageHistory = localStorage.getItem('aiChatMessageHistory');
      const savedActiveVersions = localStorage.getItem('aiChatActiveVersions');
      
      if (savedMessageHistory) {
        console.log('Loading message history from localStorage');
        setMessageHistory(JSON.parse(savedMessageHistory));
      }
      
      if (savedActiveVersions) {
        console.log('Loading active versions from localStorage');
        setActiveResponseVersion(JSON.parse(savedActiveVersions));
      }
    } catch (error) {
      console.error('Error loading message history or active versions:', error);
    }
  }, []);

  // Save message history and active versions to localStorage whenever they change
  useEffect(() => {
    try {
      console.log('Saving message history to localStorage');
      localStorage.setItem('aiChatMessageHistory', JSON.stringify(messageHistory));
    } catch (error) {
      console.error('Error saving message history:', error);
    }
  }, [messageHistory]);
  
  // Save active versions to localStorage whenever they change
  useEffect(() => {
    try {
      console.log('Saving active versions to localStorage');
      localStorage.setItem('aiChatActiveVersions', JSON.stringify(activeResponseVersion));
    } catch (error) {
      console.error('Error saving active versions:', error);
    }
  }, [activeResponseVersion]);
  
  // Autocomplete state
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [selectedAutocompleteIndex, setSelectedAutocompleteIndex] = useState(0);
  const [filteredDocuments, setFilteredDocuments] = useState<Array<{ id: string; name: string; content: string }>>([]);

  const [showClearConfirmation, setShowClearConfirmation] = useState(false);
  const [lastPrompt, setLastPrompt] = useState<string>("");
  const [showDebugDialog, setShowDebugDialog] = useState(false);

  // Inside the AIChat component, add a new state for the save composition dialog
  const [showSaveCompositionDialog, setShowSaveCompositionDialog] = useState(false);
  const [compositionName, setCompositionName] = useState("");
  
  // State for editing messages
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editedPrompt, setEditedPrompt] = useState<string>("");

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
    const handleMessagesLoaded = (event: CustomEvent<{ messages: Array<{role: 'user' | 'assistant', content: string, model?: string, provider?: string}> }>) => {
      console.log("Received aiChatMessagesLoaded event with messages:", event.detail.messages);
      
      // Convert the messages to the format expected by the AI Chat component
      const formattedMessages = event.detail.messages.map(msg => ({
        id: generateId(),
        role: msg.role,
        content: msg.content,
        model: msg.model,
        provider: msg.provider
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

  // Load messages from localStorage when component mounts
  useEffect(() => {
    const savedMessages = localStorage.getItem('aiChatMessages');
    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages) as EnhancedChatMessage[];
        console.log('Loading messages from localStorage:', parsedMessages);
        setMessages(parsedMessages);
      } catch (error) {
        console.error('Error loading chat messages:', error);
      }
    }
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    console.log('Saving messages to localStorage:', messages);
    localStorage.setItem('aiChatMessages', JSON.stringify(messages));
  }, [messages]);

  const generateId = () => `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!input.trim() || isLoading) return;
    
    // Create a new user message with the updated structure
    const userMessage: EnhancedChatMessage = {
      id: generateId(),
      role: 'user',
      content: input, // Keep for backward compatibility
      userContent: input, // New structure
    };
    
    // Add user message to the chat
    addMessage(userMessage);
    
    // Clear input
    setInput("");
    
    // Set loading state
    setIsLoading(true);
    
    try {
      // Call the server action with all messages for context
      const response = await generateChatResponse({
        messages: [...messages, userMessage] as ChatMessage[],
        contextDocuments: contextDocuments.map(doc => ({
          id: doc.id,
          title: doc.name,
          content: doc.content
        })),
        stream: false
      });
      
      // Check if response and debugPrompt exist before using them
      if (response && response.debugPrompt) {
        setLastPrompt(response.debugPrompt);
      }
      
      // Make sure response and response.message exist before creating assistantMessage
      if (response && response.message) {
        // Add the assistant's response to the chat with updated structure
        const assistantMessage: EnhancedChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: response.message.content, // Keep for backward compatibility
          assistantContent: response.message.content, // New structure
          model: response.model,
          provider: response.provider
        };
        
        // Update message history with the new assistant message
        if (userMessage.id) {
          // Only track history if the user message has an ID
          setMessageHistory(prev => {
            const updatedHistory = {...prev};
            const msgId = userMessage.id as string; // Safe assertion since we checked above
            
            // Always ensure we have the most recent message pair at the start of the array
            // We can have different cases:
            if (!updatedHistory[msgId]) {
              // Case 1: No history yet - create a new entry with message and response
              updatedHistory[msgId] = [userMessage, assistantMessage];
              console.log("Created new complete history entry with message and response:", updatedHistory[msgId]);
            } else if (updatedHistory[msgId].length % 2 === 1) {
              // Case 2: We only have a message stored - add the message and response
              updatedHistory[msgId] = [userMessage, assistantMessage, ...updatedHistory[msgId]];
              console.log("Added message and response to history:", updatedHistory[msgId]);
            } else {
              // Case 3: We already have complete pairs - add the new pair at the beginning
              updatedHistory[msgId] = [userMessage, assistantMessage, ...updatedHistory[msgId]];
              console.log("Added new message pair to existing history:", updatedHistory[msgId]);
            }
            
            return updatedHistory;
          });
        }
        
        // Add the message to the chat
        addMessage(assistantMessage as ChatMessage);
      } else {
        // Handle case where response or response.message is undefined
        throw new Error("Received invalid response from AI service");
      }
    } catch (error) {
      console.error('Error in AI chat:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate response",
        variant: "destructive",
        duration: 5000,
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
          // Set autocomplete visible
          setShowAutocomplete(true);
        } else {
          setShowAutocomplete(true);
        }
        
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
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('aiContextUpdated', { 
        detail: { context: updatedComposerContext }
      });
      window.dispatchEvent(event);
    }
  };
  
  const handleClearAllContextDocuments = () => {
    // Clear context documents
    setContextDocuments([]);
    
    // Clear composer context files in localStorage
    setComposerContextFiles([]);
    localStorage.removeItem('aiComposerContext');
    
    // Dispatch event to notify other components
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('aiContextUpdated', { 
        detail: { context: [] }
      });
      window.dispatchEvent(event);
    }
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
    setShowClearConfirmation(false);
    clearMessages();
    toast({
      title: "Chat cleared",
      description: "All chat messages have been cleared.",
      duration: 3000,
    });
  };

  // Function to start editing a user message
  const handleEditMessage = (message: EnhancedChatMessage) => {
    if (message.id) {
      setEditingMessageId(message.id);
      // Use userContent if available, otherwise fall back to content
      setEditedPrompt(message.userContent || message.content);
    }
  };

  // Function to cancel editing
  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditedPrompt("");
  };

  // Function to save the edited message and regenerate the response
  const handleSaveEdit = async (messageId: string | undefined) => {
    // Check if messageId is defined
    if (!messageId) return;
    
    console.log("Starting handleSaveEdit for message ID:", messageId);
    
    // Find the original message and its index
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;
    
    // Find the subsequent assistant message (if exists)
    const nextMessageIndex = messageIndex + 1;
    const hasAssistantResponse = nextMessageIndex < messages.length && 
                               messages[nextMessageIndex].role === 'assistant';
    
    // Keep the original messages for history
    const originalMessage = messages[messageIndex] as EnhancedChatMessage;
    let originalAssistantMessage: EnhancedChatMessage | undefined;
    
    if (hasAssistantResponse) {
      originalAssistantMessage = messages[nextMessageIndex] as EnhancedChatMessage;
      console.log("Original assistant message:", originalAssistantMessage);
    }
    
    // Create updated message with edited content
    const updatedMessage = {
      ...originalMessage, 
      content: editedPrompt,
      userContent: editedPrompt
    } as EnhancedChatMessage;
    
    console.log("Original message:", originalMessage);
    console.log("Updated message:", updatedMessage);
    
    // Update the user message in the messages list
    const updatedMessages = [...messages];
    updatedMessages[messageIndex] = updatedMessage as ChatMessage;
    
    // If there was an assistant response, remove it (will be regenerated)
    if (hasAssistantResponse) {
      updatedMessages.splice(nextMessageIndex, 1);
    }
    
    // Update messages state
    setMessages(updatedMessages);
    
    // Clear editing state
    setEditingMessageId(null);
    setEditedPrompt("");
    
    // Generate new response
    // Set loading state
    setIsLoading(true);
    
    try {
      // Call the server action with all messages up to and including the edited message
      const response = await generateChatResponse({
        messages: updatedMessages,
        contextDocuments: contextDocuments.map(doc => ({
          id: doc.id,
          title: doc.name,
          content: doc.content
        })),
        stream: false
      });
      
      // Check if response and debugPrompt exist before using them
      if (response && response.debugPrompt) {
        setLastPrompt(response.debugPrompt);
      }
      
      // Make sure response and response.message exist before creating assistantMessage
      if (response && response.message) {
        // Add the assistant's response to the chat with updated structure
        const assistantMessage: EnhancedChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: response.message.content, // Keep for backward compatibility
          assistantContent: response.message.content, // New structure
          model: response.model,
          provider: response.provider
        };
        
        // NOW update the message history with both the original and new messages
        // This is the only place where we update message history in this function
        setMessageHistory(prev => {
          const updatedHistory = {...prev};
          
          // First, check if we had a previous assistant response
          if (originalAssistantMessage) {
            // We had an existing message pair - add both the original and new pairs
            if (!updatedHistory[messageId]) {
              // First time editing this message, initialize with the original pair first
              updatedHistory[messageId] = [originalMessage, originalAssistantMessage];
              console.log("Created history entry with original and edited messages:", updatedHistory[messageId]);
            } else {
              // Not the first regeneration - just add the original pair, as it might not be there yet
              const containsOriginalMessage = updatedHistory[messageId].some(
                msg => msg.id === originalMessage.id && msg.content === originalMessage.content
              );
              
              if (!containsOriginalMessage) {
                // Only add the original message pair if it's not already in the history
                updatedHistory[messageId] = [...updatedHistory[messageId], originalMessage, originalAssistantMessage];
                console.log("Added original message pair to history:", updatedHistory[messageId]);
              }
            }
          }
          
          // Then, add the new edited message and response at the beginning
          // This ensures the most recent is always first, no matter what
          updatedHistory[messageId] = [updatedMessage, assistantMessage, ...updatedHistory[messageId]];
          console.log("Added new message pair to history:", updatedHistory[messageId]);
          
          return updatedHistory;
        });
        
        // Reset active version counter to 0 (most recent)
        setActiveResponseVersion(prev => ({...prev, [messageId]: 0}));
        
        // Add the message to the chat
        addMessage(assistantMessage as ChatMessage);
      } else {
        // Handle case where response or response.message is undefined
        throw new Error("Received invalid response from AI service");
      }
    } catch (error) {
      console.error('Error in AI chat:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate response",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to navigate to previous versions of a response
  const handleNavigateHistory = (messageId: string | undefined, direction: 'prev' | 'next') => {
    // Check if messageId is defined
    if (!messageId) return;
    
    console.log(`Starting navigation for message ${messageId}, direction: ${direction}`);
    
    // Get current active version and history
    const currentVersion = activeResponseVersion[messageId] || 0;
    const msgHistory = messageHistory[messageId];
    
    console.log(`Current version: ${currentVersion}`);
    console.log(`Message history length: ${msgHistory?.length || 0}`);
    
    // If no history exists, exit
    if (!msgHistory || msgHistory.length === 0) {
      console.log("No history found for message ID:", messageId);
      return;
    }
    
    // Calculate history pairs (user + assistant messages)
    const historyPairs = Math.floor(msgHistory.length / 2);
    console.log(`Message has ${historyPairs} history pairs`);
    
    // Calculate new version based on direction
    let newVersion;
    if (direction === 'prev') {
      newVersion = currentVersion < historyPairs - 1 ? currentVersion + 1 : currentVersion;
      console.log(`Trying to navigate to older version: ${currentVersion} -> ${newVersion}`);
    } else { // next
      newVersion = currentVersion > 0 ? currentVersion - 1 : 0;
      console.log(`Trying to navigate to newer version: ${currentVersion} -> ${newVersion}`);
    }
    
    // If no change, exit
    if (newVersion === currentVersion) {
      console.log("Version did not change, exiting navigator");
      return;
    }
    
    console.log(`Navigating from version ${currentVersion} to ${newVersion}`);
    
    // Update active version
    setActiveResponseVersion(prev => {
      const updated = {...prev, [messageId]: newVersion};
      console.log("Updated active versions:", updated);
      return updated;
    });
    
    // Find the message in the UI
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) {
      console.error(`Message ID ${messageId} not found in messages list`);
      return;
    }
    
    if (messageIndex + 1 >= messages.length) {
      console.error(`No assistant message after message at index ${messageIndex}`);
      return;
    }
    
    // Calculate index in the history array (which stores [user1, assistant1, user2, assistant2, ...])
    const pairIndex = newVersion * 2;
    
    if (pairIndex < 0 || pairIndex + 1 >= msgHistory.length) {
      console.error(`Invalid history index: ${pairIndex} for history of length ${msgHistory.length}`);
      return;
    }
    
    const historicalUserMsg = msgHistory[pairIndex]; // user message
    const historicalAssistantMsg = msgHistory[pairIndex + 1]; // assistant message
    
    if (!historicalUserMsg || !historicalAssistantMsg) {
      console.error("Missing message in history");
      return;
    }
    
    console.log("Retrieved historical messages:", {
      user: historicalUserMsg.content.substring(0, 20) + "...",
      assistant: historicalAssistantMsg.content.substring(0, 20) + "..."
    });
    
    // Update the messages with historical versions
    const updatedMessages = [...messages];
    updatedMessages[messageIndex] = historicalUserMsg;
    updatedMessages[messageIndex + 1] = historicalAssistantMsg;
    
    console.log("Updating messages with historical versions");
    setMessages(updatedMessages);
  };

  const createAndSaveComposition = async (
    name: string, 
    contextDocs: ContextDocument[], 
    chatMessages: EnhancedChatMessage[],
    customIntro?: string
  ) => {
    try {
      console.log(`Creating composition "${name}" with ${contextDocs.length} context documents and ${chatMessages.length} messages`);
      console.log("Context documents:", contextDocs.map(doc => ({ id: doc.id, name: doc.name })));
      
      // Format the chat transcript
      let content = `# ${name}\n\n`;
      
      // Add custom intro if provided, otherwise use default
      if (customIntro) {
        content += `${customIntro}\n\n`;
      } else if (contextDocs.length > 0 && chatMessages.length === 0) {
        // If there are only context documents but no messages, add a default intro
        content += `Composition created with context documents.\n\n`;
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
      messages as EnhancedChatMessage[]
    );
    
    if (success) {
      // Reset state
      setCompositionName("");
      setShowSaveCompositionDialog(false);
    }
  };

  // Add a button to insert a system message for demonstration
  const addSystemMessage = () => {
    const systemMessage: EnhancedChatMessage = {
      id: generateId(),
      role: 'system' as 'user' | 'assistant', // Type assertion to work with the API
      content: "I'll help you analyze and improve your documents. You can ask me to summarize, edit, or give feedback on your writing.",
      systemContent: "I'll help you analyze and improve your documents. You can ask me to summarize, edit, or give feedback on your writing."
    };
    
    // Insert the system message at the beginning of the messages array
    setMessages([systemMessage as ChatMessage, ...messages]);
    
    toast({
      title: "System message added",
      description: "A system message has been added to the conversation.",
      duration: 3000,
    });
  };

  return (
    <Card className={cn(
      "w-full h-full flex flex-col border rounded-lg overflow-hidden shadow-md transition-all duration-200",
      isExpanded ? "fixed inset-4 z-50" : "relative"
    )}>
      <CardHeader className="px-3 py-1.5 border-b">
        <div className="flex items-center justify-between">
          
          {isExpanded && (
            <div className="flex items-center">
              <span className="text-sm font-medium">AI Composer - Expanded Mode</span>
            </div>
          )}
          
          <div className={cn(
            "flex items-center gap-0.5",
            isExpanded ? "" : "ml-auto" // Push to right when not expanded
          )}>
            {/* Display the current model */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Badge 
                  variant="outline" 
                  className="mr-1 text-xs bg-primary/5 cursor-pointer hover:bg-primary/10"
                  title="Select AI model"
                >
                  {LLM_MODELS[config.provider as keyof typeof LLM_MODELS].find((m: ModelOption) => m.value === config.model)?.label || config.model}
                </Badge>
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
            
            <Button 
              variant="ghost" 
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground"
              title="Save as composition"
              onClick={() => setShowSaveCompositionDialog(true)}
            >
              <Save className="h-3.5 w-3.5" />
            </Button>
            
            <DropdownMenu open={isContextMenuOpen} onOpenChange={setIsContextMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 w-7 p-0"
                  title="Add document to context"
                >
                  <AtSign className="h-3.5 w-3.5" />
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
                        className="flex items-center justify-between py-1.5"
                      >
                        <span className="truncate text-xs">{doc.name}</span>
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <div className="px-2 py-3 text-center text-xs text-muted-foreground">
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
                  className="h-7 w-7 p-0 text-muted-foreground"
                  title="Show debug information"
                >
                  <Bug className="h-3.5 w-3.5" />
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
              className="h-7 w-7 p-0 text-muted-foreground"
              title="Clear chat history"
              onClick={() => setShowClearConfirmation(true)}
            >
              <Eraser className="h-3.5 w-3.5" />
            </Button>
            
            {onToggleExpand && (
              <Button 
                variant="ghost" 
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground"
                title={isExpanded ? "Exit full screen" : "Expand to full screen"}
                onClick={onToggleExpand}
              >
                {isExpanded ? (
                  <Minimize2 className="h-3.5 w-3.5" />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5" />
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
            
            <Button 
              variant="ghost" 
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground"
              title="Add system message"
              onClick={addSystemMessage}
            >
              <Bot className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {/* Context documents list - simplified */}
      {contextDocuments.length > 0 && (
        <div className="flex flex-wrap gap-1 mx-3 mt-0.5 p-1 bg-muted/30 rounded-md">
          <div className="flex justify-between w-full mb-0.5">
            <span className="text-xs text-muted-foreground">Context documents:</span>
            <div className="flex gap-0.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-4 px-1.5 py-0 text-xs text-muted-foreground hover:text-destructive"
                onClick={handleClearAllContextDocuments}
              >
                Clear All
              </Button>
            </div>
          </div>
          {contextDocuments.map(doc => (
            <Badge key={doc.id} variant="secondary" className="flex items-center gap-0.5 pl-1.5 text-xs">
              {doc.name}
              <Button
                variant="ghost"
                size="icon"
                className="h-2.5 w-2.5 ml-0.5 rounded-full"
                onClick={() => handleRemoveContextDocument(doc.id)}
              >
                <X className="h-1.5 w-1.5" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
      
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-3 space-y-3">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-4">
                <Sparkles className="h-5 w-5 mx-auto mb-1.5 opacity-50" />
                <p className="text-xs">Ask me anything about your document(s)</p>
                <div className="mt-2 grid grid-cols-1 gap-1.5 mx-auto max-w-md">
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
              messages.map((message, index) => {
                // Cast the message to EnhancedChatMessage to access the new fields
                const enhancedMessage = message as EnhancedChatMessage;
                return (
                  <div 
                    key={message.id || index} 
                    className={`flex ${
                      hasRole(message as EnhancedChatMessage, 'user') 
                        ? 'justify-end' 
                        : hasRole(message as EnhancedChatMessage, 'system') 
                          ? 'justify-center' 
                          : 'justify-start'
                    }`}
                  >
                    <div 
                      className={cn(
                        "max-w-[90%] rounded-lg p-2 group",
                        hasRole(message as EnhancedChatMessage, 'user')
                          ? 'bg-muted text-foreground'
                          : hasRole(message as EnhancedChatMessage, 'system')
                          ? 'bg-primary/10 text-foreground'
                          : message.model && MODEL_COLORS[message.model as keyof typeof MODEL_COLORS]
                            ? MODEL_COLORS[message.model as keyof typeof MODEL_COLORS]
                            : 'bg-muted/70'
                      )}
                    >
                      {/* Display role badge for system messages */}
                      {hasRole(message as EnhancedChatMessage, 'system') && (
                        <Badge variant="outline" className="mb-1 text-[10px] bg-primary/10">System</Badge>
                      )}
                      
                      {/* Editing mode for user messages */}
                      {hasRole(message as EnhancedChatMessage, 'user') && editingMessageId === message.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editedPrompt}
                            onChange={(e) => setEditedPrompt(e.target.value)}
                            className="min-h-[60px] text-xs bg-background text-foreground"
                            autoFocus
                          />
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleCancelEdit}
                              className="h-7 text-xs"
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleSaveEdit(message.id)}
                              className="h-7 text-xs"
                              disabled={!editedPrompt.trim()}
                            >
                              Regenerate
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap text-xs">
                          {getDisplayContent(enhancedMessage)}
                        </div>
                      )}
                      
                      {/* Show buttons for user messages when not editing */}
                      {hasRole(message as EnhancedChatMessage, 'user') && editingMessageId !== message.id && (
                        <div className="mt-1.5 pt-0.5 border-t border-border flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => handleEditMessage(enhancedMessage)}
                            title="Edit prompt"
                          >
                            <Pencil className="h-2.5 w-2.5" />
                          </Button>
                        </div>
                      )}
                      
                      {/* Show buttons for assistant messages */}
                      {hasRole(message as EnhancedChatMessage, 'assistant') && (
                        <div className="mt-1.5 pt-0.5 border-t border-border flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                          {/* Version navigation buttons */}
                          {(() => {
                            // Safe access to previous message and its history
                            const prevMessage = index > 0 ? messages[index-1] as EnhancedChatMessage : null;
                            const prevMessageId = prevMessage?.id || '';
                            const msgHistory = prevMessageId ? messageHistory[prevMessageId] : null;
                            const hasHistory = !!msgHistory && msgHistory.length > 0;
                            
                            if (!hasHistory) return null;
                            
                            const historyPairs = Math.floor(msgHistory.length / 2); // Ensure integer division
                            
                            // Only show if we have at least 2 versions (otherwise navigation makes no sense)
                            if (historyPairs <= 1) return null;
                            
                            const currentVersion = activeResponseVersion[prevMessageId] || 0;
                            const hasOlderVersions = currentVersion < historyPairs - 1;
                            const hasNewerVersions = currentVersion > 0;
                            
                            console.log(`Version navigation: ${currentVersion}/${historyPairs}, older: ${hasOlderVersions}, newer: ${hasNewerVersions}`);
                            
                            return (
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5"
                                  onClick={() => handleNavigateHistory(prevMessageId, 'prev')}
                                  title="View older version"
                                  disabled={!hasOlderVersions}
                                >
                                  <ChevronUp className="h-2.5 w-2.5" />
                                </Button>
                                
                                <span className="text-[10px] text-muted-foreground">
                                  v{historyPairs - currentVersion}/{historyPairs}
                                </span>
                                
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5"
                                  onClick={() => handleNavigateHistory(prevMessageId, 'next')}
                                  title="View newer version"
                                  disabled={!hasNewerVersions}
                                >
                                  <ChevronDown className="h-2.5 w-2.5" />
                                </Button>
                              </div>
                            );
                          })()}
                          
                          {/* Existing action buttons */}
                          <div className="flex items-center ml-auto">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={() => handleInsertResponse(getDisplayContent(enhancedMessage))}
                              title="Add to document"
                            >
                              <ArrowLeft className="h-2.5 w-2.5" />
                            </Button>
                            
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={() => handleCopyToClipboard(getDisplayContent(enhancedMessage), `msg-${index}`)}
                              title="Copy to clipboard"
                            >
                              {isCopied === `msg-${index}` ? (
                                <Check className="h-2.5 w-2.5" />
                              ) : (
                                <Copy className="h-2.5 w-2.5" />
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-lg p-2 bg-muted/70 flex items-center text-xs">
                  <RefreshCw className="h-2.5 w-2.5 animate-spin mr-1.5" />
                  Thinking...
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </CardContent>
      
      <CardFooter className="p-2 pt-1.5 border-t">
        <div className="flex gap-1.5 w-full relative">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              placeholder="Ask ..."
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              className="min-h-[40px] flex-1 resize-none text-xs"
              disabled={isLoading}
            />
            <div className="absolute right-1.5 bottom-1.5 text-[10px] text-muted-foreground bg-background px-0.5 rounded opacity-50">
              <span className="font-bold">@</span> <span>to add documents</span>
            </div>
          </div>
          <Button 
            type="submit" 
            size="icon" 
            variant="ghost"
            className="h-[40px] w-[40px] rounded-full bg-primary/10 hover:bg-primary/20"
            onClick={(e) => handleFormSubmit(e as unknown as React.FormEvent<HTMLFormElement>)}
            disabled={isLoading || !input.trim()}
          >
            <Send className="h-3.5 w-3.5 text-primary" />
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
      
      {/* Add AIRoleSwitcher here */}
      <div className="px-3 pt-3">
        <AIRoleSwitcher />
      </div>
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