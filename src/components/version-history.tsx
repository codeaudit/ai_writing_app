"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useDocumentStore, DocumentVersion } from "@/lib/store";
import { History, Clock, ArrowLeft, ArrowRight, Save } from "lucide-react";
import { formatDistanceToNow, formatRelative } from "date-fns";
import { toast } from "@/components/ui/use-toast";

interface VersionHistoryProps {
  documentId: string;
  onShowDiff: (originalContent: string, modifiedContent: string, originalTitle: string, modifiedTitle: string) => void;
}

export function VersionHistory({ documentId, onShowDiff }: VersionHistoryProps) {
  const { documents, updateDocument } = useDocumentStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);

  const document = documents.find(doc => doc.id === documentId);

  // Update versions when document changes or dialog opens
  useEffect(() => {
    if (document) {
      console.log("Document versions:", document.versions);
      setVersions(document.versions || []);
    } else {
      setVersions([]);
    }
  }, [document, isDialogOpen]);

  const handleShowDiff = (version: DocumentVersion) => {
    if (!document) return;
    
    onShowDiff(
      version.content, 
      document.content,
      formatRelative(new Date(version.createdAt), new Date()), 
      "Current Version"
    );
    
    setIsDialogOpen(false);
  };

  const handleRestoreVersion = (version: DocumentVersion) => {
    if (!document) return;
    
    // Update the document with the version's content
    updateDocument(
      documentId, 
      { content: version.content }, 
      true, 
      `Restored version from ${formatDistanceToNow(new Date(version.createdAt))} ago`
    );
    
    // Show toast notification
    toast({
      title: "Version restored",
      description: `Version from ${formatTimeAgo(new Date(version.createdAt))} has been restored.`,
    });
    
    setIsDialogOpen(false);
  };

  const handleCompareVersions = (version1: DocumentVersion, version2: DocumentVersion) => {
    onShowDiff(
      version1.content,
      version2.content,
      formatRelative(new Date(version1.createdAt), new Date()),
      formatRelative(new Date(version2.createdAt), new Date())
    );
    
    // Show toast notification
    toast({
      title: "Comparing versions",
      description: "Showing differences between selected versions.",
    });
    
    setIsDialogOpen(false);
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return `${diffInSeconds} second${diffInSeconds !== 1 ? 's' : ''} ago`;
    }
    
    return formatDistanceToNow(date, { addSuffix: true });
  };

  const versionCount = document?.versions?.length || 0;

  if (!document) return null;

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1"
          title={`Version History${versionCount > 0 ? ` (${versionCount})` : ''}`}
        >
          <History className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[625px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Version History</DialogTitle>
          <DialogDescription>
            View and manage previous versions of "{document.name}"
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <div className="border rounded-md">
            {versions.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No previous versions found. Create a version to track changes.
              </div>
            ) : (
              <div className="divide-y">
                {versions.map((version, index) => (
                  <div key={version.id} className="p-3 flex items-center justify-between">
                    <div>
                      <div className="font-medium flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                        {formatTimeAgo(new Date(version.createdAt))}
                      </div>
                      {version.message && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {version.message}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleShowDiff(version)}
                      >
                        Compare
                      </Button>
                      {index < versions.length - 1 && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleCompareVersions(version, versions[index + 1])}
                          title="Compare with previous version"
                        >
                          Compare Prev
                        </Button>
                      )}
                      <Button 
                        variant="secondary" 
                        size="sm"
                        onClick={() => handleRestoreVersion(version)}
                      >
                        Restore
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 