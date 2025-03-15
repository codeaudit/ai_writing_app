"use client";

import { useState, useRef, useCallback, useContext, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PlusCircle, Settings, File, Folder, Trash2, GitCompare, History, Plus, FolderPlus, ChevronRight, ChevronDown, MoreVertical, Move, Clock, Upload, Download, FileText, FilePlus, MoreHorizontal, Shield } from "lucide-react";
import { useDocumentStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { VersionHistory } from "./version-history";
import { toast } from "@/components/ui/use-toast";
import { TemplateDialog } from "./template-dialog";
import { VaultIntegrityDialog } from "./vault-integrity-dialog";
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
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Document } from "@/lib/store";
import { CompositionComposer } from "./composition-composer";

interface DocumentNavigationProps {
  onCompareDocuments?: (doc1Id: string, doc2Id: string) => void;
}

interface FolderItemProps {
  folder: { id: string; name: string; parentId: string | null };
  level: number;
  comparisonMode: boolean;
}

function FolderItem({ folder, level, comparisonMode }: FolderItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(folder.name);
  const [isCreatingDocument, setIsCreatingDocument] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [showTokenCounterDialog, setShowTokenCounterDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  
  const router = useRouter();
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
          <DropdownMenuContent align="end" className="text-xs">
            <DropdownMenuItem onClick={() => setIsRenaming(true)}>
              Rename
            </DropdownMenuItem>
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
              className="text-destructive"
              onClick={() => {
                if (confirm(`Are you sure you want to delete the folder "${folder.name}" and all its contents?`)) {
                  deleteFolder(folder.id);
                }
              }}
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
          {childFolders.map((childFolder) => (
            <FolderItem
              key={childFolder.id}
              folder={childFolder}
              level={level + 1}
              comparisonMode={comparisonMode}
            />
          ))}
          
          {folderDocuments.map((doc) => (
            <DocumentItem
              key={doc.id}
              document={doc}
              level={level + 1}
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
          folderId={folder.id}
          templateDirectory="templates"
        />
      )}
    </div>
  );
}

interface DocumentItemProps {
  document: { id: string; name: string; folderId: string | null };
  level: number;
}

function DocumentItem({ document, level }: DocumentItemProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(document.name);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showTokenCounterDialog, setShowTokenCounterDialog] = useState(false);
  
  const router = useRouter();
  const {
    selectedDocumentId,
    comparisonDocumentIds,
    updateDocument,
    deleteDocument,
    deleteMultipleDocuments,
    selectDocument,
    toggleComparisonDocument,
    moveDocument,
    folders,
    documents,
  } = useDocumentStore();

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
    // Update URL to reflect the selected document
    router.push(`/documents/${document.id}`);
    toast({
      title: "Document selected",
      description: "Use the version history button in the editor to compare versions.",
    });
  }, [document.id, selectDocument, router]);

  // Handle document selection with URL update
  const handleSelectDocument = () => {
    selectDocument(document.id);
    // Update URL to reflect the selected document
    router.push(`/documents/${document.id}`);
  };

  // Document can always be selected
  const canSelect = true;

  // Get all selected documents from the store
  const selectedDocuments = documents.filter(doc => comparisonDocumentIds.includes(doc.id));

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
              onClick={() => {
                // Check if we're in comparison mode with multiple documents selected
                if (comparisonDocumentIds.length > 1 && comparisonDocumentIds.includes(document.id)) {
                  // Get names of selected documents for confirmation message
                  const selectedDocs = documents.filter(doc => comparisonDocumentIds.includes(doc.id));
                  const docCount = selectedDocs.length;
                  
                  if (confirm(`Are you sure you want to delete ${docCount} selected documents? This action cannot be undone.`)) {
                    // Delete all selected documents
                    deleteMultipleDocuments(comparisonDocumentIds);
                    toast({
                      title: "Documents deleted",
                      description: `${docCount} documents have been deleted.`,
                    });
                  }
                } else {
                  // Regular single document deletion
                  if (confirm(`Are you sure you want to delete "${document.name}"?`)) {
                    deleteDocument(document.id);
                    toast({
                      title: "Document deleted",
                      description: `"${document.name}" has been deleted.`,
                    });
                  }
                }
              }}
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

export default function DocumentNavigation({ onCompareDocuments }: DocumentNavigationProps) {
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredDocuments = documents.filter(doc => 
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const createNewDocument = () => {
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
    
    const newDocId = addDocument(
      `New Document ${documents.length + 1}`, 
      `# New Document ${documents.length + 1}\n\nStart writing here...`,
      targetFolderId
    );
    
    // Update URL to reflect the newly created document
    if (newDocId) {
      router.push(`/documents/${newDocId}`);
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
          if (!fileName.endsWith('.md') && !fileName.endsWith('.markdown') && !fileName.endsWith('.txt')) return;
          
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

  const rootFolders = folders.filter(f => f.parentId === null);
  const rootDocuments = documents.filter(d => d.folderId === null);

  // Get selected documents for token counter
  const selectedDocuments = documents.filter(doc => 
    comparisonDocumentIds.includes(doc.id)
  );

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1">
          <h2 className="text-sm font-medium">Documents</h2>
          <Button
            variant="ghost" 
            size="icon" 
            onClick={() => setIsCreatingDocument(true)}
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
            variant={comparisonMode ? "secondary" : "outline"}
            size="sm"
            onClick={toggleComparisonMode}
            className={cn("h-6 w-6 p-0", comparisonMode && "bg-primary text-primary-foreground")}
            title={comparisonMode ? "Cancel selection mode" : "Enter selection mode"}
          >
            <GitCompare className="h-3.5 w-3.5" />
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
                isCreatingDocument ? createNewDocument() : handleCreateFolder();
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
            onClick={isCreatingDocument ? createNewDocument : handleCreateFolder}
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
        {rootFolders.map((folder) => (
          <FolderItem
            key={folder.id}
            folder={folder}
            level={0}
            comparisonMode={comparisonMode}
          />
        ))}
        
        {rootDocuments.map((doc) => (
          <DocumentItem
            key={doc.id}
            document={doc}
            level={0}
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
          folderId={null}
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
    </div>
  );
} 