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
}

export function PromptEnhancementButtons({ prompt, onPromptUpdate }: PromptEnhancementProps) {
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

  // Return just the enhancement button
  return (
    <Button
      variant="ghost"
      size="icon"
      className="text-blue-500 hover:text-blue-700 hover:bg-blue-100"
      onClick={handleEnhancePrompt}
      disabled={isEnhancing || !prompt.trim()}
      title="Enhance Prompt with Context from Conversation"
    >
      <Sparkles 
        className={cn(
          "h-4 w-4", 
          isEnhancing && "animate-sparkle"
        )} 
      />
    </Button>
  );
} 