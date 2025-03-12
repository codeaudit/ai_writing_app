"use client";

import { useState, useRef, useCallback, useContext, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PlusCircle, Settings, File, Folder, Trash2, GitCompare, History, Plus, FolderPlus, ChevronRight, ChevronDown, MoreVertical, Move, Clock } from "lucide-react";
import { useDocumentStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { VersionHistory } from "./version-history";
import { toast } from "@/components/ui/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ComparisonModeContext } from "@/contexts/ComparisonModeContext";

interface DocumentNavigationProps {
  onCompareDocuments?: (doc1Id: string, doc2Id: string) => void;
}

interface FolderItemProps {
  folder: { id: string; name: string; parentId: string | null };
  level: number;
  onCompareDocuments?: (doc1Id: string, doc2Id: string) => void;
}

function FolderItem({ folder, level, onCompareDocuments }: FolderItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(folder.name);
  const [isCreatingDocument, setIsCreatingDocument] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  
  const {
    documents,
    folders,
    selectedFolderId,
    selectedDocumentId,
    comparisonDocumentIds,
    updateFolder,
    deleteFolder,
    selectFolder,
    addDocument,
    addFolder,
    moveDocument,
  } = useDocumentStore();

  const childFolders = folders.filter(f => f.parentId === folder.id);
  const folderDocuments = documents.filter(d => d.folderId === folder.id);
  
  const handleRename = () => {
    if (newName.trim() && newName !== folder.name) {
      updateFolder(folder.id, newName.trim());
    }
    setIsRenaming(false);
  };

  const handleCreateDocument = () => {
    if (newItemName.trim()) {
      addDocument(newItemName.trim(), "", folder.id);
      setNewItemName("");
      setIsCreatingDocument(false);
    }
  };

  const handleCreateFolder = () => {
    if (newItemName.trim()) {
      addFolder(newItemName.trim(), folder.id);
      setNewItemName("");
      setIsCreatingFolder(false);
    }
  };

  // Get all folders except the current folder and its descendants
  const getAvailableFolders = () => {
    const descendantIds = new Set<string>();
    
    const collectDescendants = (folderId: string) => {
      descendantIds.add(folderId);
      folders
        .filter(f => f.parentId === folderId)
        .forEach(child => collectDescendants(child.id));
    };
    
    collectDescendants(folder.id);
    
    return folders.filter(f => !descendantIds.has(f.id));
  };

  return (
    <div>
      <div 
        className={cn(
          "flex items-center gap-1 py-1 px-2 rounded-md hover:bg-muted group",
          selectedFolderId === folder.id && "bg-muted",
        )}
        style={{ paddingLeft: `${level * 12}px` }}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-4 w-4"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
        
        <Folder className="h-4 w-4 text-muted-foreground" />
        
        {isRenaming ? (
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') setIsRenaming(false);
            }}
            className="h-6 py-1 px-1"
            autoFocus
          />
        ) : (
          <button
            className="flex-1 text-left text-sm truncate"
            onClick={() => selectFolder(folder.id)}
          >
            {folder.name}
          </button>
        )}
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsCreatingDocument(true)}>
              New Document
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsCreatingFolder(true)}>
              New Folder
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setIsRenaming(true)}>
              Rename
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Move className="h-4 w-4 mr-2" />
                Move to
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => updateFolder(folder.id, folder.name, null)}>
                  Root
                </DropdownMenuItem>
                {getAvailableFolders().map(f => (
                  <DropdownMenuItem 
                    key={f.id}
                    onClick={() => updateFolder(folder.id, folder.name, f.id)}
                  >
                    {f.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => deleteFolder(folder.id)}
              className="text-destructive"
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isCreatingDocument && (
        <div className="flex gap-2 mt-1 mb-1 ml-8">
          <Input
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="Document name..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateDocument();
              if (e.key === 'Escape') {
                setNewItemName("");
                setIsCreatingDocument(false);
              }
            }}
            className="h-7"
            autoFocus
          />
          <Button
            size="sm"
            onClick={handleCreateDocument}
            className="h-7"
          >
            Add
          </Button>
        </div>
      )}

      {isCreatingFolder && (
        <div className="flex gap-2 mt-1 mb-1 ml-8">
          <Input
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="Folder name..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateFolder();
              if (e.key === 'Escape') {
                setNewItemName("");
                setIsCreatingFolder(false);
              }
            }}
            className="h-7"
            autoFocus
          />
          <Button
            size="sm"
            onClick={handleCreateFolder}
            className="h-7"
          >
            Add
          </Button>
        </div>
      )}

      {isExpanded && (
        <>
          {childFolders.map((childFolder) => (
            <FolderItem
              key={childFolder.id}
              folder={childFolder}
              level={level + 1}
              onCompareDocuments={onCompareDocuments}
            />
          ))}
          
          {folderDocuments.map((doc) => (
            <DocumentItem
              key={doc.id}
              document={doc}
              level={level + 1}
              onCompareDocuments={onCompareDocuments}
            />
          ))}
        </>
      )}
    </div>
  );
}

