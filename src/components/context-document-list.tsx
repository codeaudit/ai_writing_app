import React from 'react';
import { ContextDocument } from '@/types/contextDocument';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface ContextDocumentListProps {
  documents: ContextDocument[];
  onRemove: (doc: ContextDocument) => void;
}

export function ContextDocumentList({ documents, onRemove }: ContextDocumentListProps) {
  if (documents.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="flex items-center gap-2 rounded-md bg-secondary px-3 py-1 text-sm"
        >
          <span>{doc.name}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4"
            onClick={() => onRemove(doc)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  );
} 