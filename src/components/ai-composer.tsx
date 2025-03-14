"use client";

import { useState } from "react";
import { useDocumentStore } from "@/lib/store";
import AIChat from './ai-chat';
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";

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
      toast({
        title: "Text inserted",
        description: `Text has been added to "${selectedDocument.name}".`,
        duration: 3000,
      });
    } else {
      toast({
        title: "No document selected",
        description: "Select a document first to insert text.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  if (isExpanded) {
    return (
      <div className={cn(
        "fixed inset-0 bg-background z-50 flex flex-col",
        "transition-all duration-300 ease-in-out"
      )}>
        <div className="flex-1 overflow-auto">
          <AIChat 
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
        onInsertText={handleInsertText}
        isExpanded={isExpanded}
        onToggleExpand={toggleExpand}
      />
    </div>
  );
} 