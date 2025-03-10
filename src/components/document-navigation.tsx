"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PlusCircle, Settings, File, Folder, Trash2, GitCompare, History } from "lucide-react";
import { useDocumentStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { VersionHistory } from "./version-history";
import { toast } from "@/components/ui/use-toast";

interface DocumentNavigationProps {
  onCompareDocuments?: (doc1Id: string, doc2Id: string) => void;
}

export default function DocumentNavigation({ onCompareDocuments }: DocumentNavigationProps) {
  const router = useRouter();
  const { 
    documents, 
    selectedDocumentId, 
    comparisonDocumentIds,
    addDocument, 
    selectDocument,
    deleteDocument,
    toggleComparisonDocument,
    clearComparisonDocuments
  } = useDocumentStore();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [comparisonMode, setComparisonMode] = useState(false);

  const filteredDocuments = documents.filter(doc => 
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const createNewDocument = () => {
    addDocument(
      `New Document ${documents.length + 1}`, 
      `# New Document ${documents.length + 1}\n\nStart writing here...`
    );
  };

  const handleCompare = () => {
    if (comparisonDocumentIds.length === 2 && onCompareDocuments) {
      onCompareDocuments(comparisonDocumentIds[0], comparisonDocumentIds[1]);
      setComparisonMode(false);
    }
  };

  const toggleComparisonMode = () => {
    if (comparisonMode) {
      clearComparisonDocuments();
    }
    setComparisonMode(!comparisonMode);
  };

  const handleDeleteSelectedDocument = () => {
    if (selectedDocumentId) {
      const doc = documents.find(d => d.id === selectedDocumentId);
      if (doc && confirm(`Are you sure you want to delete "${doc.name}"?`)) {
        deleteDocument(selectedDocumentId);
        toast({
          title: "Document deleted",
          description: `"${doc.name}" has been deleted.`,
        });
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Documents</h2>
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={createNewDocument}
            title="Create new document"
          >
            <PlusCircle className="h-5 w-5" />
          </Button>
          <Button 
            variant={comparisonMode ? "secondary" : "ghost"}
            size="icon"
            onClick={toggleComparisonMode}
            title={comparisonMode ? "Exit comparison mode" : "Enter comparison mode"}
          >
            <GitCompare className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => router.push("/settings")}
            title="Open settings"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      <Input
        placeholder="Search documents..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="mb-4"
      />
      
      {comparisonMode && comparisonDocumentIds.length > 0 && (
        <div className="mb-4">
          <div className="text-sm font-medium mb-2">
            Selected for comparison: {comparisonDocumentIds.length}/2
          </div>
          {comparisonDocumentIds.length === 2 && (
            <Button 
              variant="default" 
              className="w-full"
              onClick={handleCompare}
            >
              <GitCompare className="h-4 w-4 mr-2" />
              Compare Documents
            </Button>
          )}
        </div>
      )}
      
      <div className="space-y-1 overflow-auto flex-1">
        {filteredDocuments.map((doc) => (
          <div key={doc.id} className="flex flex-col">
            <div className="flex items-center group">
              {comparisonMode && (
                <Checkbox
                  checked={comparisonDocumentIds.includes(doc.id)}
                  onCheckedChange={() => {
                    if (comparisonDocumentIds.includes(doc.id) || comparisonDocumentIds.length < 2) {
                      toggleComparisonDocument(doc.id);
                    }
                  }}
                  disabled={!comparisonDocumentIds.includes(doc.id) && comparisonDocumentIds.length >= 2}
                  className="mr-2"
                />
              )}
              <Button
                variant={selectedDocumentId === doc.id ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start",
                  comparisonMode && comparisonDocumentIds.includes(doc.id) && "border-primary"
                )}
                onClick={() => {
                  if (comparisonMode) {
                    if (comparisonDocumentIds.includes(doc.id) || comparisonDocumentIds.length < 2) {
                      toggleComparisonDocument(doc.id);
                    }
                  } else {
                    selectDocument(doc.id);
                  }
                }}
              >
                <File className="h-4 w-4 mr-2" />
                {doc.name}
              </Button>
              {!comparisonMode && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => deleteDocument(doc.id)}
                  title="Delete document"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
            
            {selectedDocumentId === doc.id && (
              <div className="flex gap-2 pl-6 pr-2 py-1">
                <VersionHistory 
                  documentId={selectedDocumentId} 
                  onShowDiff={(original, modified, originalTitle, modifiedTitle) => {
                    if (onCompareDocuments) {
                      onCompareDocuments(selectedDocumentId, selectedDocumentId);
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-shrink-0"
                  onClick={handleDeleteSelectedDocument}
                  title="Delete selected document"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
      
      <Button 
        variant="outline" 
        className="mt-4 w-full"
        onClick={() => router.push("/settings")}
      >
        <Settings className="h-4 w-4 mr-2" />
        Settings
      </Button>
    </div>
  );
} 