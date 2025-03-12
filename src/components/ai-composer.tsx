"use client";

import { Card } from "@/components/ui/card";
import { useDocumentStore } from "@/lib/store";
import AIChat from './ai-chat';

interface AIComposerProps {}

export default function AIComposer({}: AIComposerProps) {
  const { documents, selectedDocumentId, updateDocument } = useDocumentStore();

  // Get the selected document
  const selectedDocument = documents.find(doc => doc.id === selectedDocumentId);

  const handleInsertText = (text: string) => {
    if (selectedDocumentId && selectedDocument) {
      // Insert the text at the cursor position or append to the end
      const newContent = selectedDocument.content + '\n\n' + text;
      updateDocument(selectedDocumentId, { content: newContent });
    }
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

  return (
    <div className="h-full flex flex-col">
      <AIChat 
        documentContent={selectedDocument?.content}
        onInsertText={handleInsertText}
      />
    </div>
  );
} 