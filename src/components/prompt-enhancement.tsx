"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { enhancePrompt } from "@/lib/prompt-enhancement";
import { cn } from "@/lib/utils";

interface PromptEnhancementProps {
  prompt: string;
  onPromptUpdate: (prompt: string) => void;
}

export function PromptEnhancementButtons({ prompt, onPromptUpdate }: PromptEnhancementProps) {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const { toast } = useToast();

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
      const enhancedPrompt = await enhancePrompt(prompt);
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
      title="Enhance Prompt"
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