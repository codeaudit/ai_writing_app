import React from 'react';
import {
  Popover,
  PopoverContent,
  PopoverAnchor,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";

interface LLMDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedText: string;
  position: { x: number; y: number } | null;
}

export function LLMDialog({ isOpen, onClose, selectedText, position }: LLMDialogProps) {
  const [prompt, setPrompt] = React.useState("");
  const [response, setResponse] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    // TODO: Implement actual LLM API call here
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulated delay
    setResponse("This is a simulated LLM response. Replace with actual API integration.");
    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={onClose}>
      <PopoverAnchor 
        style={{
          position: 'absolute',
          left: position?.x ?? 0,
          top: position?.y ?? 0,
        }} 
      />
      <PopoverContent 
        className="w-80" 
        side="top" 
        align="start"
        sideOffset={5}
      >
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about the selected text..."
              className="flex-1"
              autoFocus
            />
            <Button 
              size="sm"
              onClick={handleSubmit} 
              disabled={!prompt || isLoading}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          
          {response && (
            <div className="bg-muted p-2 rounded-md text-sm max-h-40 overflow-y-auto">
              {response}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
} 