interface DocumentItemProps {
  document: { id: string; name: string };
  level: number;
  onCompareDocuments?: (doc1Id: string, doc2Id: string) => void;
}

function DocumentItem({ document, level, onCompareDocuments }: DocumentItemProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(document.name);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  
  const {
    selectedDocumentId,
    comparisonDocumentIds,
    updateDocument,
    deleteDocument,
    selectDocument,
    toggleComparisonDocument,
    moveDocument,
    folders,
  } = useDocumentStore();

  const handleRename = () => {
    if (newName.trim() && newName !== document.name) {
      updateDocument(document.id, { name: newName.trim() });
    }
    setIsRenaming(false);
  };

  const handleToggleComparison = () => {
    // If already selected, always allow deselecting
    if (comparisonDocumentIds.includes(document.id)) {
      toggleComparisonDocument(document.id);
      return;
    }
    
    // If trying to select a third document, do nothing
    if (comparisonDocumentIds.length >= 2) {
      return;
    }
    
    // Otherwise, toggle the document selection
    toggleComparisonDocument(document.id);
  };

  const handleShowDiff = useCallback((originalContent: string, modifiedContent: string, originalTitle: string, modifiedTitle: string) => {
    if (onCompareDocuments) {
      // This is a placeholder since we can't directly show diff from here
      // We'll select the document instead and let the user know to use the version history in the editor
      selectDocument(document.id);
      toast({
        title: "Document selected",
        description: "Use the version history button in the editor to compare versions.",
      });
    }
  }, [document.id, onCompareDocuments, selectDocument]);

  // Determine if this document can be selected for comparison
  const canSelect = comparisonDocumentIds.includes(document.id) || comparisonDocumentIds.length < 2;

  return (
    <>
      <div
        className={cn(
          "flex items-center gap-1 py-1 px-2 rounded-md hover:bg-muted group",
          selectedDocumentId === document.id && "bg-muted",
          comparisonDocumentIds.includes(document.id) && "border-l-2 border-primary",
          !canSelect && comparisonDocumentIds.length > 0 && "opacity-50 cursor-not-allowed"
        )}
        style={{ paddingLeft: `${level * 12 + 20}px` }}
      >
        <File className="h-4 w-4 text-muted-foreground" />
        
        {isRenaming ? (
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') setIsRenaming(false);
            }}
            className="h-6 py-1 px-1"
            autoFocus
          />
        ) : (
          <button
            className={cn(
              "flex-1 text-left text-sm truncate",
              !canSelect && comparisonDocumentIds.length > 0 && "cursor-not-allowed"
            )}
            onClick={() => {
              if (comparisonDocumentIds.length > 0) {
                handleToggleComparison();
              } else {
                selectDocument(document.id);
              }
            }}
            disabled={!canSelect && comparisonDocumentIds.length > 0}
          >
            {document.name}
          </button>
        )}
        
        <Checkbox
          checked={comparisonDocumentIds.includes(document.id)}
          onCheckedChange={handleToggleComparison}
          className={cn(
            "document-checkbox transition-opacity",
            comparisonDocumentIds.length > 0 ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
          disabled={!canSelect && !comparisonDocumentIds.includes(document.id)}
        />
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsRenaming(true)}>
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowVersionHistory(true)}>
              <Clock className="h-4 w-4 mr-2" />
              Version History
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Move className="h-4 w-4 mr-2" />
                Move to
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => moveDocument(document.id, null)}>
                  Root
                </DropdownMenuItem>
                {folders.map(folder => (
                  <DropdownMenuItem 
                    key={folder.id}
                    onClick={() => moveDocument(document.id, folder.id)}
                  >
                    {folder.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => deleteDocument(document.id)}
              className="text-destructive"
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {showVersionHistory && (
        <Dialog open={showVersionHistory} onOpenChange={setShowVersionHistory}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Version History - {document.name}</DialogTitle>
              <DialogDescription>
                View and manage previous versions of this document
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <VersionHistory 
                documentId={document.id} 
                onShowDiff={(originalContent, modifiedContent, originalTitle, modifiedTitle) => {
                  handleShowDiff(originalContent, modifiedContent, originalTitle, modifiedTitle);
                  setShowVersionHistory(false);
                }} 
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowVersionHistory(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
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
    clearComparisonDocuments,
    addFolder,
    deleteFolder,
    updateFolder,
    folders,
  } = useDocumentStore();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [comparisonMode, setComparisonMode] = useState(false);
  const [isCreatingDocument, setIsCreatingDocument] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: 'folder' | 'document' } | null>(null);

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
      clearComparisonDocuments();
    }
  };

  const toggleComparisonMode = () => {
    if (comparisonMode) {
      clearComparisonDocuments();
    }
    setComparisonMode(!comparisonMode);
  };

  // When comparison mode changes, update the UI
  useEffect(() => {
    const documentItems = document.querySelectorAll('.document-checkbox');
    documentItems.forEach(item => {
      if (comparisonMode) {
        item.classList.remove('opacity-0');
        item.classList.add('opacity-100');
      } else {
        item.classList.remove('opacity-100');
      }
    });
  }, [comparisonMode]);

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

  const handleCreateDocument = () => {
    if (newItemName.trim()) {
      // Create document at root level
      addDocument(newItemName.trim(), "", null);
      setNewItemName("");
      setIsCreatingDocument(false);
    }
  };

  const handleCreateFolder = () => {
    if (newItemName.trim()) {
      // Create folder at root level
      addFolder(newItemName.trim(), null);
      setNewItemName("");
      setIsCreatingFolder(false);
    }
  };

  const confirmDelete = () => {
    if (!itemToDelete) return;
    
    if (itemToDelete.type === 'folder') {
      deleteFolder(itemToDelete.id);
    } else {
      deleteDocument(itemToDelete.id);
    }
    
    setItemToDelete(null);
    setShowDeleteConfirm(false);
  };

  const rootFolders = folders.filter(f => f.parentId === null);
  const rootDocuments = documents.filter(d => d.folderId === null);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsCreatingDocument(true)}
            title="Create new document"
          >
            <Plus className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsCreatingFolder(true)}
            title="Create new folder"
          >
            <FolderPlus className="h-5 w-5" />
          </Button>
          <Button 
            variant={comparisonMode ? "secondary" : "ghost"}
            size="icon"
            onClick={toggleComparisonMode}
            title={comparisonMode ? "Exit comparison mode" : "Enter comparison mode"}
          >
            <GitCompare className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      {(isCreatingDocument || isCreatingFolder) && (
        <div className="flex gap-2 mb-4">
          <Input
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder={isCreatingDocument ? "Document name..." : "Folder name..."}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                isCreatingDocument ? handleCreateDocument() : handleCreateFolder();
              }
              if (e.key === 'Escape') {
                setIsCreatingDocument(false);
                setIsCreatingFolder(false);
                setNewItemName("");
              }
            }}
            autoFocus
          />
          <Button
            size="sm"
            onClick={isCreatingDocument ? handleCreateDocument : handleCreateFolder}
          >
            Create
          </Button>
        </div>
      )}
      
      <Input
        placeholder="Search documents..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="mb-4"
      />
      
      {comparisonMode && (
        <div className="mb-4 p-3 bg-muted rounded-md">
          <div className="text-sm font-medium mb-2">
            Comparison Mode: Select up to 2 documents
            <span className="ml-2 font-bold">
              ({comparisonDocumentIds.length}/2)
            </span>
          </div>
          {comparisonDocumentIds.length === 2 ? (
            <Button 
              variant="default" 
              className="w-full"
              onClick={handleCompare}
            >
              <GitCompare className="h-4 w-4 mr-2" />
              Compare Documents
            </Button>
          ) : (
            <div className="text-sm text-muted-foreground">
              {comparisonDocumentIds.length === 0 
                ? "Select 2 documents to compare" 
                : "Select 1 more document"}
            </div>
          )}
        </div>
      )}
      
      <div className="space-y-1 overflow-auto flex-1">
        {rootFolders.map((folder) => (
          <FolderItem
            key={folder.id}
            folder={folder}
            level={0}
            onCompareDocuments={onCompareDocuments}
          />
        ))}
        
        {rootDocuments.map((doc) => (
          <DocumentItem
            key={doc.id}
            document={doc}
            level={0}
            onCompareDocuments={onCompareDocuments}
          />
        ))}
      </div>
      
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              {itemToDelete?.type === 'folder' 
                ? "Are you sure you want to delete this folder? All documents inside will be moved to the root level."
                : "Are you sure you want to delete this document? This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 