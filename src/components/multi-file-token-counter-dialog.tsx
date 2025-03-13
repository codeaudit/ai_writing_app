"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check, X, GripVertical, ArrowUp, ArrowDown } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { encode } from "gpt-tokenizer";
import { Document } from "@/lib/store";
import { Checkbox } from "@/components/ui/checkbox";

interface MultiFileTokenCounterDialogProps {
  isOpen: boolean;
  onClose: () => void;
  documents: Document[];
}

export function MultiFileTokenCounterDialog({ 
  isOpen, 
  onClose, 
  documents: initialDocuments 
}: MultiFileTokenCounterDialogProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
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
        description: `Content from ${selectedDocs.length} document(s) has been copied to your clipboard.`,
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Multi-File Token Counter</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-3 gap-4 py-4">
          <div className="flex flex-col items-center justify-center p-4 bg-muted rounded-md">
            <span className="text-2xl font-bold">{totalTokenCount.toLocaleString()}</span>
            <span className="text-sm text-muted-foreground">Total Tokens</span>
          </div>
          
          <div className="flex flex-col items-center justify-center p-4 bg-muted rounded-md">
            <span className="text-2xl font-bold">{totalWordCount.toLocaleString()}</span>
            <span className="text-sm text-muted-foreground">Total Words</span>
          </div>
          
          <div className="flex flex-col items-center justify-center p-4 bg-muted rounded-md">
            <span className="text-2xl font-bold">{totalCharCount.toLocaleString()}</span>
            <span className="text-sm text-muted-foreground">Total Characters</span>
          </div>
        </div>
        
        <div className="overflow-y-auto flex-1 border rounded-md">
          <table className="w-full">
            <thead className="bg-muted sticky top-0">
              <tr>
                <th className="text-left p-2 w-10"></th>
                <th className="text-left p-2">Document</th>
                <th className="text-right p-2 w-24">Tokens</th>
                <th className="text-center p-2 w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc, index) => (
                <tr key={doc.id} className="border-t hover:bg-muted/50">
                  <td className="p-2">
                    <Checkbox 
                      checked={doc.selected} 
                      onCheckedChange={() => toggleDocumentSelection(doc.id)}
                    />
                  </td>
                  <td className="p-2 font-medium">{doc.name}</td>
                  <td className="p-2 text-right">{doc.tokenCount.toLocaleString()}</td>
                  <td className="p-2 flex justify-center space-x-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => moveDocumentUp(index)}
                      disabled={index === 0}
                      className="h-7 w-7"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => moveDocumentDown(index)}
                      disabled={index === documents.length - 1}
                      className="h-7 w-7"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <DialogFooter className="sm:justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            {documents.filter(d => d.selected).length} of {documents.length} documents selected
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={copyToClipboard}
              className="flex items-center gap-2"
              disabled={documents.filter(d => d.selected).length === 0}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy All Content
                </>
              )}
            </Button>
            <Button onClick={onClose}>Close</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 