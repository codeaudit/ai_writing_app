"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
import { generateChatResponse, type ChatMessage } from "@/lib/llm-service";
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
import { BranchMenu } from "@/components/branch-menu";
import type { ChatMessageNode } from "@/lib/store";

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

// Update the message history type to handle nulls
type MessageHistory = Array<ChatMessage | null>;

// Helper function to filter out nulls from message history
function filterNullMessages(messages: MessageHistory): ChatMessage[] {
  return messages.filter((msg): msg is ChatMessage => msg !== null);
}

// Define the chat message node type
interface ChatMessageNode extends ChatMessage {
  // Additional content fields for different roles
  systemContent?: string;
  userContent?: string;
  assistantContent?: string;
  
  // Tree structure properties
  id: string;                   // Unique identifier for this node
  parentId: string | null;      // ID of the parent node (null for root)
  childrenIds: string[];        // IDs of child nodes
  siblingIds: string[];         // IDs of sibling nodes (nodes with same parent)
  
  // Navigation metadata
  isActive: boolean;            // Whether this node is in the active thread
  threadPosition: number;       // Position in the active thread (for ordering)
}

// Interface to represent the entire chat tree
interface ChatTree {
  nodes: Record<string, ChatMessageNode>;  // Map of node IDs to nodes
  rootId: string | null;                   // ID of the root node
  activeThread: string[];                  // Ordered list of node IDs in the active thread
}

// Helper function to get content for display based on role
function getDisplayContent(message: ChatMessageNode): string {
  if (message.systemContent && message.role === 'system') {
    return message.systemContent;
  } else if (message.userContent && message.role === 'user') {
    return message.userContent;
  } else if (message.assistantContent && message.role === 'assistant') {
    return message.assistantContent;
  }
  return message.content;
}

// Type guard to check if a message has a specific role
function hasRole(message: ChatMessageNode, role: string): boolean {
  return message.role === role;
}

// Helper to check if a node has siblings
function hasSiblings(message: ChatMessageNode): boolean {
  return message.siblingIds && message.siblingIds.length > 0;
}

// Helper to check if a node is in the active thread
function isNodeActive(message: ChatMessageNode): boolean {
  return message.isActive;
}

// Helper function to convert ChatMessageNode to LLM service ChatMessage
function convertToLLMMessage(node: ChatMessageNode): ChatMessage {
  return {
    role: node.role === 'system' ? 'user' : node.role,
    content: node.content,
    model: node.model,
    provider: node.provider
  };
}

// Helper function to filter out nulls and convert messages
function prepareMessagesForAPI(messages: (ChatMessageNode | null)[]): ChatMessage[] {
  return messages
    .filter((msg): msg is ChatMessageNode => msg !== null)
    .map(convertToLLMMessage);
}

