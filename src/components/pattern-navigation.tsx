"use client";

import { useState, useRef, useCallback, useContext, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PlusCircle, Settings, File, Folder, Trash2, GitCompare, History, Plus, FolderPlus, ChevronRight, ChevronDown, MoreVertical, Move, Clock } from "lucide-react";
import { usePatternStore } from "@/lib/pattern-store";
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

interface PatternNavigationProps {
  onComparePatterns?: (pattern1Id: string, pattern2Id: string) => void;
}

interface FolderItemProps {
  folder: { id: string; name: string; parentId: string | null };
  level: number;
  onComparePatterns?: (pattern1Id: string, pattern2Id: string) => void;
}

function FolderItem({ folder, level, onComparePatterns }: FolderItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(folder.name);
  const [isCreatingPattern, setIsCreatingPattern] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  
  const {
    patterns,
    folders,
    selectedFolderId,
    selectedPatternId,
    comparisonPatternIds,
    updateFolder,
    deleteFolder,
    selectFolder,
    addPattern,
    addFolder,
    movePattern,
    updatePattern,
  } = usePatternStore();

  const childFolders = folders.filter(f => f.parentId === folder.id);
  const folderPatterns = patterns.filter(d => d.folderId === folder.id);

  const handleRename = () => {
    if (newName.trim() && newName !== folder.name) {
      updateFolder(folder.id, newName.trim());
    }
    setIsRenaming(false);
  };

  const handleCreatePattern = () => {
    if (newItemName.trim()) {
      addPattern(newItemName.trim(), "", folder.id);
      setNewItemName("");
      setIsCreatingPattern(false);
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
            <DropdownMenuItem onClick={() => setIsCreatingPattern(true)}>
              New Pattern
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

      {isExpanded && (
        <>
          {isCreatingPattern && (
            <div className="flex gap-2 mt-1 mb-1 ml-8">
              <Input
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="Pattern name..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreatePattern();
                  if (e.key === 'Escape') {
                    setNewItemName("");
                    setIsCreatingPattern(false);
                  }
                }}
                className="h-7"
                autoFocus
              />
              <Button
                size="sm"
                onClick={handleCreatePattern}
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

          {childFolders.map(childFolder => (
            <FolderItem 
              key={childFolder.id} 
              folder={childFolder} 
              level={level + 1}
              onComparePatterns={onComparePatterns}
            />
          ))}
          
          {folderPatterns.map(pattern => (
            <PatternItem 
              key={pattern.id} 
              pattern={pattern} 
              level={level + 1}
              onComparePatterns={onComparePatterns}
            />
          ))}
        </>
      )}
    </div>
  );
}

interface PatternItemProps {
  pattern: { id: string; name: string };
  level: number;
  onComparePatterns?: (pattern1Id: string, pattern2Id: string) => void;
}

function PatternItem({ pattern, level, onComparePatterns }: PatternItemProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(pattern.name);
  
  const { 
    patterns, 
    folders,
    selectedPatternId, 
    comparisonPatternIds,
    selectPattern, 
    updatePattern, 
    deletePattern,
    movePattern,
    toggleComparisonPattern,
  } = usePatternStore();
  
  const { comparisonMode } = useContext(ComparisonModeContext);

  const handleRename = () => {
    if (newName.trim() && newName !== pattern.name) {
      updatePattern(pattern.id, { name: newName.trim() });
    }
    setIsRenaming(false);
  };

  const handleToggleComparison = () => {
    toggleComparisonPattern(pattern.id);
  };

  return (
    <div 
      className={cn(
        "flex items-center gap-1 py-1 px-2 rounded-md hover:bg-muted group",
        selectedPatternId === pattern.id && "bg-muted",
      )}
      style={{ paddingLeft: `${level * 12}px` }}
    >
      <div className="w-4"></div>
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
          className="flex-1 text-left text-sm truncate"
          onClick={() => selectPattern(pattern.id)}
        >
          {pattern.name}
        </button>
      )}
      
      {comparisonMode && (
        <Checkbox
          checked={comparisonPatternIds.includes(pattern.id)}
          onCheckedChange={handleToggleComparison}
          className="mr-1"
        />
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
          <DropdownMenuItem onClick={() => setIsRenaming(true)}>
            Rename
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Move className="h-4 w-4 mr-2" />
              Move to
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => movePattern(pattern.id, null)}>
                Root
              </DropdownMenuItem>
              {folders.map(folder => (
                <DropdownMenuItem 
                  key={folder.id}
                  onClick={() => movePattern(pattern.id, folder.id)}
                >
                  {folder.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => deletePattern(pattern.id)}
            className="text-destructive"
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default function PatternNavigation({ onComparePatterns }: PatternNavigationProps) {
  const router = useRouter();
  const { 
    patterns, 
    selectedPatternId, 
    comparisonPatternIds,
    addPattern, 
    selectPattern,
    deletePattern,
    toggleComparisonPattern,
    clearComparisonPatterns,
    addFolder,
    deleteFolder,
    updateFolder,
    folders,
    getPatternVersions,
    selectedFolderId,
    updatePattern,
  } = usePatternStore();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreatingPattern, setIsCreatingPattern] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: 'folder' | 'pattern' } | null>(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  
  const { comparisonMode, setComparisonMode } = useContext(ComparisonModeContext);

  const filteredPatterns = patterns.filter(pattern => 
    pattern.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const rootFolders = folders.filter(f => f.parentId === null);
  const rootPatterns = patterns.filter(p => p.folderId === null);
  
  const createNewPattern = () => {
    addPattern("New Pattern", "", selectedFolderId);
  };

  const handleCompare = () => {
    if (comparisonPatternIds.length === 2 && onComparePatterns) {
      onComparePatterns(comparisonPatternIds[0], comparisonPatternIds[1]);
      clearComparisonPatterns();
      setComparisonMode(false);
    }
  };

  const toggleComparisonMode = () => {
    if (comparisonMode) {
      clearComparisonPatterns();
    }
    setComparisonMode(!comparisonMode);
  };

  const handleDeleteSelectedPattern = () => {
    if (selectedPatternId) {
      setItemToDelete({ id: selectedPatternId, type: 'pattern' });
      setShowDeleteConfirm(true);
    }
  };

  const handleCreatePattern = () => {
    if (newItemName.trim()) {
      addPattern(newItemName.trim(), "", selectedFolderId);
      setNewItemName("");
      setIsCreatingPattern(false);
    }
  };

  const handleCreateFolder = () => {
    if (newItemName.trim()) {
      addFolder(newItemName.trim(), selectedFolderId);
      setNewItemName("");
      setIsCreatingFolder(false);
    }
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      if (itemToDelete.type === 'folder') {
        deleteFolder(itemToDelete.id);
      } else {
        deletePattern(itemToDelete.id);
      }
      setShowDeleteConfirm(false);
      setItemToDelete(null);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Patterns</h2>
        <div className="flex space-x-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={createNewPattern}
            title="New Pattern"
          >
            <PlusCircle className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleComparisonMode}
            title="Compare Patterns"
          >
            <GitCompare className="h-4 w-4" />
          </Button>
          {selectedPatternId && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowVersionHistory(true)}
                title="Version History"
              >
                <History className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDeleteSelectedPattern}
                title="Delete Pattern"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Search patterns..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {comparisonMode && (
        <div className="p-2 mb-4 bg-muted/50 rounded-md">
          <div className="text-sm mb-2">Select two patterns to compare</div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              {comparisonPatternIds.length}/2 selected
            </span>
            <Button
              size="sm"
              onClick={handleCompare}
              disabled={comparisonPatternIds.length !== 2}
            >
              Compare
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-1 mb-4">
        {isCreatingPattern && (
          <div className="flex gap-2 mb-2">
            <Input
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Pattern name..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreatePattern();
                if (e.key === 'Escape') {
                  setNewItemName("");
                  setIsCreatingPattern(false);
                }
              }}
              autoFocus
            />
            <Button onClick={handleCreatePattern}>
              Add
            </Button>
          </div>
        )}

        {isCreatingFolder && (
          <div className="flex gap-2 mb-2">
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
              autoFocus
            />
            <Button onClick={handleCreateFolder}>
              Add
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        {searchQuery ? (
          filteredPatterns.length > 0 ? (
            <div className="space-y-1">
              {filteredPatterns.map(pattern => (
                <PatternItem
                  key={pattern.id}
                  pattern={pattern}
                  level={0}
                  onComparePatterns={onComparePatterns}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No patterns found
            </div>
          )
        ) : (
          <div className="space-y-1">
            {rootFolders.length === 0 && rootPatterns.length === 0 ? (
              <div className="text-center py-8">
                <div className="mb-4 text-muted-foreground">
                  <Folder className="h-16 w-16 mx-auto" />
                </div>
                <h3 className="text-lg font-medium mb-2">No patterns yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first pattern to get started
                </p>
                <div className="flex gap-2 justify-center">
                  <Button onClick={() => setIsCreatingPattern(true)}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    New Pattern
                  </Button>
                  <Button variant="outline" onClick={() => setIsCreatingFolder(true)}>
                    <FolderPlus className="h-4 w-4 mr-2" />
                    New Folder
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {rootFolders.map(folder => (
                  <FolderItem
                    key={folder.id}
                    folder={folder}
                    level={0}
                    onComparePatterns={onComparePatterns}
                  />
                ))}
                {rootPatterns.map(pattern => (
                  <PatternItem
                    key={pattern.id}
                    pattern={pattern}
                    level={0}
                    onComparePatterns={onComparePatterns}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </div>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this {itemToDelete?.type}? This action cannot be undone.
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

      {selectedPatternId && showVersionHistory && (
        <Dialog open={showVersionHistory} onOpenChange={setShowVersionHistory}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Version History</DialogTitle>
            </DialogHeader>
            <VersionHistory 
              documentId={selectedPatternId} 
              getVersions={() => getPatternVersions(selectedPatternId)}
              onRestore={(versionId) => {
                const pattern = patterns.find(p => p.id === selectedPatternId);
                if (!pattern) return;
                
                const version = pattern.versions.find(v => v.id === versionId);
                if (!version) return;
                
                updatePattern(pattern.id, { content: version.content });
                setShowVersionHistory(false);
                
                toast({
                  title: "Version restored",
                  description: `Restored version from ${new Date(version.createdAt).toLocaleString()}`,
                });
              }}
              onClose={() => setShowVersionHistory(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
} 