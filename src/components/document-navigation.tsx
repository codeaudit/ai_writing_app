"use client";

import { useState, useRef, useCallback, useContext, useEffect, createContext } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  File, 
  FolderIcon, 
  GitCompare, 
  Plus, 
  FolderPlus, 
  FileText, 
  Trash as TrashIcon, 
  Settings, 
  ChevronRight, 
  ChevronDown,
  Download,
  Upload,
  Layers,
  MoreVertical,
  RefreshCw,
  Search,
  X,
  BookOpen,
  Filter,
  Move,
  Shield
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  useDocumentStore,
  Document,
  Folder
} from "@/lib/store";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { VersionHistory } from "./version-history";
import { toast } from "@/components/ui/use-toast";
import { TemplateDialog } from "./template-dialog";
import { VaultIntegrityDialog } from "./vault-integrity-dialog";
import { FilterDialog, FilterConfig } from "./filter-dialog";
import { filterDocuments, shouldShowFolder, matchesPatterns } from "@/lib/filter-utils";
import { loadFilterFromServer } from "@/lib/api-service";
import { fuzzySearch } from "@/lib/search-utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { CompositionComposer } from "./composition-composer";
import { DirectoryView } from './directory-view';
import { useRouter } from "next/navigation";
import {
  getSpecialDirectoryType,
  isSpecialDirectory,
  isDirectoryProtected,
  SPECIAL_DIRECTORIES,
  SpecialDirectoryType
} from "@/lib/special-directories";

// Create a context for the DocumentNavigation props
interface DocumentNavigationContextProps {
  onCompareDocuments?: (doc1Id: string, doc2Id: string) => void;
}

interface FileItem {
  name: string;
  type: 'file' | 'directory';
  path: string;
  children?: FileItem[];
}

const DocumentNavigationContext = createContext<DocumentNavigationContextProps>({});

interface DocumentNavigationProps {
  onCompareDocuments?: (doc1Id: string, doc2Id: string) => void;
  onFileSelect: (path: string, isDirectory: boolean) => void;
  className?: string;
}

interface FolderItemProps {
  folder: { id: string; name: string; parentId: string | null };
  level: number;
  comparisonMode: boolean;
  filteredDocuments: Document[];
  searchQuery: string;
  filterConfig: FilterConfig;
  onFileSelect: (path: string, isDirectory: boolean) => void;
  trashFolderId: string | null;
  handleDocumentDelete: (documentId: string) => void;
}

// Helper function to get the appropriate folder icon component
function getFolderIcon(folder: { id: string; name: string; parentId: string | null }) {
  // Cast the folder object to include createdAt for compatibility with Folder type
  const folderWithDate = {
    ...folder,
    createdAt: new Date() // Add a placeholder date since it's only used for type checking
  } as Folder;
  
  const specialDirType = getSpecialDirectoryType(folderWithDate);
  
  if (specialDirType) {
    const iconName = SPECIAL_DIRECTORIES[specialDirType].icon;
    // Return the appropriate icon based on the special directory type
    switch (iconName) {
      case 'trash':
        return <TrashIcon className="h-3 w-3 text-red-500" />;
      case 'settings':
        return <Settings className="h-3 w-3 text-blue-500" />;
      case 'file-text':
        return <FileText className="h-3 w-3 text-amber-500" />;
      case 'layers':
        return <Layers className="h-3 w-3 text-violet-500" />;
      default:
        return <FolderIcon className="h-3 w-3 text-muted-foreground" />;
    }
  }
  
  // Default folder icon
  return <FolderIcon className="h-3 w-3 text-muted-foreground" />;
}

