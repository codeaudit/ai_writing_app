'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverAnchor,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, RefreshCw, Check, X } from "lucide-react";
import { useLLMStore } from "@/lib/store";
import { generateText } from "@/lib/llm-service";
import { toast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { editor as monacoEditor } from "monaco-editor";

interface LLMDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedText: string;
  position: { x: number; y: number } | null;
  editor?: monacoEditor.IStandaloneCodeEditor | null;
  selection?: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number } | null;
}

export function LLMDialog({ isOpen, onClose, selectedText, position, editor, selection }: LLMDialogProps) {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [modelInfo, setModelInfo] = useState<{ model: string; provider: string } | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [editorLeftPosition, setEditorLeftPosition] = useState<number>(0);
  const { config } = useLLMStore();
  
  // Store the range of the inserted text for later reference
  const [insertedTextRange, setInsertedTextRange] = useState<{
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  } | null>(null);
  
  // Store the original text that was inserted
  const [insertedText, setInsertedText] = useState<string>("");

  // Store decorations IDs for removal later
  const [decorations, setDecorations] = useState<string[]>([]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      // Clear response when dialog closes
      setResponse("");
      setModelInfo(null);
    }
  }, [isOpen]);

  // Save LLM config to cookies on component mount
  useEffect(() => {
    useLLMStore.getState().saveToCookies();
  }, []);

  // Get the editor's left position when the component mounts or when the editor changes
  useEffect(() => {
    if (editor) {
      const editorContainer = editor.getContainerDomNode();
      const editorRect = editorContainer.getBoundingClientRect();
      setEditorLeftPosition(editorRect.left);
    }
  }, [editor]);

  const handleSubmit = async () => {
    if (!prompt.trim()) return;
    
    setIsLoading(true);
    setResponse("");
    
    try {
      // Create a prompt that includes the selected text
      const fullPrompt = `Selected Text: ${selectedText}\n\nUser Query: ${prompt}\n\nPlease provide a helpful response based on the selected text and user query.`;
      
      // Call the server action
      const result = await generateText({ 
        prompt: fullPrompt,
        stream: false // We don't support streaming in the dialog yet
      });
      
      // Update the response and model info
      setResponse(result.text);
      setModelInfo({
        model: result.model,
        provider: result.provider
      });

      // Close the initial dialog and clear the prompt
      onClose();
      setPrompt("");
      
      // Apply the changes to the editor with highlighting
      if (editor && selection) {
        applyChangesToEditor(result.text);
      }
      
      // Clear the response after it's been applied to the editor
      setResponse("");
      setModelInfo(null);
    } catch (error) {
      console.error('Error generating LLM response:', error);
      setResponse("Sorry, I encountered an error while processing your request. Please try again later.");
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate response",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const applyChangesToEditor = (responseText: string) => {
    if (!editor || !selection) return;
    
    const model = editor.getModel();
    if (!model) return;
    
    // Get the end position of the selection
    const endLineNumber = selection.endLineNumber;
    const endColumn = selection.endColumn;
    
    // Format the text to insert with newlines
    const insertText = `\n\n${responseText}`;
    
    // Store the inserted text for later reference
    setInsertedText(insertText);
    
    // Insert the response text after the selection
    const insertOperation = { range: { startLineNumber: endLineNumber, startColumn: endColumn, endLineNumber, endColumn }, text: insertText };
    
    // Apply the edit
    model.pushEditOperations([], [insertOperation], () => null);
    
    // Calculate the range of the inserted text
    const insertedStartLine = endLineNumber;
    const insertedStartColumn = endColumn;
    
    // Get the exact end position after insertion
    const lines = insertText.split('\n');
    let newEndLine = insertedStartLine + lines.length - 1;
    let newEndColumn = lines.length > 1 
      ? lines[lines.length - 1].length + 1 
      : insertedStartColumn + insertText.length;
    
    // Store the range of the inserted text
    setInsertedTextRange({
      startLineNumber: insertedStartLine,
      startColumn: insertedStartColumn,
      endLineNumber: newEndLine,
      endColumn: newEndColumn
    });
    
    // Add decorations
    const oldDecorations = model.deltaDecorations([], [
      // Highlight the original selection in light red
      {
        range: selection,
        options: {
          inlineClassName: 'original-text-highlight',
          hoverMessage: { value: 'Original text' }
        }
      },
      // Highlight the new text in green
      {
        range: {
          startLineNumber: insertedStartLine,
          startColumn: insertedStartColumn,
          endLineNumber: newEndLine,
          endColumn: newEndColumn
        },
        options: {
          inlineClassName: 'new-text-highlight',
          hoverMessage: { value: 'Generated text' }
        }
      }
    ]);
    
    setDecorations(oldDecorations);
    
    // Update the editor's left position
    const editorContainer = editor.getContainerDomNode();
    const editorRect = editorContainer.getBoundingClientRect();
    setEditorLeftPosition(editorRect.left);
    
    // Show confirmation dialog
    setShowConfirmation(true);
    
    // Scroll to make the inserted text visible
    editor.revealLineInCenter(newEndLine);
  };

  const handleAcceptChanges = () => {
    if (!editor || !selection || !insertedTextRange) return;
    
    const model = editor.getModel();
    if (!model) return;
    
    // Remove decorations
    if (decorations.length > 0) {
      model.deltaDecorations(decorations, []);
      setDecorations([]);
    }
    
    // Remove the original selected text
    model.pushEditOperations([], [
      { range: selection, text: '' }
    ], () => null);
    
    setShowConfirmation(false);
    
    toast({
      title: "Changes applied",
      description: "The generated text has been applied to your document.",
    });
  };

  const handleRejectChanges = () => {
    if (!editor || !selection || !insertedTextRange) return;
    
    const model = editor.getModel();
    if (!model) return;
    
    // Remove only the inserted text using the exact range we stored
    model.pushEditOperations([], [
      { 
        range: insertedTextRange, 
        text: '' 
      }
    ], () => null);
    
    // Remove decorations
    if (decorations.length > 0) {
      model.deltaDecorations(decorations, []);
      setDecorations([]);
    }
    
    setShowConfirmation(false);
    
    toast({
      title: "Changes rejected",
      description: "The original text has been preserved.",
    });
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
    <>
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
          sideOffset={20}
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
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            {isLoading && !response && (
              <div className="bg-muted p-2 rounded-md text-sm flex items-center">
                <RefreshCw className="h-3 w-3 animate-spin mr-2" />
                Thinking...
              </div>
            )}
            
            {response && (
              <div className="bg-muted p-2 rounded-md text-sm max-h-60 overflow-y-auto">
                <div className="whitespace-pre-wrap">{response}</div>
                
                {modelInfo && (
                  <div className="mt-2 pt-2 border-t border-border text-xs text-muted-foreground">
                    <span>
                      {modelInfo.provider === 'gemini' ? 'Gemini' : 'OpenAI'} • {modelInfo.model}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {showConfirmation && (
        <div 
          className="fixed bottom-4 z-50 bg-background border rounded-md shadow-md p-4 max-w-sm"
          style={{ left: editorLeftPosition + 'px' }}
        >
          <div className="mb-3">
            <h4 className="text-sm font-medium">Apply Changes?</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Do you want to apply the generated text and remove the original selection?
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRejectChanges}
              className="h-8"
            >
              <X className="mr-1 h-3 w-3" />
              Reject
            </Button>
            <Button 
              size="sm" 
              onClick={handleAcceptChanges}
              className="h-8"
            >
              <Check className="mr-1 h-3 w-3" />
              Accept
            </Button>
          </div>
        </div>
      )}
    </>
  );
} 