"use client";

import { useState, useContext, useEffect, createContext } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PlusCircle, File, Folder, Trash2, GitCompare, ChevronRight, ChevronDown, MoreVertical, FolderPlus, RefreshCw, Filter } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { FilterDialog, FilterConfig } from "./filter-dialog";
import { filterDocuments, shouldShowFolder, matchesPatterns } from "@/lib/filter-utils";
import { fuzzySearch } from "@/lib/search-utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { useTrpcDocumentStore, Document, Folder } from "@/lib/trpc-document-store";

// Create a context for the DocumentNavigation props
interface DocumentNavigationContextProps {
  onCompareDocuments?: (doc1Id: string, doc2Id: string) => void;
}

const DocumentNavigationContext = createContext<DocumentNavigationContextProps>({});

interface TrpcDocumentNavigationProps {
  onCompareDocuments?: (doc1Id: string, doc2Id: string) => void;
}

interface FolderItemProps {
  folder: Folder;
  level: number;
  comparisonMode: boolean;
  filteredDocuments: Document[];
  searchQuery: string;
  filterConfig: FilterConfig;
}

function FolderItem({ folder, level, comparisonMode, filteredDocuments, searchQuery, filterConfig }: FolderItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(folder.name);
  const [isCreatingDocument, setIsCreatingDocument] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  
  const {
    documents,
    folders,
    selectedDocumentId,
    selectedFolderId,
    comparisonDocumentIds,
    addDocument,
    addFolder,
    updateFolder,
    deleteFolder,
    selectFolder,
    moveDocument,
    moveFolder,
    toggleComparisonDocument
  } = useTrpcDocumentStore();

  const childFolders = folders.filter(f => f.parentId === folder.id);
  const folderDocuments = filteredDocuments.filter(d => d.folderId === folder.id);
  
  // Check if this folder has any visible documents
  const hasVisibleContent = folderDocuments.length > 0;
  
  // If this folder has no visible content, don't render it
  if (!hasVisibleContent && searchQuery.trim() !== '') {
    return null;
  }

  // Filter visible child folders based on search query
  const visibleChildFolders = childFolders.filter(childFolder => {
    if (!filterConfig.enabled && searchQuery === '') {
      return true;
    }
    
    if (!filterConfig.enabled && searchQuery !== '') {
      return shouldShowFolder(childFolder.id, folders, filteredDocuments);
    }
    
    if (filterConfig.enabled) {
      let folderPath = childFolder.name + '/';
      let currentFolderId = childFolder.parentId;
      
      while (currentFolderId) {
        const parent = folders.find(f => f.id === currentFolderId);
        if (!parent) break;
        folderPath = parent.name + '/' + folderPath;
        currentFolderId = parent.parentId;
      }
      
      if (!matchesPatterns(folderPath, filterConfig.patterns)) {
        return false;
      }
      
      return shouldShowFolder(childFolder.id, folders, filteredDocuments);
    }
    
    return false;
  });

  const handleRename = () => {
    if (newName.trim() && newName !== folder.name) {
      updateFolder(folder.id, newName.trim());
    }
    setIsRenaming(false);
  };

  const handleCreateDocument = async () => {
    if (newItemName.trim()) {
      const newDocId = await addDocument(newItemName.trim(), "", folder.id);
      setNewItemName("");
      setIsCreatingDocument(false);
      
      if (newDocId) {
        router.push(`/documents/${newDocId}`);
      }
    }
  };

  const handleCreateFolder = async () => {
    if (newItemName.trim()) {
      await addFolder(newItemName.trim(), folder.id);
      setNewItemName("");
      setIsCreatingFolder(false);
    }
  };

  // Check if folder is selected - simplified
  const isFolderSelected = folderDocuments.length > 0 && 
    folderDocuments.every(doc => comparisonDocumentIds.includes(doc.id));
  
  // Check if folder is partially selected
  const isPartiallySelected = folderDocuments.some(doc => comparisonDocumentIds.includes(doc.id)) && 
    !isFolderSelected;

  // Toggle all documents in a folder for comparison
  const toggleComparisonFolder = (folderId: string) => {
    // Find all documents in this folder and its subfolders
    const allDocs = findAllDocumentsInFolder(folderId);
    
    // Toggle each document's comparison state
    allDocs.forEach(doc => {
      toggleComparisonDocument(doc.id);
    });
  };

  // Recursively find all documents in a folder and its subfolders
  const findAllDocumentsInFolder = (folderId: string): Document[] => {
    // Start with documents directly in this folder
    let result = documents.filter(doc => doc.folderId === folderId);
    
    // Add documents from all subfolders
    folders
      .filter(f => f.parentId === folderId)
      .forEach(subfolder => {
        result = [...result, ...findAllDocumentsInFolder(subfolder.id)];
      });
    
    return result;
  };

  return (
    <div>
      <div 
        className={cn(
          "flex items-center gap-0.5 py-0.5 px-1 rounded-sm hover:bg-muted/50 group",
          selectedFolderId === folder.id && "bg-muted/70"
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
        
        <Folder className="h-3 w-3 text-muted-foreground ml-0.5" />
        
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
              className="h-4 w-4 opacity-0 group-hover:opacity-100 p-0"
            >
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent side="right" align="start" className="w-36">
            <DropdownMenuItem 
              onClick={() => setIsRenaming(true)}
              className="text-xs"
            >
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setIsCreatingDocument(true)}
              className="text-xs"
            >
              New Document
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setIsCreatingFolder(true)}
              className="text-xs"
            >
              New Folder
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={async () => await deleteFolder(folder.id)}
              className="text-xs text-red-500"
            >
              Delete
            </DropdownMenuItem>
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
            />
          ))}
          
          {folderDocuments.map((doc) => (
            <DocumentItem
              key={doc.id}
              document={doc}
              level={level + 1}
              filteredDocuments={filteredDocuments}
            />
          ))}
        </>
      )}
    </div>
  );
}