function FolderItem({ folder, level, comparisonMode, filteredDocuments, searchQuery, filterConfig, onFileSelect, trashFolderId, handleDocumentDelete }: FolderItemProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(folder.name);
  const [isCreatingDocument, setIsCreatingDocument] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [showTokenCounterDialog, setShowTokenCounterDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  
  const {
    documents,
    folders,
    selectedFolderId,
    selectedDocumentId,
    comparisonDocumentIds,
    selectedFolderIds,
    updateFolder,
    deleteFolder,
    selectFolder,
    addDocument,
    addFolder,
    moveDocument,
    moveFolder,
    toggleComparisonFolder,
    copyFolder,
    specialDirectoryIds
  } = useDocumentStore();

  const childFolders = folders.filter(f => f.parentId === folder.id);
  const folderDocuments = filteredDocuments.filter(d => d.folderId === folder.id);
  
  // Check if this folder has any visible documents or child folders with visible documents
  const hasVisibleContent = folderDocuments.length > 0;
  
  // If this folder has no visible content, don't render it
  if (!hasVisibleContent && searchQuery.trim() !== '') {
    return null;
  }

  // Filter visible child folders
  const visibleChildFolders = childFolders.filter(childFolder => {
    // If we're not filtering or searching, show all folders
    if (!filterConfig.enabled && searchQuery === '') {
      return true;
    }
    
    // If we're only searching (filter not enabled), check if this folder or its children
    // contain any documents that match the search query
    if (!filterConfig.enabled && searchQuery !== '') {
      return shouldShowFolder(childFolder.id, folders, filteredDocuments);
    }
    
    // If filter is enabled, first check if the folder itself should be filtered out
    if (filterConfig.enabled) {
      // Get the folder path
      let folderPath = childFolder.name + '/';
      let currentFolderId = childFolder.parentId;
      
      // Build the folder path by traversing up the folder hierarchy
      while (currentFolderId) {
        const parent = folders.find(f => f.id === currentFolderId);
        if (!parent) break;
        folderPath = parent.name + '/' + folderPath;
        currentFolderId = parent.parentId;
      }
      
      // Check if the folder path matches any filter patterns
      // If it doesn't match (should be excluded), return false
      if (!matchesPatterns(folderPath, filterConfig.patterns)) {
        return false;
      }
      
      // If the folder itself is not filtered out, check if it has any visible documents
      return shouldShowFolder(childFolder.id, folders, filteredDocuments);
    }
    
    return false;
  });

  // Cast the folder to Folder type for isSpecialDirectory function
  const folderWithDate = {
    ...folder,
    createdAt: new Date() // Add a placeholder date for type compatibility
  } as Folder;

  // Check if this is a special directory
  const isSpecial = isSpecialDirectory(folderWithDate);
  const isProtected = isDirectoryProtected(folderWithDate);

  const handleRename = () => {
    if (newName.trim() && newName !== folder.name) {
      updateFolder(folder.id, newName.trim());
    }
    setIsRenaming(false);
  };

  const handleCreateDocument = () => {
    if (newItemName.trim()) {
      // Determine the appropriate folder ID for the new document
      let targetFolderId: string | null = null;
      
      // If a folder is selected, use that folder's ID
      if (selectedFolderId) {
        targetFolderId = selectedFolderId;
      } 
      // If a document is selected, use its parent folder ID
      else if (selectedDocumentId) {
        const selectedDoc = documents.find(doc => doc.id === selectedDocumentId);
        if (selectedDoc) {
          targetFolderId = selectedDoc.folderId;
        }
      }
      
      // Create document at the appropriate level
      const newDocId = addDocument(newItemName.trim(), "", targetFolderId);
      setNewItemName("");
      setIsCreatingDocument(false);
      
      // Update URL to reflect the newly created document
      if (newDocId) {
        router.push(`/documents/${newDocId}`);
      }
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

  // Check if folder is selected (all documents in folder are selected)
  const isFolderSelected = folderDocuments.length > 0 && 
    folderDocuments.every(doc => comparisonDocumentIds.includes(doc.id));
  
  // Check if folder is partially selected (some documents in folder are selected)
  const isPartiallySelected = folderDocuments.some(doc => comparisonDocumentIds.includes(doc.id)) && 
    !isFolderSelected;

  // Get all selected documents from the store
  const selectedDocuments = documents.filter(doc => comparisonDocumentIds.includes(doc.id));

  return (
    <div>
      <div 
        className={cn(
          "flex items-center gap-0.5 py-0.5 px-1 rounded-sm hover:bg-muted/50 group",
          selectedFolderId === folder.id && "bg-muted/70",
          isSpecial && "font-medium" // Special directories have slightly bolder text
        )}
        style={{ paddingLeft: `${level * 8 + 2}px` }}
      >
        <div className="flex items-center justify-center w-4 h-4 mr-0">
          <Checkbox
            checked={isFolderSelected}
            className={cn(
              "transition-opacity folder-checkbox h-3 w-3 rounded-none",
              comparisonMode ? "opacity-100" : "opacity-0 group-hover:opacity-70"
            )}
            onCheckedChange={() => toggleComparisonFolder(folder.id)}
            aria-label={`Select folder ${folder.name}`}
          />
        </div>
        
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-3 h-3 flex items-center justify-center text-muted-foreground"
        >
          {isExpanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </button>
        
        {getFolderIcon(folder)}
        
        {isRenaming ? (
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') setIsRenaming(false);
            }}
            className="h-5 py-0 px-1 text-xs"
            autoFocus
          />
        ) : (
          <button
            className={cn(
              "flex-1 text-left text-xs truncate",
              isPartiallySelected && "font-medium text-primary"
            )}
            onClick={() => {
              selectFolder(folder.id);
              onFileSelect(folder.id, true);
            }}
          >
            {folder.name}
          </button>
        )}
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 opacity-0 group-hover:opacity-100 p-0"
            >
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="text-xs">
            {/* Only allow renaming if not a special directory or if it's trash */}
            {(!isSpecial || folder.id === trashFolderId) && (
              <DropdownMenuItem onClick={() => setIsRenaming(true)}>
                Rename
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => setIsCreatingDocument(true)}>
              New Document
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowTemplateDialog(true)}>
              New from Template
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsCreatingFolder(true)}>
              New Folder
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => {
                toggleComparisonFolder(folder.id);
                setShowTokenCounterDialog(true);
              }}
            >
              Compose
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={async () => {
                try {
                  const newFolderId = await copyFolder(folder.id);
                  toast({
                    title: "Directory copied",
                    description: `Successfully copied "${folder.name}" and its contents.`,
                  });
                } catch (error) {
                  toast({
                    title: "Error copying directory",
                    description: error instanceof Error ? error.message : 'An error occurred',
                    variant: "destructive",
                  });
                }
              }}
            >
              Copy Directory
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {/* Only show delete option if not protected or if it's trash (which can be emptied) */}
            {(!isProtected || folder.id === trashFolderId) && (
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => {
                  if (folder.id === trashFolderId) {
                    // For trash folder, empty it
                    if (confirm("Are you sure you want to empty the trash? All items will be permanently deleted.")) {
                      const trashDocuments = documents.filter(doc => doc.folderId === trashFolderId);
                      const trashFolders = folders.filter(f => f.parentId === trashFolderId);
                      
                      // Delete all documents in trash using the store's deleteDocument function
                      trashDocuments.forEach(doc => {
                        // Need to use parent scope deleteDocument from useDocumentStore
                        useDocumentStore.getState().deleteDocument(doc.id);
                      });
                      
                      // Delete all folders in trash
                      trashFolders.forEach(folder => {
                        deleteFolder(folder.id);
                      });
                      
                      toast({
                        title: "Trash emptied",
                        description: "All items in trash have been permanently deleted."
                      });
                    }
                  } else {
                    // For regular folders
                    if (confirm(`Are you sure you want to delete the folder "${folder.name}" and all its contents?`)) {
                      deleteFolder(folder.id);
                    }
                  }
                }}
              >
                {folder.id === trashFolderId ? "Empty Trash" : "Delete"}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isCreatingDocument && (
        <div className="flex gap-1 mt-0.5 mb-0.5 ml-6">
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
            className="h-5 text-xs"
            autoFocus
          />
          <Button
            size="sm"
            onClick={handleCreateDocument}
            className="h-5 text-xs px-2"
          >
            Add
          </Button>
        </div>
      )}

      {isCreatingFolder && (
        <div className="flex gap-1 mt-0.5 mb-0.5 ml-6">
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
            className="h-5 text-xs"
            autoFocus
          />
          <Button
            size="sm"
            onClick={handleCreateFolder}
            className="h-5 text-xs px-2"
          >
            Add
          </Button>
        </div>
      )}

      {isExpanded && (
        <>
          {visibleChildFolders.map((childFolder) => (
            <FolderItem
              key={childFolder.id}
              folder={childFolder}
              level={level + 1}
              comparisonMode={comparisonMode}
              filteredDocuments={filteredDocuments}
              searchQuery={searchQuery}
              filterConfig={filterConfig}
              onFileSelect={onFileSelect}
              trashFolderId={trashFolderId}
              handleDocumentDelete={handleDocumentDelete}
            />
          ))}
          
          {folderDocuments.map((doc) => (
            <DocumentItem
              key={doc.id}
              document={doc}
              level={level + 1}
              filteredDocuments={filteredDocuments}
              onFileSelect={onFileSelect}
              trashFolderId={trashFolderId}
              handleDocumentDelete={handleDocumentDelete}
            />
          ))}
        </>
      )}

      {showTokenCounterDialog && (
        <CompositionComposer
          isOpen={showTokenCounterDialog}
          onClose={() => setShowTokenCounterDialog(false)}
          documents={selectedDocuments}
        />
      )}

      {showTemplateDialog && (
        <TemplateDialog
          open={showTemplateDialog}
          onOpenChange={setShowTemplateDialog}
          folderId={selectedFolderId}
          templateDirectory="templates"
        />
      )}
    </div>
  );
}

