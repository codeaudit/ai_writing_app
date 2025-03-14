"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check, ArrowUp, ArrowDown, BrainCircuit } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { encode } from "gpt-tokenizer";
import { Document } from "@/lib/store";
import { Checkbox } from "@/components/ui/checkbox";

interface CompositionComposerProps {
  isOpen: boolean;
  onClose: () => void;
  documents: Document[];
}

export function CompositionComposer({ 
  isOpen, 
  onClose, 
  documents: initialDocuments 
}: CompositionComposerProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [addingContext, setAddingContext] = useState(false);
  const [documents, setDocuments] = useState<(Document & { selected: boolean; tokenCount: number })[]>([]);
  const [totalTokenCount, setTotalTokenCount] = useState(0);
  const [totalWordCount, setTotalWordCount] = useState(0);
  const [totalCharCount, setTotalCharCount] = useState(0);

  // Initialize documents with selection and token count
  useEffect(() => {
    if (initialDocuments.length > 0) {
      const docsWithMetadata = initialDocuments.map(doc => {
        const tokens = encode(doc.content);
        return {
          ...doc,
          selected: true,
          tokenCount: tokens.length
        };
      });
      
      setDocuments(docsWithMetadata);
    }
  }, [initialDocuments]);

  // Calculate totals whenever documents or selections change
  useEffect(() => {
    let tokens = 0;
    let words = 0;
    let chars = 0;
    
    documents.forEach(doc => {
      if (doc.selected) {
        tokens += doc.tokenCount;
        chars += doc.content.length;
        words += doc.content.split(/\s+/).filter(word => word.length > 0).length;
      }
    });
    
    setTotalTokenCount(tokens);
    setTotalWordCount(words);
    setTotalCharCount(chars);
  }, [documents]);

  const toggleDocumentSelection = (id: string) => {
    setDocuments(docs => 
      docs.map(doc => 
        doc.id === id ? { ...doc, selected: !doc.selected } : doc
      )
    );
  };

  const moveDocumentUp = (index: number) => {
    if (index === 0) return;
    
    setDocuments(docs => {
      const newDocs = [...docs];
      const temp = newDocs[index];
      newDocs[index] = newDocs[index - 1];
      newDocs[index - 1] = temp;
      return newDocs;
    });
  };

  const moveDocumentDown = (index: number) => {
    if (index === documents.length - 1) return;
    
    setDocuments(docs => {
      const newDocs = [...docs];
      const temp = newDocs[index];
      newDocs[index] = newDocs[index + 1];
      newDocs[index + 1] = temp;
      return newDocs;
    });
  };

  const copyToClipboard = async () => {
    try {
      const selectedDocs = documents.filter(doc => doc.selected);
      const combinedContent = selectedDocs.map(doc => 
        `# ${doc.name}\n\n${doc.content}`
      ).join('\n\n---\n\n');
      
      await navigator.clipboard.writeText(combinedContent);
      setCopied(true);
      toast({
        title: "Copied to clipboard",
        description: `Content from ${selectedDocs.length} document(s) copied`,
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
        description: "Could not copy text to clipboard",
        variant: "destructive",
      });
    }
  };

  const addAsContext = async () => {
    try {
      setAddingContext(true);
      const selectedDocs = documents.filter(doc => doc.selected);
      
      // Store only references to the documents, not their content
      const contextRefs = selectedDocs.map(doc => ({
        id: doc.id,
        name: doc.name
      }));
      
      // Get existing context if any
      let existingContext: Array<{id: string; name: string}> = [];
      try {
        const existingData = localStorage.getItem('aiComposerContext');
        if (existingData) {
          existingContext = JSON.parse(existingData);
        }
      } catch (e) {
        console.error("Error parsing existing context:", e);
      }
      
      // Merge with existing context, avoiding duplicates
      const mergedContext = [...existingContext];
      
      for (const newRef of contextRefs) {
        // Only add if not already in the context
        if (!mergedContext.some(ref => ref.id === newRef.id)) {
          mergedContext.push(newRef);
        }
      }
      
      // Store the merged context references in localStorage
      localStorage.setItem('aiComposerContext', JSON.stringify(mergedContext));
      
      // Create a custom event to notify the AI composer about the context update
      // Only create and dispatch the event if we're in a browser environment
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('aiContextUpdated', { 
          detail: { context: mergedContext }
        });
        window.dispatchEvent(event);
      }
      
      toast({
        title: "Added to AI context",
        description: `${selectedDocs.length} document(s) added as context for AI composer`,
        variant: "default",
      });
      
      // Reset the state after 2 seconds
      setTimeout(() => {
        setAddingContext(false);
      }, 2000);
      
      // Close the dialog
      onClose();
    } catch (error) {
      console.error("Failed to add as context:", error);
      toast({
        title: "Failed to add context",
        description: "Could not add documents as context",
        variant: "destructive",
      });
      setAddingContext(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-3 gap-2 overflow-hidden">
        <DialogHeader className="pb-1 pt-1">
          <div className="flex justify-between items-center">
            <DialogTitle className="text-base">Composition Composer</DialogTitle>
            <div className="flex gap-1 text-xs">
              <div className="px-2 py-1 bg-muted rounded-sm">
                <span className="font-semibold">{totalTokenCount.toLocaleString()}</span> tokens
              </div>
              <div className="px-2 py-1 bg-muted rounded-sm">
                <span className="font-semibold">{totalWordCount.toLocaleString()}</span> words
              </div>
              <div className="px-2 py-1 bg-muted rounded-sm">
                <span className="font-semibold">{totalCharCount.toLocaleString()}</span> chars
              </div>
            </div>
          </div>
        </DialogHeader>
        
        <div className="overflow-y-auto flex-1 border rounded-md min-h-0">
          <table className="w-full text-sm">
            <thead className="bg-muted sticky top-0 text-xs">
              <tr>
                <th className="text-left p-1 w-8"></th>
                <th className="text-left p-1">Document</th>
                <th className="text-right p-1 w-16">Tokens</th>
                <th className="text-center p-1 w-16">Order</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc, index) => (
                <tr key={doc.id} className="border-t hover:bg-muted/50">
                  <td className="p-1">
                    <Checkbox 
                      checked={doc.selected} 
                      onCheckedChange={() => toggleDocumentSelection(doc.id)}
                      className="h-3.5 w-3.5"
                    />
                  </td>
                  <td className="p-1 font-medium truncate max-w-[300px]" title={doc.name}>{doc.name}</td>
                  <td className="p-1 text-right">{doc.tokenCount.toLocaleString()}</td>
                  <td className="p-1 flex justify-center space-x-0.5">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => moveDocumentUp(index)}
                      disabled={index === 0}
                      className="h-6 w-6"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => moveDocumentDown(index)}
                      disabled={index === documents.length - 1}
                      className="h-6 w-6"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <DialogFooter className="pt-1 px-0 flex-row justify-between items-center mt-1">
          <div className="text-xs text-muted-foreground">
            {documents.filter(d => d.selected).length} of {documents.length} selected
          </div>
          <div className="flex gap-1">
            <Button 
              variant="outline" 
              onClick={addAsContext}
              className="h-8 text-xs flex items-center gap-1"
              disabled={documents.filter(d => d.selected).length === 0 || addingContext}
              size="sm"
            >
              <BrainCircuit className="h-3 w-3" />
              {addingContext ? "Adding..." : "Add as AI Context"}
            </Button>
            <Button 
              variant="outline" 
              onClick={copyToClipboard}
              className="h-8 text-xs flex items-center gap-1"
              disabled={documents.filter(d => d.selected).length === 0}
              size="sm"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied" : "Copy Content"}
            </Button>
            <Button onClick={onClose} size="sm" className="h-8 text-xs">Close</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 