interface DocumentItemProps {
  document: Document;
  level: number;
  filteredDocuments?: Document[];
}

function DocumentItem({ document, level, filteredDocuments }: DocumentItemProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(document.name);
  
  const { isComparisonMode } = useContext(ComparisonModeContext);
  const {
    selectedDocumentId,
    comparisonDocumentIds,
    renameDocument,
    deleteDocument,
    selectDocument,
    toggleComparisonDocument
  } = useTrpcDocumentStore();
  
  const handleRename = async () => {
    if (newName.trim() && newName !== document.name) {
      await renameDocument(document.id, newName.trim());
    }
    setIsRenaming(false);
  };
  
  const handleToggleComparison = () => {
    toggleComparisonDocument(document.id);
  };
  
  const isSelected = selectedDocumentId === document.id;
  const isInComparison = comparisonDocumentIds.includes(document.id);
  
  const handleSelectDocument = () => {
    if (isComparisonMode) {
      handleToggleComparison();
    } else {
      selectDocument(document.id);
      // Update URL without page refresh using History API
      if (typeof window !== 'undefined') {
        window.history.pushState({}, '', `/documents/${document.id}`);
      }
    }
  };
  
  return (
    <div
      className={cn(
        "flex items-center gap-0.5 py-0.5 px-1 rounded-sm group hover:bg-muted/50",
        isSelected && "bg-muted/70"
      )}
      style={{ paddingLeft: `${level * 8 + 8}px` }}
    >
      <div className="flex items-center justify-center w-4 h-4">
        <Checkbox
          checked={isInComparison}
          className={cn(
            "transition-opacity h-3 w-3 rounded-none",
            isComparisonMode ? "opacity-100" : "opacity-0 group-hover:opacity-70"
          )}
          onCheckedChange={handleToggleComparison}
        />
      </div>
      
      <File className="h-3 w-3 text-muted-foreground mr-1" />
      
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
          onClick={handleSelectDocument}
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
        
        <DropdownMenuContent side="right" align="start" className="w-36">
          <DropdownMenuItem 
            onClick={() => setIsRenaming(true)}
            className="text-xs"
          >
            Rename
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={async () => await deleteDocument(document.id)}
            className="text-xs text-red-500"
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default function TrpcDocumentNavigation({ onCompareDocuments }: TrpcDocumentNavigationProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [filterConfig, setFilterConfig] = useState<FilterConfig>({
    enabled: false,
    patterns: ["**/*"],
  });
  
  const { isComparisonMode, setIsComparisonMode } = useContext(ComparisonModeContext);
  const {
    documents,
    folders,
    selectedFolderId,
    selectedDocumentId,
    comparisonDocumentIds,
    isLoading,
    error,
    loadData,
    addDocument,
    addFolder,
    selectDocument,
    deleteDocument,
    deleteMultipleDocuments,
    clearComparisonDocuments
  } = useTrpcDocumentStore();
  
  // Load data on component mount
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  // Filter documents based on search query
  const filteredDocuments = documents.filter(doc => {
    // If filter is enabled, apply filter patterns
    if (filterConfig.enabled) {
      const documentPath = getDocumentPath(doc, folders);
      if (!matchesPatterns(documentPath, filterConfig.patterns)) {
        return false;
      }
    }
    
    // Apply search query
    if (searchQuery.trim() !== '') {
      return fuzzySearch(searchQuery, doc.name);
    }
    
    return true;
  });
  
  // Helper function to get the full path of a document
  const getDocumentPath = (doc: Document, allFolders: Folder[]): string => {
    if (!doc.folderId) return doc.name;
    
    const path: string[] = [doc.name];
    let currentFolderId = doc.folderId;
    
    while (currentFolderId) {
      const folder = allFolders.find(f => f.id === currentFolderId);
      if (!folder) break;
      
      path.unshift(folder.name);
      currentFolderId = folder.parentId;
    }
    
    return path.join('/');
  };
  
  const createNewDocument = async () => {
    const newDocId = await addDocument("Untitled Document", "", selectedFolderId);
    if (newDocId && typeof window !== 'undefined') {
      window.history.pushState({}, '', `/documents/${newDocId}`);
    }
  };
  
  const toggleComparisonMode = () => {
    setIsComparisonMode(!isComparisonMode);
    if (isComparisonMode) {
      clearComparisonDocuments();
    }
  };
  
  const handleDeleteSelectedDocument = async () => {
    if (selectedDocumentId) {
      await deleteDocument(selectedDocumentId);
      selectDocument(null);
      router.push("/documents");
    }
  };
  
  const handleDeleteSelectedDocuments = async () => {
    if (comparisonDocumentIds.length > 0) {
      await deleteMultipleDocuments(comparisonDocumentIds);
      clearComparisonDocuments();
      setShowDeleteConfirmation(false);
    }
  };
  
  const handleCreateFolder = async () => {
    await addFolder("New Folder", selectedFolderId);
  };
  
  const handleFilterChange = (newConfig: FilterConfig) => {
    setFilterConfig(newConfig);
  };
  
  const handleRefresh = async () => {
    await loadData();
    toast({
      title: "Documents Refreshed",
      description: "Document list has been refreshed from the database.",
    });
  };
  
  // Get root folders and documents
  const rootFolders = folders.filter(f => f.parentId === null);
  const rootDocuments = filteredDocuments.filter(d => d.folderId === null);
  
  // Filter root folders to only show those that have visible documents
  const visibleRootFolders = rootFolders.filter(folder => {
    if (!filterConfig.enabled && searchQuery === '') {
      return true;
    }
    
    if (!filterConfig.enabled && searchQuery !== '') {
      return shouldShowFolder(folder.id, folders, filteredDocuments);
    }
    
    if (filterConfig.enabled) {
      // Apply filter pattern to folder
      const folderPath = folder.name + '/';
      if (!matchesPatterns(folderPath, filterConfig.patterns)) {
        return false;
      }
      
      // Check if folder has visible documents
      return shouldShowFolder(folder.id, folders, filteredDocuments);
    }
    
    return false;
  });
  
  return (
    <DocumentNavigationContext.Provider value={{ onCompareDocuments }}>
      <Card className="h-full rounded-none border-0 border-r flex flex-col">
        <div className="p-2 border-b">
          <div className="flex gap-0.5 mb-2">
            <Button
              onClick={createNewDocument}
              variant="outline"
              size="sm"
              className="h-7 text-xs flex-1 justify-start"
            >
              <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
              New Document
            </Button>
            
            <Button
              onClick={handleCreateFolder}
              variant="outline"
              size="sm"
              className="h-7 w-7 p-1"
            >
              <FolderPlus className="h-3.5 w-3.5" />
            </Button>
          </div>
          
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-7 text-xs"
          />
        </div>
        
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="p-2 text-xs text-muted-foreground">Loading...</div>
          ) : error ? (
            <div className="p-2 text-xs text-red-500">{error}</div>
          ) : (
            <div className="p-2">
              <div className="flex items-center justify-between py-1 mb-2">
                <div className="text-xs font-medium">Documents</div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleComparisonMode}
                    className={cn(
                      "h-5 w-5 p-0.5",
                      isComparisonMode && "bg-muted text-primary"
                    )}
                    title="Compare Documents"
                  >
                    <GitCompare className="h-3.5 w-3.5" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowFilterDialog(true)}
                    className={cn(
                      "h-5 w-5 p-0.5",
                      filterConfig.enabled && "bg-muted text-primary"
                    )}
                    title="Filter Documents"
                  >
                    <Filter className="h-3.5 w-3.5" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRefresh}
                    className="h-5 w-5 p-0.5"
                    title="Refresh"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              
              {isComparisonMode && comparisonDocumentIds.length > 0 && (
                <div className="flex items-center justify-between py-1 mb-2 bg-muted/50 px-2 rounded-sm">
                  <div className="text-xs">
                    {comparisonDocumentIds.length} selected
                  </div>
                  <div className="flex items-center gap-1">
                    {comparisonDocumentIds.length === 2 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (onCompareDocuments) {
                            onCompareDocuments(
                              comparisonDocumentIds[0],
                              comparisonDocumentIds[1]
                            );
                          }
                        }}
                        className="h-6 text-xs"
                      >
                        Compare
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDeleteConfirmation(true)}
                      className="h-6 text-xs text-red-500"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Root folders */}
              {visibleRootFolders.map((folder) => (
                <FolderItem
                  key={folder.id}
                  folder={folder}
                  level={0}
                  comparisonMode={isComparisonMode}
                  filteredDocuments={filteredDocuments}
                  searchQuery={searchQuery}
                  filterConfig={filterConfig}
                />
              ))}
              
              {/* Root documents */}
              {rootDocuments.map((doc) => (
                <DocumentItem
                  key={doc.id}
                  document={doc}
                  level={0}
                  filteredDocuments={filteredDocuments}
                />
              ))}
              
              {documents.length === 0 && (
                <div className="text-xs text-muted-foreground p-2">
                  No documents found. Create a new document to get started.
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
      
      {/* Dialog for confirming bulk delete */}
      <Dialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Selected Documents</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {comparisonDocumentIds.length} selected documents? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirmation(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSelectedDocuments}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Filter dialog */}
      <FilterDialog
        open={showFilterDialog}
        onOpenChange={setShowFilterDialog}
        config={filterConfig}
        onConfigChange={handleFilterChange}
      />
    </DocumentNavigationContext.Provider>
  );
} 
 