"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
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
  X,
  User
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
import { generateMCPChatResponse } from "@/lib/mcp-service";
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
import type { ContextDocument } from "@/types/contextDocument";
import { BranchMenu } from "@/components/branch-menu";
import { ChatMessageNode } from "@/lib/store";
import { PromptEnhancementButtons } from '@/components/prompt-enhancement';
import { BookmarkMessage } from '@/components/bookmark-message';
import { MCPServersIndicator } from '@/components/mcp-servers-indicator';
import { Switch } from "@/components/ui/switch";
import { formatDebugPrompt } from '@/lib/ai-debug';
import { appendToHistory } from '@/lib/history-service';
import HistoryDropdown from '@/components/history-dropdown';

// ============================================================================
// Constants and Configuration
// ============================================================================
// Color mapping for different AI models
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
   
  // Featherless.ai models
  'featherless-ai/Qwerky-QwQ-32B': 'bg-orange-100 dark:bg-orange-950/50',
  'featherless-ai/Qwerky-72B': 'bg-orange-100 dark:bg-orange-950/50',
  'deepseek-ai/DeepSeek-R1': 'bg-orange-50 dark:bg-orange-950/50', 
  

};

// ============================================================================
// Type Definitions and Interfaces
// ============================================================================
interface AIChatProps {
  onInsertText?: (text: string) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

interface ModelOption {
  value: string;
  label: string;
}

type ProviderValue = 'openai' | 'openrouter' | 'anthropic' | 'gemini' | 'featherless' | 'groq';

interface ProviderOption {
  value: ProviderValue;
  label: string;
}

// Update the message history type to handle nulls
type MessageHistory = Array<ChatMessage | null>;

// ============================================================================
// Helper Functions
// ============================================================================
// Helper to filter out nulls from message history
function filterNullMessages(messages: MessageHistory): ChatMessage[] {
  return messages.filter((msg): msg is ChatMessage => msg !== null);
}

// Helper to get content for display based on role
function getDisplayContent(message: ChatMessageNode): string {
  if (message.systemContent) return message.systemContent;
  if (message.userContent) return message.userContent;
  if (message.assistantContent) return message.assistantContent;
  return '';
}

// Type guard to check if a message has content of a specific type
function hasRole(message: ChatMessageNode, role: 'user' | 'assistant' | 'system'): boolean {
  switch (role) {
    case 'user':
      return !!message.userContent;
    case 'assistant':
      return !!message.assistantContent;
    case 'system':
      return !!message.systemContent;
    default:
      return false;
  }
}

// Helper to check if a node has siblings
function hasSiblings(nodeId: string): boolean {
  const { chatTree } = useAIChatStore.getState();
  const node = chatTree.nodes[nodeId];
  if (!node || !node.parentId) return false;
  
  const parent = chatTree.nodes[node.parentId];
  return parent.childrenIds.length > 1;
}

// Helper to get the number of siblings for a node
function getSiblingCount(nodeId: string): number {
  const { chatTree } = useAIChatStore.getState();
  const node = chatTree.nodes[nodeId];
  if (!node || !node.parentId) return 0;
  
  const parent = chatTree.nodes[node.parentId];
  return parent.childrenIds.length;
}

// Helper to get the current branch index
function getCurrentBranchIndex(nodeId: string): number {
  const { chatTree } = useAIChatStore.getState();
  const node = chatTree.nodes[nodeId];
  if (!node || !node.parentId) return 0;
  
  const parent = chatTree.nodes[node.parentId];
  return parent.childrenIds.indexOf(nodeId);
}

// Helper function to check if a node is in the active thread
function isNodeActive(message: ChatMessageNode): boolean {
  return message.isActive;
}

// Helper function to convert ChatMessageNode to LLM service ChatMessage
function convertToLLMMessage(node: ChatMessageNode): ChatMessage {
  let role: 'user' | 'assistant' | 'system' = 'user';
  let content = '';
  
  if (node.systemContent) {
    role = 'system';
    content = node.systemContent;
  } else if (node.userContent) {
    role = 'user';
    content = node.userContent;
  } else if (node.assistantContent) {
    role = 'assistant';
    content = node.assistantContent;
  }
  
  return {
    role,
    content,
    model: node.model
  };
}

// Helper function to filter out nulls and convert messages
function prepareMessagesForAPI(messages: (ChatMessageNode | null)[]): ChatMessage[] {
  return messages
    .filter((msg): msg is ChatMessageNode => msg !== null)
    .map(convertToLLMMessage);
}

// ============================================================================
// Main Component
// ============================================================================
export default function AIChat({ onInsertText, isExpanded, onToggleExpand }: AIChatProps) {
  // ============================================================================
  // State and Store Management
  // ============================================================================
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
    clearAll,
    ensureActiveThread
  } = useAIChatStore();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Save LLM config to cookies on component mount
  useEffect(() => {
    useLLMStore.getState().saveToCookies();
  }, []);
  
