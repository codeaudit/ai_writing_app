import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Folder } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DirectoryView } from './directory-view';

interface EditorPanelProps {
  className?: string;
}

export function EditorPanel({ className }: EditorPanelProps) {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');
  const [isDirectoryView, setIsDirectoryView] = useState(false);

  const handleFileSelect = (path: string) => {
    setSelectedPath(path);
    setIsDirectoryView(false);
    // TODO: Implement actual file loading
    setContent('File content will be loaded here...');
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {isDirectoryView ? (
        <DirectoryView
          path={selectedPath || ''}
          onFileSelect={handleFileSelect}
          className="flex-1"
        />
      ) : (
        <>
          <div className="flex items-center gap-2 p-2 border-b">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDirectoryView(true)}
            >
              <Folder className="h-4 w-4 mr-2" />
              Browse Files
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4">
              {content}
            </div>
          </ScrollArea>
        </>
      )}
    </div>
  );
} 