interface DocumentItemProps {
  document: { id: string; name: string; folderId: string | null };
  level: number;
  filteredDocuments?: Document[];
  onFileSelect: (path: string, isDirectory: boolean) => void;
  trashFolderId: string | null;
  handleDocumentDelete: (documentId: string) => void;
}

function DocumentItem({ document, level, filteredDocuments, onFileSelect, trashFolderId, handleDocumentDelete }: DocumentItemProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(document.name);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showTokenCounterDialog, setShowTokenCounterDialog] = useState(false);
  
  const {
    selectedDocumentId,
    comparisonDocumentIds,
    updateDocument,
    deleteDocument,
    deleteMultipleDocuments,
    selectDocument,
    toggleComparisonDocument,
    clearComparisonDocuments,
    moveDocument,
    folders,
    documents,
    specialDirectoryIds
  } = useDocumentStore();

  // Get access to onCompareDocuments from the parent component
  const { onCompareDocuments } = useContext(DocumentNavigationContext);

  const handleRename = () => {
    if (newName.trim() && newName !== document.name) {
      updateDocument(document.id, { name: newName.trim() });
    }
    setIsRenaming(false);
  };

  const handleToggleComparison = () => {
    // Toggle document selection for token counting
    toggleComparisonDocument(document.id);
  };

  const handleShowDiff = useCallback((originalContent: string, modifiedContent: string, originalTitle: string, modifiedTitle: string) => {
    // This is a placeholder since we can't directly show diff from here
    // We'll select the document instead and let the user know to use the version history in the editor
    selectDocument(document.id);
    // Update URL without page refresh using History API
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', `/documents/${document.id}`);
    }
    toast({
      title: "Document selected",
      description: "Use the version history button in the editor to compare versions.",
    });
  }, [document.id, selectDocument]);

  // Handle document selection with URL update
  const handleSelectDocument = () => {
    selectDocument(document.id);
    // Update URL without page refresh using History API
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', `/documents/${document.id}`);
    }
  };

  // Document can always be selected
  const canSelect = true;

  // Get all selected documents from the store
  const selectedDocuments = documents.filter(doc => comparisonDocumentIds.includes(doc.id));

  const handleContextMenuAction = (action: string) => {
    // Determine if this document is in a protected directory
    const isInProtectedDirectory = () => {
      // Find the folder
      const folder = folders.find(f => f.id === document.folderId);
      if (!folder) return false;
      
      // Create a proper folder object with createdAt
      const folderWithDate = {
        ...folder,
        createdAt: folder.createdAt instanceof Date ? folder.createdAt : new Date()
      } as Folder;
      
      // Check if it's protected
      return isDirectoryProtected(folderWithDate);
    };
    
    const isProtected = isInProtectedDirectory();
    
    switch(action) {
      case "delete":
        if (isProtected) {
          toast({
            variant: "destructive",
            title: "Cannot delete",
            description: "This document is in a protected system directory and cannot be moved to trash."
          });
          return;
        }
        handleDocumentDelete(document.id);
        break;
      // ... other actions
    }
  };

  return (
    <>
      <div
        className={cn(
          "flex items-center gap-0.5 py-0.5 px-1 rounded-sm hover:bg-muted/50 group",
          selectedDocumentId === document.id && "bg-muted/70",
          comparisonDocumentIds.includes(document.id) && "border-l border-primary"
        )}
        style={{ paddingLeft: `${level * 8 + 2}px` }}
      >
        <div className="flex items-center justify-center w-4 h-4 mr-0">
          <Checkbox
            checked={comparisonDocumentIds.includes(document.id)}
            onCheckedChange={handleToggleComparison}
            className={cn(
              "document-checkbox transition-opacity h-3 w-3 rounded-none",
              comparisonDocumentIds.length > 0 ? "opacity-100" : "opacity-0 group-hover:opacity-70"
            )}
          />
        </div>
        
        <div className="w-3 h-3"></div>
        
        <File className="h-3 w-3 text-muted-foreground ml-0.5" />
        
        {isRenaming ? (
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') setIsRenaming(false);
            }}
            className="h-5 py-0 px-1 text-xs"
            autoFocus
          />
        ) : (
          <button
            className="flex-1 text-left text-xs truncate"
            onClick={() => {
              if (canSelect) {
                handleSelectDocument();
                onFileSelect(document.id, false);
              }
            }}
          >
            {document.name}
          </button>
        )}
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 opacity-0 group-hover:opacity-100 p-0"
            >
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="text-xs">
            <DropdownMenuItem onClick={() => setIsRenaming(true)}>
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowVersionHistory(true)}>
              Version History
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => {
                if (!comparisonDocumentIds.includes(document.id)) {
                  toggleComparisonDocument(document.id);
                }
                setShowTokenCounterDialog(true);
              }}
            >
              Compose
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                // If this document is already selected, compare it with the other selected document
                if (comparisonDocumentIds.includes(document.id) && comparisonDocumentIds.length === 2 && onCompareDocuments) {
                  // Find the other document ID that's not this one
                  const otherDocId = comparisonDocumentIds.find(id => id !== document.id);
                  if (otherDocId) {
                    onCompareDocuments(document.id, otherDocId);
                    // Clear selection after comparing
                    clearComparisonDocuments();
                    toast({
                      title: "Comparing documents",
                      description: "Showing differences between the selected documents in the editor.",
                    });
                  }
                } else {
                  // Otherwise, add/remove this document to/from comparison
                  toggleComparisonDocument(document.id);
                  
                  // Get current state after toggle
                  const isSelected = !comparisonDocumentIds.includes(document.id);
                  const selectedCount = isSelected ? comparisonDocumentIds.length + 1 : comparisonDocumentIds.length - 1;
                  
                  toast({
                    title: isSelected ? "Document added to comparison" : "Document removed from comparison",
                    description: selectedCount === 2 && isSelected 
                      ? "You have 2 documents selected. Click the Compare button to compare them." 
                      : `You have ${selectedCount} document${selectedCount !== 1 ? 's' : ''} selected for comparison.`,
                  });
                }
              }}
            >
              {comparisonDocumentIds.includes(document.id) && comparisonDocumentIds.length === 2 
                ? "Compare with Selected" 
                : comparisonDocumentIds.includes(document.id) 
                  ? "Remove from Compare" 
                  : "Add to Compare"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Move className="h-3 w-3 mr-1" />
                Move to
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => moveDocument(document.id, null)}>
                  Root
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {folders.map(folder => (
                  <DropdownMenuItem 
                    key={folder.id}
                    onClick={() => moveDocument(document.id, folder.id)}
                    disabled={document.folderId === folder.id}
                  >
                    {folder.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => handleContextMenuAction("delete")}
            >
              {document.folderId === trashFolderId ? "Delete Permanently" : "Move to Trash"}
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

      {showTokenCounterDialog && (
        <CompositionComposer
          isOpen={showTokenCounterDialog}
          onClose={() => setShowTokenCounterDialog(false)}
          documents={selectedDocuments}
        />
      )}
    </>
  );
}

export function DocumentNavigation({ onCompareDocuments, onFileSelect, className }: DocumentNavigationProps) {
  const router = useRouter();
  const { 
    documents, 
    selectedDocumentId, 
    comparisonDocumentIds,
    selectedFolderId,
    addDocument, 
    selectDocument,
    deleteDocument,
    deleteMultipleDocuments,
    toggleComparisonDocument,
    clearComparisonDocuments,
    addFolder,
    deleteFolder,
    updateFolder,
    folders,
    loadData,
    copyFolder,
    moveDocument,
    moveFolder,
    specialDirectoryIds
  } = useDocumentStore();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [comparisonMode, setComparisonMode] = useState(false);
  const [isCreatingDocument, setIsCreatingDocument] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: 'folder' | 'document' } | null>(null);
  const [showMultiDeleteConfirm, setShowMultiDeleteConfirm] = useState(false);
  const [showTokenCounterDialog, setShowTokenCounterDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showIntegrityDialog, setShowIntegrityDialog] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterConfig, setFilterConfig] = useState<FilterConfig>({ enabled: false, patterns: [] });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [items, setItems] = useState<FileItem[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [trashFolderId, setTrashFolderId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Apply search filter with fuzzy search
  const searchFilteredDocuments = searchQuery.trim() 
    ? fuzzySearch(documents, searchQuery, ['name', 'content'], { threshold: 0.3 })
    : documents;
  
  // Apply pattern filter if enabled
  const filteredDocuments = filterConfig.enabled
    ? filterDocuments(searchFilteredDocuments, folders, filterConfig.patterns)
    : searchFilteredDocuments;
  
  // Get root folders and documents
  const rootFolders = folders.filter(f => f.parentId === null);
  const rootDocuments = filteredDocuments.filter(d => d.folderId === null);
  
  // Filter root folders to only show those that have visible documents
  const visibleRootFolders = rootFolders.filter(folder => {
    // If we're not filtering or searching, show all folders
    if (!filterConfig.enabled && searchQuery === '') {
      return true;
    }
    
    // If we're only searching (filter not enabled), check if this folder or its children
    // contain any documents that match the search query
    if (!filterConfig.enabled && searchQuery !== '') {
      return shouldShowFolder(folder.id, folders, filteredDocuments);
    }
    
    // If filter is enabled, first check if the folder itself should be filtered out
    if (filterConfig.enabled) {
      // Get the folder path
      let folderPath = folder.name + '/';
      let currentFolder = folder;
      let parentId = folder.parentId;
      
      // Build the folder path by traversing up the folder hierarchy
      while (parentId) {
        const parent = folders.find(f => f.id === parentId);
        if (!parent) break;
        folderPath = parent.name + '/' + folderPath;
        parentId = parent.parentId;
      }
      
      // Check if the folder path matches any filter patterns
      // If it doesn't match (should be excluded), return false
      if (!matchesPatterns(folderPath, filterConfig.patterns)) {
        return false;
      }
      
      // If the folder itself is not filtered out, check if it has any visible documents
      return shouldShowFolder(folder.id, folders, filteredDocuments);
    }
    
    return false;
  });

  const createNewDocument = () => {
    if (!newItemName.trim()) {
      setIsCreatingDocument(false);
      return;
    }

    // For top-level "+" button, always create at root level
    // We'll force null folderId for new documents created from the top bar
    const newDocId = addDocument(
      newItemName.trim() || `New Document ${documents.length + 1}`, 
      `# ${newItemName.trim() || `New Document ${documents.length + 1}`}\n\nStart writing here...`,
      null // Always create at root level
    );
    
    // Clear the input and hide it
    setNewItemName("");
    setIsCreatingDocument(false);
    
    // Update URL without page refresh using History API
    if (newDocId && typeof window !== 'undefined') {
      window.history.pushState({}, '', `/documents/${newDocId}`);
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

  const handleDeleteSelectedDocuments = async () => {
    if (comparisonDocumentIds.length > 0) {
      // Close the confirmation dialog
      setShowMultiDeleteConfirm(false);
      
      // Get the names of the documents to be deleted for the toast message
      const selectedDocs = documents.filter(doc => comparisonDocumentIds.includes(doc.id));
      const docNames = selectedDocs.map(doc => doc.name);
      
      // Delete the documents
      await deleteMultipleDocuments(comparisonDocumentIds);
      
      // Show success toast
      toast({
        title: "Documents deleted",
        description: `${comparisonDocumentIds.length} documents have been deleted.`,
      });
      
      // Exit comparison mode
      setComparisonMode(false);
    }
  };

  const handleCreateFolderInParent = () => {
    if (newItemName.trim()) {
      // Create a new folder
      addFolder(
        newItemName.trim() || `New Folder ${folders.length + 1}`,
        selectedFolderId
      );
      
      // Clear the input and hide it
      setNewItemName("");
      setIsCreatingFolder(false);
    }
  };

  const confirmDelete = () => {
    if (!itemToDelete) return;
    
    // Close the confirmation dialog
    setShowDeleteConfirm(false);
    
    if (itemToDelete.type === 'document') {
      handleDocumentDelete(itemToDelete.id);
    } else if (itemToDelete.type === 'folder') {
      handleFolderDelete(itemToDelete.id);
    }
    
    // Reset the state
    setItemToDelete(null);
  };

  const handleImportDocuments = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    // Check if it's a zip file
    const file = files[0];
    if (file.type === 'application/zip' || file.name.endsWith('.zip')) {
      try {
        // Show loading toast
        toast({
          title: "Importing vault",
          description: "Please wait while we import your documents...",
        });
        
        // Read the zip file
        const zipData = await JSZip.loadAsync(file);
        let importCount = 0;
        
        // Process each file in the zip
        const importPromises = Object.keys(zipData.files).map(async (fileName) => {
          // Skip directories
          if (zipData.files[fileName].dir) return;
          
          // Only process markdown files
          if (!fileName.endsWith('.md') && !fileName.endsWith('.markdown') && !fileName.endsWith('.txt') && !fileName.endsWith('.mdx')) return;
          
          try {
            // Get the file content
            const content = await zipData.files[fileName].async('text');
            
            // Extract folder structure from path
            const pathParts = fileName.split('/');
            const docName = pathParts.pop()?.replace(/\.[^/.]+$/, "") || 'Untitled';
            
            // Create folders if needed and get the final folder ID
            let currentFolderId: string | null = null;
            
            if (pathParts.length > 0) {
              for (const folderName of pathParts) {
                if (!folderName) continue; // Skip empty folder names
                
                // Check if folder already exists
                let folder = folders.find(f => 
                  f.name === folderName && f.parentId === currentFolderId
                );
                
                if (!folder) {
                  // Create the folder
                  await addFolder(folderName, currentFolderId);
                  
                  // Get the newly created folder
                  folder = folders.find(f => 
                    f.name === folderName && f.parentId === currentFolderId
                  );
                }
                
                if (folder) {
                  currentFolderId = folder.id;
                }
              }
            }
            
            // Create the document in the appropriate folder
            await addDocument(docName, content, currentFolderId);
            importCount++;
          } catch (error) {
            console.error(`Error importing file ${fileName}:`, error);
          }
        });
        
        // Wait for all imports to complete
        await Promise.all(importPromises);
        
        // Show success message
        toast({
          title: "Vault imported",
          description: `Successfully imported ${importCount} documents.`,
        });
      } catch (error) {
        console.error("Error importing zip file:", error);
        toast({
          title: "Import failed",
          description: "Failed to import vault. Please check the file format and try again.",
          variant: "destructive",
        });
      }
    } else {
      // Process individual files as before
      Array.from(files).forEach(async (file) => {
        try {
          // Read file content
          const content = await file.text();
          
          // Create a new document with the file name (without extension) and content
          const fileName = file.name.replace(/\.[^/.]+$/, ""); // Remove file extension
          const newDocId = await addDocument(fileName, content, null);
          
          // Show success message
          toast({
            title: "Document imported",
            description: `"${fileName}" has been imported successfully.`,
          });
          
          // Select the newly created document
          if (newDocId) {
            selectDocument(newDocId);
            router.push(`/documents/${newDocId}`);
          }
        } catch (error) {
          console.error("Error importing document:", error);
          toast({
            title: "Import failed",
            description: "Failed to import document. Please try again.",
            variant: "destructive",
          });
        }
      });
    }
    
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Load filter config on component mount
  useEffect(() => {
    const loadFilterConfig = async () => {
      try {
        const config = await loadFilterFromServer();
        setFilterConfig(config);
      } catch (error) {
        console.error("Error loading filter config:", error);
      }
    };
    
    loadFilterConfig();
  }, []);
  
  const handleFilterChange = (newConfig: FilterConfig) => {
    setFilterConfig(newConfig);
  };
  
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      toast({
        title: "Refreshing documents",
        description: "Updating content from the file system...",
      });
      
      await loadData();
      
      toast({
        title: "Refresh complete",
        description: `Successfully refreshed ${documents.length} documents from the file system.`,
      });
    } catch (error) {
      console.error("Error refreshing documents:", error);
      toast({
        title: "Refresh failed",
        description: "There was an error refreshing documents from the file system.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleExportDocuments = async () => {
    try {
      // Show loading toast
      toast({
        title: "Exporting vault",
        description: "Please wait while we prepare your documents...",
      });
      
      const zip = new JSZip();
      
      // Helper function to get the full path for a document
      const getDocumentPath = (doc: { id: string; name: string; folderId: string | null }): string => {
        let path = `${doc.name}.md`;
        let currentFolderId = doc.folderId;
        
        // Build the path by traversing up the folder hierarchy
        while (currentFolderId) {
          const folder = folders.find(f => f.id === currentFolderId);
          if (!folder) break;
          
          path = `${folder.name}/${path}`;
          currentFolderId = folder.parentId;
        }
        
        return path;
      };
      
      // Add all documents to the zip
      for (const doc of documents) {
        const path = getDocumentPath(doc);
        zip.file(path, doc.content);
      }
      
      // Generate the zip file
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      
      // Save the zip file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      saveAs(zipBlob, `vault-export-${timestamp}.zip`);
      
      // Show success message
      toast({
        title: "Vault exported",
        description: `Successfully exported ${documents.length} documents.`,
      });
    } catch (error) {
      console.error("Error exporting vault:", error);
      toast({
        title: "Export failed",
        description: "Failed to export vault. Please try again.",
        variant: "destructive",
      });
    }
  };

  const exportDocument = (doc: { name: string; content: string }) => {
    // Create a blob with the document content
    const blob = new Blob([doc.content], { type: "text/markdown" });
    
    // Create a download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.name}.md`;
    
    // Trigger the download
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Get selected documents for token counter
  const selectedDocuments = documents.filter(doc => 
    comparisonDocumentIds.includes(doc.id)
  );

  const loadDirectoryContents = async (dirPath: string) => {
    // TODO: Implement actual directory loading
    const mockItems: FileItem[] = [
      { 
        name: 'Documents', 
        type: 'directory', 
        path: '/Documents',
        children: [
          { name: 'Work', type: 'directory', path: '/Documents/Work' },
          { name: 'Personal', type: 'directory', path: '/Documents/Personal' }
        ]
      },
      { 
        name: 'Images', 
        type: 'directory', 
        path: '/Images',
        children: [
          { name: 'Photos', type: 'directory', path: '/Images/Photos' },
          { name: 'Screenshots', type: 'directory', path: '/Images/Screenshots' }
        ]
      }
    ];
    setItems(mockItems);
  };

  const toggleDirectory = (dirPath: string) => {
    const newExpanded = new Set(expandedDirs);
    if (newExpanded.has(dirPath)) {
      newExpanded.delete(dirPath);
    } else {
      newExpanded.add(dirPath);
    }
    setExpandedDirs(newExpanded);
    setSelectedPath(dirPath);
  };

  const renderItem = (item: FileItem, level: number = 0) => {
    const isDirectory = item.type === 'directory';
    const isExpanded = expandedDirs.has(item.path);
    const isSelected = selectedPath === item.path;

    return (
      <div key={item.path}>
        <div
          className={cn(
            "flex items-center gap-2 p-2 rounded-md hover:bg-accent cursor-pointer",
            selectedPath === item.path && "bg-accent",
            className
          )}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
          onClick={() => {
            if (isDirectory) {
              toggleDirectory(item.path);
            }
            onFileSelect(item.path, isDirectory);
          }}
        >
          {isDirectory ? (
            <>
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <FolderIcon className="h-5 w-5 text-yellow-500" />
            </>
          ) : (
            <File className="h-5 w-5 text-blue-500" />
          )}
          <span className="truncate">{item.name}</span>
        </div>
        {isDirectory && isExpanded && item.children && (
          <div>
            {item.children.map(child => renderItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFilterShortcuts = (e: KeyboardEvent) => {
    // Check if command/ctrl key is pressed with F
    if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
      e.preventDefault();
      searchInputRef.current?.focus();
    }
  };

  // Update useEffect to find the trash folder ID
  useEffect(() => {
    // For backward compatibility, support both special directory IDs and legacy trash folder
    const trashId = specialDirectoryIds?.[SpecialDirectoryType.TRASH] || null;
    
    if (trashId) {
      console.log("Found trash folder from special directories:", trashId);
      setTrashFolderId(trashId);
    } else {
      // Legacy fallback
      const trashFolder = folders.find(folder => 
        folder.name.toLowerCase() === "trash" && (folder.parentId === "/" || folder.parentId === null)
      );
      
      if (trashFolder) {
        console.log("Found trash folder in document navigation:", trashFolder.id);
        setTrashFolderId(trashFolder.id);
      } else {
        console.log("No trash folder found in document navigation");
      }
    }
  }, [folders, specialDirectoryIds]);

  // Handle document delete with trash functionality
  const handleDocumentDelete = (documentId: string) => {
    const doc = documents.find(d => d.id === documentId);
    if (!doc) return;
    
    const trashId = specialDirectoryIds?.[SpecialDirectoryType.TRASH] || trashFolderId;
    const isInTrash = doc.folderId === trashId;
    
    if (isInTrash) {
      // If already in trash, confirm permanent deletion
      if (confirm(`Are you sure you want to permanently delete "${doc.name}"? This action cannot be undone.`)) {
        deleteDocument(documentId);
        toast({
          title: "Document deleted",
          description: `"${doc.name}" has been permanently deleted.`
        });
      }
    } else {
      // If not in trash, move to trash
      if (trashId) {
        moveDocument(documentId, trashId);
        toast({
          title: "Document moved to trash",
          description: `"${doc.name}" has been moved to trash.`
        });
      } else {
        // No trash folder, fall back to delete
        if (confirm(`Are you sure you want to delete "${doc.name}"?`)) {
          deleteDocument(documentId);
          toast({
            title: "Document deleted",
            description: `"${doc.name}" has been deleted.`
          });
        }
      }
    }
  };
  
  // Handle folder delete with trash functionality
  const handleFolderDelete = (folderId: string) => {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;
    
    const trashId = specialDirectoryIds?.[SpecialDirectoryType.TRASH] || trashFolderId;
    
    // Check if it's the trash folder itself
    if (folder.id === trashId) {
      // Empty trash instead of deleting it
      if (confirm("Are you sure you want to empty the trash? All items will be permanently deleted.")) {
        const trashDocuments = documents.filter(doc => doc.folderId === trashId);
        const trashFolders = folders.filter(f => f.parentId === trashId);
        
        // Delete all documents in trash
        for (const doc of trashDocuments) {
          deleteDocument(doc.id);
        }
        
        // Delete all folders in trash recursively
        for (const folder of trashFolders) {
          // Try to delete recursively
          try {
            deleteFolder(folder.id);
          } catch (error) {
            console.error("Error deleting folder from trash:", error);
          }
        }
        
        toast({
          title: "Trash emptied",
          description: "All items in trash have been permanently deleted."
        });
      }
      return;
    }
    
    // Check if the folder is protected (system, templates, etc.)
    if (isDirectoryProtected(folder)) {
      toast({
        variant: "destructive",
        title: "Protected folder",
        description: `"${folder.name}" is a protected system folder and cannot be deleted.`
      });
      return;
    }
    
    const isInTrash = folder.parentId === trashId;
    
    if (isInTrash) {
      // If already in trash, confirm permanent deletion
      if (confirm(`Are you sure you want to permanently delete folder "${folder.name}" and all its contents? This action cannot be undone.`)) {
        deleteFolder(folderId).catch(error => {
          console.error("Error deleting folder:", error);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to delete folder. The folder might not be empty."
          });
        });
        
        toast({
          title: "Folder deleted",
          description: `"${folder.name}" has been permanently deleted.`
        });
      }
    } else {
      // If not in trash, move to trash
      if (trashId) {
        moveFolder(folderId, trashId);
        toast({
          title: "Folder moved to trash",
          description: `"${folder.name}" has been moved to trash.`
        });
      } else {
        // No trash folder, fall back to delete
        if (confirm(`Are you sure you want to delete folder "${folder.name}" and all its contents?`)) {
          deleteFolder(folderId).catch(error => {
            console.error("Error deleting folder:", error);
            toast({
              variant: "destructive",
              title: "Error",
              description: "Failed to delete folder. The folder might not be empty."
            });
          });
          
          toast({
            title: "Folder deleted",
            description: `"${folder.name}" has been deleted.`
          });
        }
      }
    }
  };

  // Add an error effect handler for recursive deletion prompts
  useEffect(() => {
    const error = useDocumentStore.getState().error;
    
    // Check if the error is a non-empty folder error that can be recursively deleted
    if (error && typeof error === 'object' && 'canRecurse' in error && error.canRecurse && error.folderId) {
      const folder = folders.find(f => f.id === error.folderId);
      
      if (folder && confirm(`${error.message}\n\nDo you want to delete this folder and all its contents?`)) {
        // User confirmed recursive deletion, use the store directly
        const store = useDocumentStore.getState();
        if (store.deleteRecursively) {
          store.deleteRecursively(error.folderId);
        }
      }
      // Clear the error state
      useDocumentStore.getState().setError(null);
    }
  }, [folders]);

  return (
    <DocumentNavigationContext.Provider value={{ onCompareDocuments }}>
      <div className={cn("flex flex-col h-full", className)}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <h2 className="text-sm font-medium">Documents</h2>
            <Button
              variant="ghost" 
              size="icon" 
              onClick={() => {
                // Reset folder selection to ensure document is created at root level
                setNewItemName("");
                setIsCreatingDocument(true);
              }}
              title="Create new document"
              className="h-6 w-6"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost" 
              size="icon" 
              onClick={() => setShowTemplateDialog(true)}
              title="Create from template"
              className="h-6 w-6"
            >
              <FileText className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost" 
              size="icon" 
              onClick={() => setIsCreatingFolder(true)}
              title="Create new folder"
              className="h-6 w-6"
            >
              <FolderPlus className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (comparisonDocumentIds.length === 2 && onCompareDocuments) {
                  // When exactly 2 documents are selected, use compare function
                  onCompareDocuments(comparisonDocumentIds[0], comparisonDocumentIds[1]);
                  
                  // Clear selection after comparing
                  clearComparisonDocuments();
                  setComparisonMode(false);
                  
                  toast({
                    title: "Comparing documents",
                    description: "Showing differences between the selected documents in the editor.",
                  });
                } else if (comparisonDocumentIds.length >= 2) {
                  // If we have more than 2 documents selected, show them in a composition dialog
                  setShowTokenCounterDialog(true);
                } else {
                  toast({
                    title: "Select documents first",
                    description: "Please select exactly 2 documents to compare.",
                    variant: "destructive"
                  });
                }
              }}
              disabled={comparisonDocumentIds.length < 2}
              className="h-6 w-6 p-0"
              title="Compare selected documents"
            >
              <GitCompare className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-6 w-6 p-0"
              title="Refresh documents from file system"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant={filterConfig.enabled ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowFilterDialog(true)}
              className="h-6 w-6 p-0"
              title={filterConfig.enabled ? "Filter is active - click to modify" : "Set up document filters"}
            >
              <Filter className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        
        {(isCreatingDocument || isCreatingFolder) && (
          <div className="flex gap-1 mb-2">
            <Input
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder={isCreatingDocument ? "Document name..." : "Folder name..."}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  isCreatingDocument ? createNewDocument() : handleCreateFolderInParent();
                }
                if (e.key === 'Escape') {
                  setIsCreatingDocument(false);
                  setIsCreatingFolder(false);
                  setNewItemName("");
                }
              }}
              className="h-6 text-xs"
              autoFocus
            />
            <Button
              size="sm"
              onClick={isCreatingDocument ? createNewDocument : handleCreateFolderInParent}
              className="h-6 text-xs px-2"
            >
              Create
            </Button>
          </div>
        )}
        
        <Input
          placeholder="Search documents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="mb-2 h-6 text-xs"
          ref={searchInputRef}
        />
        
        {comparisonMode && (
          <div className="mb-2 p-1.5 bg-muted/50 rounded-sm">
            <div className="text-xs font-medium mb-1">
              Selection Mode: 
              <span className="ml-1 font-bold">
                ({comparisonDocumentIds.length} selected)
              </span>
            </div>
            {comparisonDocumentIds.length > 0 ? (
              <div className="flex gap-2">
                <Button 
                  variant="default" 
                  className="flex-1 h-6 text-xs"
                  onClick={() => setShowTokenCounterDialog(true)}
                >
                  Compose Selected
                </Button>
                <Button 
                  variant="destructive" 
                  className="h-6 text-xs"
                  onClick={() => setShowMultiDeleteConfirm(true)}
                >
                  Delete Selected
                </Button>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">
                Select documents to compose
              </div>
            )}
          </div>
        )}
        
        <div className="space-y-0.5 overflow-auto flex-1 pr-1">
          {visibleRootFolders.map((folder) => (
            <FolderItem
              key={folder.id}
              folder={folder}
              level={0}
              comparisonMode={comparisonMode}
              filteredDocuments={filteredDocuments}
              searchQuery={searchQuery}
              filterConfig={filterConfig}
              onFileSelect={onFileSelect}
              trashFolderId={trashFolderId}
              handleDocumentDelete={handleFolderDelete}
            />
          ))}
          
          {rootDocuments.map((doc) => (
            <DocumentItem
              key={doc.id}
              document={doc}
              level={0}
              filteredDocuments={filteredDocuments}
              onFileSelect={onFileSelect}
              trashFolderId={trashFolderId}
              handleDocumentDelete={handleFolderDelete}
            />
          ))}
        </div>
        
        <div className="mt-2 border-t pt-2 flex flex-col gap-2">
          <div className="flex justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 mr-1 h-6 text-xs"
            >
              <Upload className="h-3 w-3 mr-1" />
              Import
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportDocuments}
              accept=".md,.markdown,.txt,.zip"
              multiple
              className="hidden"
              aria-label="Import documents"
              title="Import documents"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportDocuments}
              className="flex-1 h-6 text-xs"
            >
              <Download className="h-3 w-3 mr-1" />
              Export
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowIntegrityDialog(true)}
            className="h-6 text-xs w-full"
          >
            <Shield className="h-3 w-3 mr-1" />
            Check Vault Integrity
          </Button>
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

        {showTokenCounterDialog && (
          <CompositionComposer
            isOpen={showTokenCounterDialog}
            onClose={() => setShowTokenCounterDialog(false)}
            documents={selectedDocuments}
          />
        )}

        {showTemplateDialog && (
          <TemplateDialog
            open={showTemplateDialog}
            onOpenChange={setShowTemplateDialog}
            folderId={selectedFolderId}
            templateDirectory="templates"
          />
        )}

        <VaultIntegrityDialog
          open={showIntegrityDialog}
          onOpenChange={setShowIntegrityDialog}
          onComplete={() => {
            // Reload documents and folders after integrity check
            useDocumentStore.getState().loadData();
          }}
        />

        <FilterDialog
          open={showFilterDialog}
          onOpenChange={setShowFilterDialog}
          onFilterChange={handleFilterChange}
        />

        {selectedPath && (
          <div className="border-t">
            <DirectoryView
              path={selectedPath}
              onFileSelect={(path, isDirectory) => onFileSelect(path, isDirectory)}
              className="h-[300px]"
            />
          </div>
        )}
      </div>
    </DocumentNavigationContext.Provider>
  );
} 