  // Ensure proper node activation when component mounts or chat tree changes
  useEffect(() => {
    // Only call ensureActiveThread if there are nodes in the tree
    if (chatTree.rootId && Object.keys(chatTree.nodes).length > 0) {
      ensureActiveThread();
    }
  }, [chatTree.rootId]); // Only depend on rootId changes
  
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
  const [lastApiMessages, setLastApiMessages] = useState<ChatMessage[]>([]);
  const [useMCPService, setUseMCPService] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState<string>("");
  const [lastPrompt, setLastPrompt] = useState<string>("");
  
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

  // Function to handle form submission
  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!input.trim() || isLoading) return;
    
    // Generate a unique ID for the message node
    const messageNodeId = generateId();
    
    // Create a message node that will hold both user and assistant content
    const messageNode: ChatMessageNode = {
      id: messageNodeId,
      userContent: input,
      parentId: chatTree.activeThread.length > 0 
        ? chatTree.activeThread[chatTree.activeThread.length - 1] 
        : null,
      childrenIds: [],
      isActive: true,
      threadPosition: chatTree.activeThread.length
    };
    
    // Add message node to the chat tree
    addNode(messageNode);
    
    // Always log user message to history first, before any processing
    try {
      await appendToHistory(input);
    } catch (error) {
      console.error('Failed to save message to history:', error);
    }
    
    // Clear input
    setInput("");
    
    // Set loading state
    setIsLoading(true);
    
    try {
      // Get history messages from the active thread, including the user message we just added
      const historyMessages = prepareMessagesForAPI(
        chatTree.activeThread.map(nodeId => chatTree.nodes[nodeId] || null)
      );
      
      // Add the user message as the final message
      const apiMessages = [...historyMessages, convertToLLMMessage(messageNode)];
      
      console.log("Sending messages to API:", apiMessages);
      
      // Store the API messages for debugging
      setLastApiMessages(apiMessages);
      
      // Prepare the request
      const chatRequest = {
        messages: apiMessages,
        contextDocuments: contextDocuments.map(doc => ({
          id: doc.id,
          title: doc.name,
          content: doc.content
        })),
        stream: false
      };
      
      // Call the appropriate service based on toggle state
      const response = useMCPService 
        ? await generateMCPChatResponse(chatRequest)
        : await generateChatResponse(chatRequest);
      
      // Check if response and debugPrompt exist before using them
      if (response && response.debugPrompt) {
        setLastPrompt(response.debugPrompt);
      }
      
      // Make sure response and response.message exist before updating the node
      if (response && response.message) {
        // Update the existing node with the assistant's response
        const updatedNode: ChatMessageNode = {
          ...messageNode,
          assistantContent: response.message.content,
          model: response.model
        };
        
        // Update the node in the chat tree
        updateNode(messageNodeId, updatedNode);
        
        // Update the active thread to include the updated node
        const newActiveThread = [...chatTree.activeThread, messageNodeId];
        setActiveThread(newActiveThread);
      } else {
        // Handle case where response or response.message is undefined
        throw new Error("Received invalid response from AI service");
      }
    } catch (error) {
      console.error('Error in AI chat:', error);
      toast({
        title: "AI Response Error",
        description: error instanceof Error 
          ? `Failed to generate response: ${error.message}`
          : "An unexpected error occurred while generating the AI response. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Function to save the edited message and create a new branch
  const handleSaveEdit = async (nodeId: string, editedPrompt: string) => {
    try {
      setIsLoading(true);
      
      // Get the original node and its path to root
      const originalNode = chatTree.nodes[nodeId];
      if (!originalNode) return;
      
      // Get the original message text for history logging
      const originalMessage = originalNode.userContent || '';
      
      const pathToParent = chatTree.activeThread.slice(0, chatTree.activeThread.indexOf(nodeId));
      
      // Get history messages from the active thread up to the edited message
      const historyMessages = prepareMessagesForAPI(
        pathToParent.map(nodeId => chatTree.nodes[nodeId] || null)
      );
      
      // Add the edited message as the final message
      const apiMessages: ChatMessage[] = [...historyMessages, {
        role: 'user' as const,
        content: editedPrompt
      }];
      
      // Store the API messages for debugging
      setLastApiMessages(apiMessages);
      
      // Prepare the request
      const chatRequest = {
        messages: apiMessages,
        contextDocuments: contextDocuments.map(doc => ({
          id: doc.id,
          title: doc.name,
          content: doc.content
        })),
        stream: false
      };
      
      // Call the appropriate service based on toggle state
      const response = useMCPService 
        ? await generateMCPChatResponse(chatRequest)
        : await generateChatResponse(chatRequest);
      
      // Check if response and debugPrompt exist before using them
      if (response && response.debugPrompt) {
        setLastPrompt(response.debugPrompt);
      }
      
      // Make sure response and response.message exist before creating the new node
      if (response && response.message) {
        // Generate a new ID for the new node
        const newNodeId = generateId();
        
        // Create a new node with both user and assistant content
        const newNode: ChatMessageNode = {
          id: newNodeId,
          userContent: editedPrompt,
          assistantContent: response.message.content,
          model: response.model,
          parentId: originalNode.parentId,
          childrenIds: [],
          isActive: true,
          threadPosition: originalNode.threadPosition
        };
        
        // Add the new node to the chat tree
        addNode(newNode);
        
        // Update the active thread to include the new node
        const newActiveThread = [...pathToParent, newNodeId];
        setActiveThread(newActiveThread);
        
        // Log edited message to history with both original and edited text
        try {
          await appendToHistory(`[EDITED] Original: "${originalMessage}" → New: "${editedPrompt}"`);
        } catch (error) {
          console.error('Failed to save edited message to history:', error);
        }
        
        // Exit edit mode
        setEditingMessageId(null);
        setEditedPrompt("");
      } else {
        // Handle case where response or response.message is undefined
        throw new Error("Received invalid response from AI service");
      }
    } catch (error) {
      console.error('Error saving edit:', error);
      toast({
        title: "Error",
        description: "Failed to save edit. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Function to add a system message
  const addSystemMessage = () => {
    const systemNodeId = generateId();
    const systemNode: ChatMessageNode = {
      id: systemNodeId,
      systemContent: "I'll help you analyze and improve your documents. You can ask me to summarize, edit, or give feedback on your writing.",
      parentId: null,
      childrenIds: [],
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

  // Add handler functions
  function handleClearChat() {
    setShowClearConfirmation(false);
    clearAll();
    // Also clear context documents when clearing chat
    setContextDocuments([]);
    // Clear debug information
    setLastPrompt("");
    setLastApiMessages([]);
    toast({
      title: "Chat cleared",
      description: "All chat messages and context documents have been cleared.",
      duration: 3000,
    });
  }

  function handleClearAllContextDocuments() {
    // Clear context documents
    setContextDocuments([]);
    toast({
      title: "Context cleared",
      description: "All context documents have been removed.",
      duration: 3000,
    });
  }

  function handleRemoveContextDocument(documentId: string) {
    // Remove document from context
    setContextDocuments(prevDocs => prevDocs.filter(doc => doc.id !== documentId));
    toast({
      title: "Document removed",
      description: "The document has been removed from context.",
      duration: 3000,
    });
  }

  function handleAddContextDocument(document: { id: string; name: string; content: string }) {
    // Use the addContextDocument function
    addContextDocument(document);
    
    toast({
      title: "Document added",
      description: `"${document.name}" has been added to the conversation context.`,
      duration: 3000,
    });
  }

  function handleEditMessage(message: { id: string; userContent: string }) {
    if (message.id) {
      setEditingMessageId(message.id);
      setEditedPrompt(message.userContent);
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
  
  // Function to navigate to a sibling node
  function navigateToSibling(nodeId: string) {
    if (!nodeId || !chatTree.nodes[nodeId]) {
      console.error("Node not found:", nodeId);
      return;
    }
    
    console.log("Navigating to sibling:", nodeId);
    
    try {
      // Get the parent node
      const parentId = chatTree.nodes[nodeId].parentId;
      if (!parentId) {
        console.error("Parent node not found for:", nodeId);
        return;
      }
      
      // Build thread from root to this node
      const newThread: string[] = [];
      let currentNodeId: string | null = nodeId;
      
      while (currentNodeId && chatTree.nodes[currentNodeId]) {
        newThread.unshift(currentNodeId);
        currentNodeId = chatTree.nodes[currentNodeId].parentId;
      }
      
      // Update active thread and node states
      setActiveThread(newThread);
      
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
      
      // Format content with a proper header and standardized format for the chat thread
      let compositionContent = `# ${compositionName}\n\n`;
      
      // Add metadata if needed
      if (contextDocuments.length > 0) {
        compositionContent += `## Context Documents\n\n`;
        contextDocuments.forEach(doc => {
          compositionContent += `- ${doc.name}\n`;
        });
        compositionContent += '\n';
      }
      
      // Add chat thread with proper formatting
      compositionContent += `## Chat Thread\n\n`;
      
      // Add each message with a standardized format
      messages.forEach(msg => {
        if (msg.systemContent) {
          compositionContent += `### System\n\n${msg.systemContent}\n\n`;
        } 
        if (msg.userContent) {
          compositionContent += `### User\n\n${msg.userContent}\n\n`;
        } 
        if (msg.assistantContent) {
          compositionContent += `### AI\n\n${msg.assistantContent}\n\n`;
        }
      });

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

  // Add the missing addContextDocument function
  const addContextDocument = (doc: ContextDocument) => {
    setContextDocuments(prev => [...prev, doc]);
  };

  // Add event listener for loading messages from compositions
  useEffect(() => {
    // Check if there's a pending message from history
    const pendingMessage = typeof window !== 'undefined' ? window.localStorage.getItem('pendingChatMessage') : null;
    
    if (pendingMessage) {
      // Set the message in the input field
      setInput(pendingMessage);
      
      // Clear the pending message
      window.localStorage.removeItem('pendingChatMessage');
      
      // Focus the textarea
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 300);
    }
    
    // Handler for when messages are loaded from a composition
    const handleMessagesLoaded = (event: Event) => {
      // Clear existing chat
      clearAll();
      
      // Get the messages from the event
      const customEvent = event as CustomEvent;
      const messages = customEvent.detail?.messages as Array<{role: 'user' | 'assistant', content: string}>;
      
      if (!Array.isArray(messages) || messages.length === 0) {
        console.log("No messages to load or invalid message format");
      return;
    }
    
      console.log("Loading messages into AI chat:", messages);
      
      // Process messages sequentially
      let parentId: string | null = null;
      let position = 0;
      
      // Handle each message in sequence
      messages.forEach((message, index) => {
        const nodeId = generateId();
        
        // Create a node based on message role
        const node: ChatMessageNode = {
          id: nodeId,
          parentId,
          childrenIds: [],
          isActive: true,
          threadPosition: position
        };
        
        // Add content based on role
        if (message.role === 'user') {
          node.userContent = message.content;
        } else if (message.role === 'assistant') {
          node.assistantContent = message.content;
        } else if (message.role === 'system') {
          node.systemContent = message.content;
        }
        
        // Add the node to the chat tree
        addNode(node);
        
        // Update parent for next message
        parentId = nodeId;
        position++;
      });
      
      // Update the active thread
      ensureActiveThread();
      
      toast({
        title: "Chat Loaded",
        description: `Loaded ${messages.length} messages from composition.`,
        duration: 3000,
      });
    };
    
    // Add event listener for aiChatMessagesLoaded
    window.addEventListener('aiChatMessagesLoaded', handleMessagesLoaded);
    
    // Clean up
    return () => {
      window.removeEventListener('aiChatMessagesLoaded', handleMessagesLoaded);
    };
  }, [clearAll, addNode]); // Dependencies needed for the effect
  
  // Add event listener for loading context from compositions
  useEffect(() => {
    // Handler for when context is updated from a composition
    const handleContextUpdated = (event: Event) => {
      const customEvent = event as CustomEvent;
      const contextDocs = customEvent.detail?.context as Array<{id: string; name: string; content?: string}>;
      
      if (!Array.isArray(contextDocs)) {
        console.log("No context to load or invalid context format");
      return;
    }
    
      console.log("Loading context into AI chat:", contextDocs);
      
      // Clear existing context documents
      setContextDocuments([]);
      
      // Find full documents from the document store
      const { documents } = useDocumentStore.getState();
      
      // Add each context document
      contextDocs.forEach(contextDoc => {
        const fullDoc = documents.find(d => d.id === contextDoc.id);
        if (fullDoc) {
          addContextDocument({
            id: fullDoc.id,
            name: fullDoc.name,
            content: fullDoc.content
          });
        }
      });
    };
    
    // Add event listener for aiContextUpdated
    window.addEventListener('aiContextUpdated', handleContextUpdated);
    
    // Clean up
    return () => {
      window.removeEventListener('aiContextUpdated', handleContextUpdated);
    };
  }, []);

  // ============================================================================
  // UI Components
  // ============================================================================
  return (
    <Card
      className={cn(
        "shadow-md w-full transition-all duration-300 ease-in-out",
        isExpanded 
          ? "fixed inset-0 h-screen z-50 rounded-none flex flex-col"  // Full screen with flex layout
          : "relative"
      )}
    >
      {/* Header Section */}
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
            
            {/* MCP Toggle */}
            <div className="flex items-center mr-1 bg-primary/5 rounded-lg px-2 py-0.5">
              <Switch 
                id="mcp-toggle" 
                checked={useMCPService}
                onCheckedChange={setUseMCPService}
                className="scale-75 data-[state=checked]:bg-primary"
              />
              <Label htmlFor="mcp-toggle" className="ml-1 text-xs cursor-pointer">
                MCP
              </Label>
            </div>
            
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
                    apiMessages={lastApiMessages}
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
          </div>
        </div>
      </CardHeader>
      
      {/* Context Documents Section */}
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
      
      {/* Main Chat Content Area */}
      <CardContent className={cn(
        "flex-1 p-0 overflow-hidden",
        isExpanded && "h-[calc(100vh-12rem)]" // Set explicit height in expanded view
      )}>
        <ScrollArea 
          className={cn(
            "h-full", 
            isExpanded && "ai-chat-expanded-scrollbar"
          )} 
          type="auto"
        >
          <div className={cn(
            "px-4 pt-2",
            isExpanded ? "pb-6" : "pb-2" // More padding at bottom when expanded
          )}>
            {chatTree.activeThread.length === 0 ? (
              <div className={cn(
                "text-center text-muted-foreground py-4",
                isExpanded && "max-w-3xl mx-auto"
              )}>
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
              <div className={cn(
                "space-y-4",
                isExpanded && "max-w-3xl mx-auto"
              )}>
                {activeMessages.map((message) => (
                  <div key={message.id} className="flex flex-col gap-1">
                    {/* User message bubble */}
                    {message.userContent && (
                      <div className="flex justify-end pl-10">
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            {editingMessageId === message.id ? (
                              <div className="bg-primary/5 rounded-lg p-3 text-sm">
                                <div className="relative">
                          <Textarea
                            value={editedPrompt}
                            onChange={(e) => setEditedPrompt(e.target.value)}
                                    className="w-full resize-y min-h-[60px] max-h-[200px] text-xs px-2 py-1.5 pr-12 bg-background border-primary/50"
                                    placeholder="Edit your message..."
                            autoFocus
                          />
                                  <div className={cn(
                                    "absolute left-1.5 bottom-1.5 text-[10px] text-muted-foreground bg-background px-0.5 rounded transition-opacity",
                                    isInputFocused || isExpanded ? "opacity-70" : "opacity-50"
                                  )}>
                                    <span className="font-bold">@</span> <span>to add documents</span>
                                  </div>
                                  <div className="absolute right-1 bottom-1 w-3 h-3 cursor-ns-resize opacity-60 hover:opacity-100">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor">
                                      <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z" transform="rotate(45 8 8)"/>
                                    </svg>
                                  </div>
                                </div>
                                <div className="mt-2 flex justify-end gap-1 border-t pt-2">
                                  <PromptEnhancementButtons 
                                    prompt={editedPrompt}
                                    onPromptUpdate={(newPrompt) => setEditedPrompt(newPrompt)}
                                    size="icon"
                                  />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 transition-all active:scale-90 active:bg-muted/50"
                              onClick={handleCancelEdit}
                              title="Cancel"
                            >
                                    <X className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-sm bg-primary/10 hover:bg-primary/20 h-6 w-6 transition-all active:scale-90 active:bg-primary/30"
                              onClick={() => handleSaveEdit(message.id, editedPrompt)}
                              disabled={!editedPrompt.trim()}
                              title="Update message"
                            >
                                    <Send className="h-3 w-3 text-primary" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                              <div className="bg-primary/10 rounded-lg p-3 text-sm">
                                {message.userContent}
                                <div className="mt-2 flex justify-end gap-1 border-t pt-2">
                                  <BookmarkMessage messageContent={message.userContent} />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 transition-all active:scale-90 active:bg-primary/20"
                            onClick={() => handleEditMessage({ id: message.id, userContent: message.userContent || '' })}
                          >
                                    <Pencil className="h-3 w-3" />
                          </Button>
                                  {hasSiblings(message.id) && (
                                    <BranchMenu
                                      currentBranchIndex={getCurrentBranchIndex(message.id)}
                                      branchCount={getSiblingCount(message.id)}
                                      allBranchIds={chatTree.nodes[message.parentId!].childrenIds}
                                      chatNodes={chatTree.nodes}
                                      currentBranchId={message.id}
                                      onBranchSelect={navigateToSibling}
                                    />
                                  )}
                                  <DebugTreeDialog tree={chatTree} />
                                </div>
                        </div>
                      )}
                              </div>
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Assistant message bubble */}
                    {message.assistantContent && (
                      <div className="flex justify-start pr-10">
                        <div className="flex items-start gap-2">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                            <Bot className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="bg-muted rounded-lg p-3 text-sm">
                              {message.assistantContent}
                              <div className="mt-2 flex justify-end gap-1 border-t pt-2">
                                <BookmarkMessage messageContent={message.assistantContent} />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 transition-all active:scale-90 active:bg-primary/20"
                              onClick={() => handleCopyToClipboard(message.assistantContent || '', message.id)}
                                >
                                  {isCopied === message.id ? (
                                    <Check className="h-3 w-3" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 transition-all active:scale-90 active:bg-primary/20"
                              onClick={() => handleInsertResponse(message.assistantContent || '')}
                                >
                                  <FileText className="h-3 w-3" />
                            </Button>
                                {hasSiblings(message.id) && (
                                  <BranchMenu
                                    currentBranchIndex={getCurrentBranchIndex(message.id)}
                                    branchCount={getSiblingCount(message.id)}
                                    allBranchIds={chatTree.nodes[message.parentId!].childrenIds}
                                    chatNodes={chatTree.nodes}
                                    currentBranchId={message.id}
                                    onBranchSelect={navigateToSibling}
                                  />
                                )}
                                <DebugTreeDialog tree={chatTree} />
                              </div>
                            </div>
                          </div>
                          </div>
                        </div>
                      )}
                    </div>
                ))}
                  </div>
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
      
      {/* Input Area */}
      <CardFooter className={cn(
        "p-2 pt-1.5 border-t flex-shrink-0 transition-all duration-200",
        isExpanded ? "pb-4 px-4" : "pb-2"
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
                isExpanded 
                  ? "min-h-[150px] max-h-[500px] border-primary/50 text-sm"
                  : isInputFocused 
                  ? "min-h-[80px] max-h-[300px] border-primary/50" 
                  : "min-h-[40px] max-h-[200px]"
              )}
              disabled={isLoading}
            />
            <div className={cn(
              "absolute left-1.5 bottom-1.5 text-[10px] text-muted-foreground bg-background px-0.5 rounded transition-opacity",
              isInputFocused || isExpanded ? "opacity-70" : "opacity-50"
            )}>
              <span className="font-bold">@</span> <span>to add documents</span>
            </div>
            <div className={cn(
              "absolute right-3 bottom-8 flex items-center gap-1 cursor-pointer bg-background/80 px-2 py-1 rounded border border-border/30 shadow-sm transition-opacity",
              isInputFocused || isExpanded ? "opacity-70 hover:opacity-100" : "opacity-40 hover:opacity-70"
            )}>
              <button 
                onClick={() => {
                  if (textareaRef.current) {
                    const textarea = textareaRef.current;
                    textarea.style.height = `${Math.max(textarea.offsetHeight - 50, 80)}px`;
                  }
                }}
                className="text-muted-foreground hover:text-foreground"
                title="Decrease height"
              >
                <ChevronDown className="h-3 w-3" />
              </button>
              <button 
                onClick={() => {
                  if (textareaRef.current) {
                    const textarea = textareaRef.current;
                    textarea.style.height = `${textarea.offsetHeight + 50}px`;
                  }
                }}
                className="text-muted-foreground hover:text-foreground"
                title="Increase height"
              >
                <ChevronUp className="h-3 w-3" />
              </button>
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
            <div className="flex gap-1">
              <PromptEnhancementButtons 
                prompt={input}
                onPromptUpdate={(newPrompt) => setInput(newPrompt)}
                className={cn(
                  "rounded-sm transition-all duration-200",
                  isInputFocused ? "h-[24px] w-[24px]" : "h-[20px] w-[20px]"
                )}
                size="icon"
              />
              <MCPServersIndicator 
                provider={config.provider}
                className={cn(
                  "rounded-sm transition-all duration-200",
                  isInputFocused ? "h-[24px]" : "h-[20px]"
                )}
              />
              <Button 
                type="submit" 
                size="icon" 
                variant="ghost"
                className={cn(
                  "rounded-sm bg-primary/10 hover:bg-primary/20 transition-all duration-200",
                  isInputFocused ? "h-[24px] w-[24px]" : "h-[20px] w-[20px]"
                )}
                disabled={isLoading || !input.trim()}
                onClick={(e) => handleFormSubmit(e as unknown as React.FormEvent<HTMLFormElement>)}
              >
                <Send className={cn(
                  "text-primary transition-all duration-200",
                  isInputFocused ? "w-3.5 h-3.5" : "w-3 h-3"
                )} />
              </Button>
            </div>
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

// ============================================================================
// Supporting Components
// ============================================================================
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

function DebugTreeDialog({ tree }: { tree: any }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          title="Debug tree structure"
        >
          <Bug className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Chat Tree Structure</DialogTitle>
          <DialogDescription>
            This shows the current state of the chat tree.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="mt-4 max-h-[60vh]">
          <pre className="text-xs p-4 bg-muted rounded-lg overflow-auto">
            {JSON.stringify(tree, null, 2)}
          </pre>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
} 