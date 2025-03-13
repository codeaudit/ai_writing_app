'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { encode } from 'gpt-tokenizer';

interface TokenCounterDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedText: string;
}

export function TokenCounterDialog({ isOpen, onClose, selectedText }: TokenCounterDialogProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [tokenCount, setTokenCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [wordCount, setWordCount] = useState(0);

  useEffect(() => {
    if (selectedText) {
      // Calculate token count using gpt-tokenizer
      const tokens = encode(selectedText);
      setTokenCount(tokens.length);
      
      // Calculate character count
      setCharCount(selectedText.length);
      
      // Calculate word count (split by whitespace and filter out empty strings)
      const words = selectedText.split(/\s+/).filter(word => word.length > 0);
      setWordCount(words.length);
    }
  }, [selectedText]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(selectedText);
      setCopied(true);
      toast({
        title: "Copied to clipboard",
        description: "The selected text has been copied to your clipboard.",
        variant: "default",
      });
      
      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      toast({
        title: "Failed to copy",
        description: "Could not copy text to clipboard. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Token Counter</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-3 gap-4 py-4">
          <div className="flex flex-col items-center justify-center p-4 bg-muted rounded-md">
            <span className="text-2xl font-bold">{tokenCount}</span>
            <span className="text-sm text-muted-foreground">Tokens</span>
          </div>
          
          <div className="flex flex-col items-center justify-center p-4 bg-muted rounded-md">
            <span className="text-2xl font-bold">{wordCount}</span>
            <span className="text-sm text-muted-foreground">Words</span>
          </div>
          
          <div className="flex flex-col items-center justify-center p-4 bg-muted rounded-md">
            <span className="text-2xl font-bold">{charCount}</span>
            <span className="text-sm text-muted-foreground">Characters</span>
          </div>
        </div>
        
        <div className="max-h-[200px] overflow-y-auto border rounded-md p-2">
          <pre className="whitespace-pre-wrap break-words text-sm">
            {selectedText}
          </pre>
        </div>
        
        <DialogFooter className="sm:justify-end">
          <Button 
            variant="outline" 
            onClick={copyToClipboard}
            className="flex items-center gap-2"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy to Clipboard
              </>
            )}
          </Button>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 