"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { useDocumentStore } from "@/lib/store";
import AIChat from './ai-chat';
import { cn } from "@/lib/utils";

interface AIComposerProps {}

export default function AIComposer({}: AIComposerProps) {
  const { documents, selectedDocumentId, updateDocument } = useDocumentStore();
  const [isExpanded, setIsExpanded] = useState(false);

  // Get the selected document
  const selectedDocument = documents.find(doc => doc.id === selectedDocumentId);

  const handleInsertText = (text: string) => {
    if (selectedDocumentId && selectedDocument) {
      // Insert the text at the cursor position or append to the end
      const newContent = selectedDocument.content + '\n\n' + text;
      updateDocument(selectedDocumentId, { content: newContent });
    }
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  if (!selectedDocumentId || !selectedDocument) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card className="p-4 max-w-md text-center border-dashed bg-muted/30">
          <h2 className="text-base font-medium mb-2">AI Assistant</h2>
          <p className="text-muted-foreground text-sm">Select a document to start using the AI assistant.</p>
        </Card>
      </div>
    );
  }

  if (isExpanded) {
    return (
      <div className={cn(
        "fixed inset-0 bg-background z-50 flex flex-col",
        "transition-all duration-300 ease-in-out"
      )}>
        <div className="flex-1 overflow-auto">
          <AIChat 
            documentContent={selectedDocument?.content}
            onInsertText={handleInsertText}
            isExpanded={isExpanded}
            onToggleExpand={toggleExpand}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <AIChat 
        documentContent={selectedDocument?.content}
        onInsertText={handleInsertText}
        isExpanded={isExpanded}
        onToggleExpand={toggleExpand}
      />
    </div>
  );
} 