"use client";

import { useState, useEffect } from "react";
import { useDocumentStore } from "@/lib/store";
import AIChat from './ai-chat';
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";

interface AIComposerProps {
  onMount?: () => void;
}

export default function AIComposer({ onMount }: AIComposerProps) {
  const { documents, selectedDocumentId, updateDocument } = useDocumentStore();
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (onMount) {
      onMount();
    }
  }, [onMount]);

  // Get the selected document
  const selectedDocument = documents.find(doc => doc.id === selectedDocumentId);

  const handleInsertText = (text: string) => {
    if (selectedDocumentId && selectedDocument) {
      // Get a reference to the Monaco editor instance
      // Find the editor instance in the DOM - this is a common way to access Monaco editor instances
      const editor = (window as any).monaco?.editor?.getEditors?.()?.[0];
      
      if (editor) {
        // Get the current model
        const model = editor.getModel();
        if (!model) {
          // Fallback to appending at the end if model is not available
          const newContent = selectedDocument.content + '\n\n' + text;
          updateDocument(selectedDocumentId, { content: newContent });
          toast({
            title: "Text inserted",
            description: `Text has been added to the end of "${selectedDocument.name}".`,
            duration: 3000,
          });
          return;
        }

        // Get the current selection in the editor
        const selection = editor.getSelection();
        
        if (selection && !selection.isEmpty()) {
          // There is text selected, so replace it with the new text
          const edit = {
            range: selection,
            text: text,
            forceMoveMarkers: true
          };
          
          // Apply the edit
          model.pushEditOperations([], [edit], null);
          
          toast({
            title: "Text replaced",
            description: `Selected text has been replaced with AI response in "${selectedDocument.name}".`,
            duration: 3000,
          });
        } else {
          // No selection, insert at cursor position
          const position = editor.getPosition();
          
          if (position) {
            const edit = {
              range: {
                startLineNumber: position.lineNumber,
                startColumn: position.column,
                endLineNumber: position.lineNumber,
                endColumn: position.column
              },
              text: text,
              forceMoveMarkers: true
            };
            
            // Apply the edit
            model.pushEditOperations([], [edit], null);
            
            toast({
              title: "Text inserted",
              description: `Text has been inserted at cursor position in "${selectedDocument.name}".`,
              duration: 3000,
            });
          } else {
            // Fallback to appending at the end if position is not available
            const newContent = selectedDocument.content + '\n\n' + text;
            updateDocument(selectedDocumentId, { content: newContent });
            toast({
              title: "Text inserted",
              description: `Text has been added to the end of "${selectedDocument.name}".`,
              duration: 3000,
            });
          }
        }
        
        // Update the editor state to reflect the changes
        updateDocument(selectedDocumentId, { content: model.getValue() });
      } else {
        // Fallback to appending at the end if editor is not available
        const newContent = selectedDocument.content + '\n\n' + text;
        updateDocument(selectedDocumentId, { content: newContent });
        toast({
          title: "Text inserted",
          description: `Text has been added to the end of "${selectedDocument.name}".`,
          duration: 3000,
        });
      }
    } else {
      toast({
        title: "No document selected",
        description: "Select a document first to insert text.",
        duration: 3000,
        variant: "destructive"
      });
    }
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  // Instead of conditionally rendering completely different elements,
  // use a single container with conditional styling to prevent unmounting
  return (
    <div className={cn(
      "flex flex-col", 
      isExpanded ? "fixed inset-0 bg-background z-50" : "h-full"
    )}>
      <div className={cn(
        "flex-1 overflow-auto",
        isExpanded ? "" : "h-full"
      )}>
        <AIChat 
          onInsertText={handleInsertText}
          isExpanded={isExpanded}
          onToggleExpand={toggleExpand}
        />
      </div>
    </div>
  );
} 