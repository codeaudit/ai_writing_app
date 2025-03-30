"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { enhancePrompt } from "@/lib/prompt-enhancement";
import { cn } from "@/lib/utils";
import { useAIChatStore, ChatMessageNode } from "@/lib/store";
import { ChatMessage } from "@/lib/llm-service";

interface PromptEnhancementProps {
  prompt: string;
  onPromptUpdate: (prompt: string) => void;
  className?: string; // Add className prop to allow customizing from parent
  size?: "default" | "sm" | "icon"; // Add size prop for flexibility
}

export function PromptEnhancementButtons({ 
  prompt, 
  onPromptUpdate, 
  className,
  size = "icon" 
}: PromptEnhancementProps) {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const { toast } = useToast();
  const chatTree = useAIChatStore(state => state.chatTree);
  
  // Helper function to convert nodes to chat messages
  const convertToLLMMessage = (node: ChatMessageNode): ChatMessage => {
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
  };
  
  // Handle enhancement button click
  const handleEnhancePrompt = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Empty Prompt",
        description: "Please enter a prompt before enhancing.",
        variant: "destructive",
      });
      return;
    }

    setIsEnhancing(true);
    
    try {
      // Get messages from the active thread for context
      const activeThreadMessages: ChatMessage[] = chatTree.activeThread
        .map(nodeId => chatTree.nodes[nodeId])
        .filter(node => node !== undefined)
        .map(convertToLLMMessage);
      
      // Call the enhanced prompt function with the active thread context
      const enhancedPrompt = await enhancePrompt(prompt, activeThreadMessages);
      onPromptUpdate(enhancedPrompt);
      
      toast({
        title: "Prompt Enhanced",
        description: "Your prompt has been improved.",
      });
    } catch (error) {
      console.error("Error enhancing prompt:", error);
      toast({
        title: "Enhancement Failed",
        description: error instanceof Error ? error.message : "Failed to enhance the prompt.",
        variant: "destructive",
      });
    } finally {
      setIsEnhancing(false);
    }
  };

  // Return enhancement button with consistent sizing
  return (
    <Button
      variant="ghost"
      size={size}
      className={cn(
        "text-blue-500 hover:text-blue-700 hover:bg-blue-100 flex items-center justify-center",
        // In message bubbles, ensure consistent sizing with other buttons
        size === "icon" && "h-6 w-6",
        // In the input area, match the Send button size
        className
      )}
      onClick={handleEnhancePrompt}
      disabled={isEnhancing || !prompt.trim()}
      title="Enhance Prompt with Context from Conversation"
    >
      <Sparkles 
        className={cn(
          "h-4 w-4", 
          size === "icon" && "h-3 w-3", // Smaller icon for message bubbles
          isEnhancing && "animate-sparkle"
        )} 
      />
    </Button>
  );
} 