export default function AIChat({ onInsertText, isExpanded, onToggleExpand }: AIChatProps) {
  const { documents } = useDocumentStore();
  const { config, updateConfig } = useLLMStore();
  const { 
    chatTree,
    addNode,
    updateNode,
    setActiveThread,
    createSiblingNode,
    addResponseNode,
    navigateToThread,
    clearAll
  } = useAIChatStore();
  
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
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [showDebugDialog, setShowDebugDialog] = useState(false);
  const [showSaveCompositionDialog, setShowSaveCompositionDialog] = useState(false);
  const [showClearConfirmation, setShowClearConfirmation] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [filteredDocuments, setFilteredDocuments] = useState<ContextDocument[]>([]);
  const [selectedAutocompleteIndex, setSelectedAutocompleteIndex] = useState(-1);
  const [compositionName, setCompositionName] = useState('');
  
  // Debug messages for development
  useEffect(() => {
    console.log("Chat tree state:", chatTree);
  }, [chatTree]);
  
  // Helper to get active thread nodes
  const activeMessages = useMemo(() => 
    chatTree.activeThread
      .map(id => chatTree.nodes[id])
      .filter(Boolean),
    [chatTree.activeThread, chatTree.nodes]
  );
  
  // Scroll to bottom of messages when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages]);

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!input.trim() || isLoading) return;
    
    // Generate a unique ID for the user message node
    const userNodeId = generateId();
    
    // Create a user message node
    const userNode: ChatMessageNode = {
      id: userNodeId,
      role: 'user',
      content: input,
      userContent: input,
      parentId: chatTree.activeThread.length > 0 
        ? chatTree.activeThread[chatTree.activeThread.length - 1] 
        : null,
      childrenIds: [],
      siblingIds: [],
      isActive: true,
      threadPosition: chatTree.activeThread.length
    };
    
    // Add user node to the chat tree
    addNode(userNode);
    
    // Clear input
    setInput("");
    
    // Set loading state
    setIsLoading(true);
    
    try {
      // Get history messages from the active thread, excluding the one we just added
      const historyMessages = prepareMessagesForAPI(
        chatTree.activeThread.length > 1 
          ? chatTree.activeThread.slice(0, -1).map(nodeId => chatTree.nodes[nodeId] || null)
          : []
      );
      
      // Add the user message as the final message
      const apiMessages = [...historyMessages, convertToLLMMessage(userNode)];
      
      console.log("Sending messages to API:", apiMessages);
      
      // Call the server action with all messages for context
      const response = await generateChatResponse({
        messages: apiMessages,
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
        // Add the assistant's response to the chat tree
        addResponseNode(
          userNodeId,
          response.message.content,
          response.model,
          response.provider
        );
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

  // Function to save the edited message and create a new branch
  const handleSaveEdit = async (messageId: string | undefined) => {
    // Check if messageId is defined
    if (!messageId) return;
    
    console.log("Starting handleSaveEdit for message ID:", messageId);
    
    // Get the original node from the chat tree
    const originalNode = chatTree.nodes[messageId];
    if (!originalNode) {
      console.error("Node not found:", messageId);
      return;
    }
    
    // Immediately clear editing state to dismiss the edit field
    setEditingMessageId(null);
    setEditedPrompt("");
    
    // Create a new sibling node with the edited content and focus on it
    const newNodeId = createSiblingNode(messageId, editedPrompt);
    
    // Set loading state
    setIsLoading(true);
    
    try {
      // Get the path to the parent node (excluding the newly created node)
      const pathToParent: string[] = [];
      let currentNodeId = chatTree.nodes[newNodeId]?.parentId;
      
      while (currentNodeId) {
        pathToParent.unshift(currentNodeId);
        currentNodeId = chatTree.nodes[currentNodeId]?.parentId;
      }
      
      // Convert path to messages
      const pathMessages = prepareMessagesForAPI(
        pathToParent.map(nodeId => chatTree.nodes[nodeId] || null)
      );
      
      // Create a new user message with the edited content for the API call
      const editedUserMessage = {
        role: 'user' as const,
        content: editedPrompt
      };
      
      // Add the edited user message as the final message
      const apiMessages = [...pathMessages, editedUserMessage];
      
      console.log("Sending edited messages to API:", apiMessages);
      
      // Call the server action with the history messages + edited message
      const response = await generateChatResponse({
        messages: apiMessages,
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
      
      // Make sure response and response.message exist before creating assistant node
      if (response && response.message) {
        // Add the assistant's response to the chat tree
        addResponseNode(
          newNodeId,
          response.message.content,
          response.model,
          response.provider
        );
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

  // Add a button to insert a system message for demonstration
  const addSystemMessage = () => {
    const systemNodeId = generateId();
    const systemNode: ChatMessageNode = {
      id: systemNodeId,
      role: 'system',
      content: "I'll help you analyze and improve your documents. You can ask me to summarize, edit, or give feedback on your writing.",
      systemContent: "I'll help you analyze and improve your documents. You can ask me to summarize, edit, or give feedback on your writing.",
      parentId: null,
      childrenIds: [],
      siblingIds: [],
      isActive: true,
      threadPosition: 0
    };
    
    // Add the system node to the chat tree
    addNode(systemNode);
    
    // Update the active thread to include the system message at the beginning
    const newActiveThread = chatTree.rootId 
      ? [systemNodeId, ...chatTree.activeThread]
      : [systemNodeId];
    
    setActiveThread(newActiveThread);
    
    toast({
      title: "System message added",
      description: "A system message has been added to the conversation.",
      duration: 3000,
    });
  };

  // State for editing messages
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editedPrompt, setEditedPrompt] = useState<string>("");
  const [lastPrompt, setLastPrompt] = useState<string>("");

  // Add handler functions
  function handleClearChat() {
    setShowClearConfirmation(false);
    clearAll();
    toast({
      title: "Chat cleared",
      description: "All chat messages have been cleared.",
      duration: 3000,
    });
  }

  function handleClearAllContextDocuments() {
    // Clear context documents
    toast({
      title: "Context cleared",
      description: "All context documents have been removed.",
      duration: 3000,
    });
  }

  function handleRemoveContextDocument(documentId: string) {
    // Remove document from context
    toast({
      title: "Document removed",
      description: "The document has been removed from context.",
      duration: 3000,
    });
  }

  function handleAddContextDocument(document: { id: string; name: string; content: string }) {
    // Add document to context
    toast({
      title: "Document added",
      description: `"${document.name}" has been added to the conversation context.`,
      duration: 3000,
    });
  }

  function handleEditMessage(message: { id: string; userContent?: string; content: string }) {
    if (message.id) {
      setEditingMessageId(message.id);
      setEditedPrompt(message.userContent || message.content);
    }
  }

  function handleCancelEdit() {
    setEditingMessageId(null);
    setEditedPrompt("");
  }

  function handleInsertResponse(content: string) {
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
  }
  
  function navigateToSibling(nodeId: string) {
    if (!nodeId || !chatTree.nodes[nodeId]) {
      console.error("Node not found:", nodeId);
      return;
    }
    
    console.log("Navigating to sibling:", nodeId);
    
    try {
      // Perform a single navigation operation to avoid state update loops
      navigateToThread(nodeId);
      
      // Show toast notification only after navigation is complete
      toast({
        title: "Viewing alternate branch",
        description: "Showing the selected conversation branch.",
        duration: 1500
      });
    } catch (error) {
      console.error("Error navigating to thread:", error);
      toast({
        title: "Navigation Error",
        description: "Failed to navigate to the selected branch.",
        variant: "destructive",
        duration: 3000
      });
    }
  }

  function handleCopyToClipboard(content: string, id: string) {
    navigator.clipboard.writeText(content);
    setIsCopied(id);
    
    toast({
      title: "Copied to clipboard",
      description: "The content has been copied to your clipboard.",
      duration: 2000,
    });
    
    setTimeout(() => {
      setIsCopied(null);
    }, 2000);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleFormSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
    }
  }

  function handleFocus() {
    // Set focus state to true
    setIsInputFocused(true);
  }

  function handleBlur() {
    // Add a small delay to ensure other interactions complete first
    setTimeout(() => {
      setIsInputFocused(false);
    }, 100);
  }

  function selectAutocompleteDocument(doc: ContextDocument) {
    // Add the selected document to the context
    addContextDocument(doc);
    // Clear the autocomplete
    setShowAutocomplete(false);
    setFilteredDocuments([]);
    setSelectedAutocompleteIndex(-1);
  }

  // Add handleSaveComposition function
  async function handleSaveComposition() {
    if (!compositionName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name for the composition",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    try {
      // Get the active messages from the chat tree
      const messages = chatTree.activeThread.map(id => chatTree.nodes[id]).filter(Boolean);
      
      // Create the composition content
      const compositionContent = messages.map(msg => {
        const role = msg.role === 'system' ? '[System]' : msg.role === 'user' ? '[User]' : '[Assistant]';
        return `${role}\n${msg.content}\n`;
      }).join('\n');

      // Add the composition
      await useDocumentStore.getState().addComposition(
        compositionName,
        compositionContent,
        contextDocuments.map(doc => ({ id: doc.id, name: doc.name }))
      );

      // Close the dialog and show success message
      setShowSaveCompositionDialog(false);
      setCompositionName('');

      toast({
        title: "Success",
        description: "Composition saved successfully",
        duration: 3000,
      });
    } catch (error) {
      console.error('Error saving composition:', error);
      toast({
        title: "Error",
        description: "Failed to save composition",
        variant: "destructive",
        duration: 3000,
      });
    }
  }

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
            {chatTree.activeThread.length === 0 ? (
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
              // Use the active messages from the tree
              activeMessages.map((node) => {
                if (!node) return null;
                
                return (
                  <div 
                    key={node.id} 
                    className={`flex ${
                      hasRole(node, 'user') 
                        ? 'justify-end' 
                        : hasRole(node, 'system') 
                          ? 'justify-center' 
                          : 'justify-start'
                    }`}
                  >
                    <div 
                      className={cn(
                        "max-w-[90%] rounded-lg p-2 group",
                        hasRole(node, 'user')
                          ? 'bg-muted text-foreground'
                          : hasRole(node, 'system')
                          ? 'bg-primary/10 text-foreground'
                          : node.model && MODEL_COLORS[node.model as keyof typeof MODEL_COLORS]
                            ? MODEL_COLORS[node.model as keyof typeof MODEL_COLORS]
                            : 'bg-muted/70'
                      )}
                    >
                      {/* Display role badge for system messages */}
                      {hasRole(node, 'system') && (
                        <Badge variant="outline" className="mb-1 text-[10px] bg-primary/10">System</Badge>
                      )}
                      
                      {/* Editing mode for user messages */}
                      {hasRole(node, 'user') && editingMessageId === node.id ? (
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
                              onClick={() => handleSaveEdit(node.id)}
                              className="h-7 text-xs"
                              disabled={!editedPrompt.trim()}
                            >
                              Create Branch
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap text-xs">
                          {getDisplayContent(node)}
                        </div>
                      )}
                      
                      {/* Show buttons for user messages when not editing */}
                      {hasRole(node, 'user') && editingMessageId !== node.id && (
                        <div className="mt-1.5 pt-0.5 border-t border-border flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => handleEditMessage(node)}
                            title="Edit prompt & create branch"
                          >
                            <Pencil className="h-2.5 w-2.5" />
                          </Button>
                        </div>
                      )}
                      
                      {/* Show buttons for assistant messages */}
                      {hasRole(node, 'assistant') && (
                        <div className="mt-1.5 pt-0.5 border-t border-border flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                          {/* Branch navigator section */}
                          {(() => {
                            // First check if this is an AI response with a parent user message
                            if (!node.parentId) return null;
                            
                            // Get the parent user message
                            const parentUserNode = chatTree.nodes[node.parentId];
                            if (!parentUserNode || parentUserNode.role !== 'user') return null;
                            
                            // Check if the parent has siblings (indicating branch options)
                            const siblingIds = parentUserNode.siblingIds || [];
                            
                            // Filter out siblings that don't exist and exclude parent itself
                            const validSiblingIds = siblingIds.filter(id => 
                              id !== parentUserNode.id && 
                              chatTree.nodes[id] && 
                              chatTree.nodes[id].role === 'user'
                            );
                            
                            // Only show branch navigation if there are valid siblings
                            if (validSiblingIds.length === 0) return null;
                            
                            // Get all branches including the current one
                            const allBranchIds = [parentUserNode.id, ...validSiblingIds];
                            const branchCount = allBranchIds.length;
                            
                            // Find current branch index
                            const currentBranchIndex = allBranchIds.indexOf(parentUserNode.id);
                            
                            // If there are multiple branches, show the branch menu
                            if (branchCount > 1) {
                              return (
                                <BranchMenu
                                  currentBranchIndex={currentBranchIndex}
                                  branchCount={branchCount}
                                  allBranchIds={allBranchIds}
                                  chatNodes={chatTree.nodes}
                                  currentBranchId={parentUserNode.id}
                                  onBranchSelect={navigateToSibling}
                                />
                              );
                            }
                            
                            return null;
                          })()}
                          
                          {/* Action buttons */}
                          <div className="flex items-center ml-auto">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={() => handleInsertResponse(getDisplayContent(node))}
                              title="Add to document"
                            >
                              <ArrowLeft className="h-2.5 w-2.5" />
                            </Button>
                            
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={() => handleCopyToClipboard(getDisplayContent(node), node.id)}
                              title="Copy to clipboard"
                            >
                              {isCopied === node.id ? (
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
      
      <CardFooter className={cn(
        "p-2 pt-1.5 border-t flex-shrink-0 transition-all duration-200",
        isInputFocused ? "pb-3" : ""
      )}>
        <div className="flex items-start gap-1.5 w-full relative">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              placeholder="Ask ..."
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              onBlur={handleBlur}
              className={cn(
                "flex-1 resize-y text-xs px-2 py-1.5 pr-12 transition-all duration-200",
                isInputFocused 
                  ? "min-h-[80px] max-h-[300px] border-primary/50" 
                  : "min-h-[40px] max-h-[200px]"
              )}
              disabled={isLoading}
            />
            <div className={cn(
              "absolute right-1.5 bottom-1.5 text-[10px] text-muted-foreground bg-background px-0.5 rounded transition-opacity",
              isInputFocused ? "opacity-70" : "opacity-50"
            )}>
              <span className="font-bold">@</span> <span>to add documents</span>
            </div>
            <div className={cn(
              "absolute right-1 bottom-1 w-3 h-3 cursor-ns-resize transition-opacity",
              isInputFocused ? "opacity-60 hover:opacity-100" : "opacity-30 hover:opacity-100"
            )}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z" transform="rotate(45 8 8)"/>
              </svg>
            </div>
          </div>
          <div className="flex flex-col gap-1 items-end shrink-0">
            <div className={cn(
              "transition-all duration-200",
              isInputFocused ? "w-[90px]" : "w-[80px]"
            )}>
              <AIRoleSwitcher 
                className={cn(
                  "text-[10px] rounded-sm bg-muted/30 hover:bg-muted/50 transition-all duration-200",
                  isInputFocused ? "h-[24px]" : "h-[20px]"
                )}
              />
            </div>
            <Button 
              type="submit" 
              size="icon" 
              variant="ghost"
              className={cn(
                "rounded-sm bg-primary/10 hover:bg-primary/20 transition-all duration-200",
                isInputFocused ? "h-[24px] w-[24px]" : "h-[20px] w-[20px]"
              )}
              onClick={(e) => handleFormSubmit(e as unknown as React.FormEvent<HTMLFormElement>)}
              disabled={isLoading || !input.trim()}
            >
              <Send className={cn(
                "text-primary transition-all duration-200",
                isInputFocused ? "h-3.5 w-3.5" : "h-3 w-3"
              )} />
            </Button>
          </div>
          
          {/* Autocomplete dropdown */}
          {showAutocomplete && (
            <div className="absolute bottom-full left-0 mb-1 bg-popover border rounded-md shadow-md w-full max-h-[200px] overflow-auto z-50">
              <div className="p-1">
                <div className="text-xs font-bold mb-1">Documents</div>
                {filteredDocuments.length > 0 ? (
                  filteredDocuments.map((doc, index) => (
                    <div
                      key={doc.id}
                      className={`px-2 py-1 text-xs cursor-pointer hover:bg-muted rounded ${
                        index === selectedAutocompleteIndex ? "bg-accent" : ""
                      }`}
                      onClick={() => selectAutocompleteDocument(doc)}
                    >
                      {doc.name}
                    </div>
                  ))
                ) : (
                  <div className="px-2 py-1 text-xs text-muted-foreground">No documents found</div>
                )}
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
                {chatTree.activeThread.length > 0 
                  ? `${chatTree.activeThread.length} messages will be saved` 
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