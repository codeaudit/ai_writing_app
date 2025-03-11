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
  onShowDiff?: (originalContent: string, modifiedContent: string, originalTitle: string, modifiedTitle: string) => void;
  getVersions?: () => DocumentVersion[];
  onRestore?: (versionId: string) => void;
  onClose?: () => void;
}

export function VersionHistory({ documentId, onShowDiff, getVersions, onRestore, onClose }: VersionHistoryProps) {
  const { documents, updateDocument } = useDocumentStore();
  const [versions, setVersions] = useState<DocumentVersion[]>([]);

  const document = documents.find(doc => doc.id === documentId);

  // Update versions when document changes
  useEffect(() => {
    if (getVersions) {
      setVersions(getVersions() || []);
    } else if (document) {
      setVersions(document.versions || []);
    } else {
      setVersions([]);
    }
  }, [document, getVersions]);

  const handleShowDiff = (version: DocumentVersion) => {
    if (!document || !onShowDiff) return;
    
    onShowDiff(
      version.content, 
      document.content,
      formatRelative(new Date(version.createdAt), new Date()), 
      "Current Version"
    );
  };

  const handleRestoreVersion = (version: DocumentVersion) => {
    if (onRestore) {
      onRestore(version.id);
      return;
    }
    
    if (!document) return;
    
    // Update the document with the version's content
    updateDocument(
      documentId, 
      { content: version.content }, 
      true, 
      `Restored from version created on ${new Date(version.createdAt).toLocaleString()}`
    );
    
    toast({
      title: "Version restored",
      description: `Restored version from ${new Date(version.createdAt).toLocaleString()}`,
    });
    
    if (onClose) {
      onClose();
    }
  };

  const handleCompareVersions = (version1: DocumentVersion, version2: DocumentVersion) => {
    if (!onShowDiff) return;
    
    onShowDiff(
      version1.content, 
      version2.content,
      formatRelative(new Date(version1.createdAt), new Date()), 
      formatRelative(new Date(version2.createdAt), new Date())
    );
  };

  const formatTimeAgo = (date: Date) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch (error) {
      return "Unknown date";
    }
  };

  return (
    <div className="space-y-4">
      {versions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No version history available
        </div>
      ) : (
        <div className="space-y-2">
          {versions.map((version, index) => (
            <div 
              key={version.id} 
              className="flex items-start justify-between p-3 border rounded-md hover:bg-accent/50"
            >
              <div className="space-y-1">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="font-medium">
                    {formatTimeAgo(new Date(version.createdAt))}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground ml-6">
                  {version.message || `Version ${versions.length - index}`}
                </div>
              </div>
              <div className="flex space-x-2">
                {onShowDiff && (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleShowDiff(version)}
                    >
                      View Changes
                    </Button>
                    {index < versions.length - 1 && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleCompareVersions(version, versions[index + 1])}
                      >
                        Compare
                      </Button>
                    )}
                  </>
                )}
                <Button 
                  variant="default" 
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
  );
} 