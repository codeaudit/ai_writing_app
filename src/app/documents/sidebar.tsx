'use client';

import { useState } from 'react';
import { useDocumentStore } from '@/lib/store';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DocumentNavigation } from '@/components/document-navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import SessionManager from '@/components/session-manager';

// Search component
function SearchView({ onDocumentSelect }: { onDocumentSelect: (documentId: string) => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const { documents } = useDocumentStore();
  
  // Filter documents based on search query
  const filteredDocuments = documents.filter(doc => 
    doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.content.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  return (
    <div className="flex flex-col h-full">
      <div className="relative mb-4">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search documents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8"
        />
      </div>
      
      <ScrollArea className="flex-1">
        {filteredDocuments.length > 0 ? (
          <div className="space-y-2">
            {filteredDocuments.map(doc => (
              <Button
                key={doc.id}
                variant="ghost"
                className="w-full justify-start text-left h-auto py-2"
                onClick={() => onDocumentSelect(doc.id)}
              >
                <div className="flex flex-col">
                  <span className="font-medium">{doc.name}</span>
                  {searchQuery && doc.content.toLowerCase().includes(searchQuery.toLowerCase()) && (
                    <span className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {highlightSearchResults(doc.content, searchQuery)}
                    </span>
                  )}
                </div>
              </Button>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-32 text-center">
            <p className="text-muted-foreground">No matching documents found</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// Helper function to highlight search results
function highlightSearchResults(content: string, query: string): string {
  if (!query) return content.substring(0, 100) + '...';
  
  const lowerContent = content.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerContent.indexOf(lowerQuery);
  
  if (index === -1) return content.substring(0, 100) + '...';
  
  // Get some context around the match
  const start = Math.max(0, index - 40);
  const end = Math.min(content.length, index + query.length + 40);
  const snippet = content.substring(start, end);
  
  return (start > 0 ? '...' : '') + snippet + (end < content.length ? '...' : '');
}

// Sidebar component
interface SidebarProps {
  className?: string;
}

function Sidebar({ className }: SidebarProps) {
  const { selectDocument } = useDocumentStore();
  
  const handleDocumentSelect = (documentId: string) => {
    selectDocument(documentId);
  };
  
  const handleFileSelect = (path: string, isDirectory: boolean) => {
    // For now, just handle document selection. Path-based navigation 
    // might need additional logic depending on your app's requirements
    if (!isDirectory) {
      // Extract document ID from path or fetch document by path
      // This is a simplified example
      const pathParts = path.split('/');
      const documentName = pathParts[pathParts.length - 1];
      const document = useDocumentStore.getState().documents.find(doc => doc.name === documentName);
      if (document) {
        selectDocument(document.id);
      }
    }
  };
  
  return (
    <aside className={cn("border-r h-full overflow-hidden flex flex-col", className)}>
      <Tabs defaultValue="folders" className="h-full flex flex-col">
        <div className="border-b px-4 py-2">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="folders">Folders</TabsTrigger>
            <TabsTrigger value="search">Search</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="folders" className="flex-1 overflow-hidden">
          <DocumentNavigation 
            onFileSelect={handleFileSelect}
            onCompareDocuments={(doc1Id, doc2Id) => {
              console.log('Compare documents:', doc1Id, doc2Id);
              // Implement document comparison logic if needed
            }} 
          />
        </TabsContent>
        
        <TabsContent value="search" className="flex-1 overflow-hidden p-4">
          <SearchView onDocumentSelect={handleDocumentSelect} />
        </TabsContent>
        
        <TabsContent value="sessions" className="flex-1 overflow-hidden">
          <SessionManager />
        </TabsContent>
      </Tabs>
    </aside>
  );
}

export default Sidebar; 