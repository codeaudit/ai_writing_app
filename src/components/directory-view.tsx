import { useEffect, useState, createContext } from 'react';
import { useDocumentStore } from '@/lib/store';
import { ChevronRight, ChevronDown, LayoutGrid, List as ListIcon, Columns as ColumnsIcon, Image as GalleryIcon, MoreVertical, SortAsc, SortDesc, AlignLeft, AlignCenter, AlignRight, SlidersHorizontal, Eye, EyeOff, FolderPlus, FileText, MoreHorizontal, Pencil, History, Layers, FolderInput, Trash, FolderClosed, FolderOpen, FileOutput, Copy, File as FileIcon, Folder as FolderIcon, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { useToast } from "@/components/ui/use-toast";
import { VersionHistory } from "./version-history";
import { TemplateDialog } from "./template-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { format } from 'date-fns';
import * as filesizeLib from 'filesize';
import { Label } from "@/components/ui/label";
import { 
  SpecialDirectoryType, 
  getSpecialDirectoryType, 
  isSpecialDirectory,
  isDirectoryProtected,
  SPECIAL_DIRECTORIES
} from "@/lib/special-directories";
import { Folder as FolderType } from "@/lib/store";
const fileSizeFormat = filesizeLib.filesize;

interface FileItem {
  name: string;
  type: 'file' | 'directory';
  path: string;
  children?: FileItem[];
  modified: Date;
  extension?: string;
  size?: number;
  modifiedAt?: string;
  metadata?: {
    lastModified?: string;
    versions?: number;
    itemCount?: number;
  };
}

interface DirectoryViewProps {
  path: string;
  onFileSelect: (path: string, isDirectory: boolean) => void;
  className?: string;
  onCompareDocuments?: (doc1Id: string, doc2Id: string) => void;
}

type ViewMode = 'list' | 'grid' | 'columns' | 'gallery';
type SortOption = 'name' | 'type' | 'date' | 'size';
type SortDirection = 'asc' | 'desc';
type LabelAlignment = 'left' | 'center' | 'right';

// Create a context for the DirectoryView operations
interface DirectoryViewContextProps {
  onCompareDocuments?: (doc1Id: string, doc2Id: string) => void;
}

const DirectoryViewContext = createContext<DirectoryViewContextProps>({});

export function DirectoryView({ path, onFileSelect, onCompareDocuments, className }: DirectoryViewProps) {
  const [items, setItems] = useState<FileItem[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortOption, setSortOption] = useState<SortOption>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [iconSize, setIconSize] = useState(48);
  const [labelAlignment, setLabelAlignment] = useState<LabelAlignment>('center');
  const [showAlternatingRows, setShowAlternatingRows] = useState(true);
  const [showMetadata, setShowMetadata] = useState(true);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const { toast } = useToast();
  
  // States for operations
  const [isCreatingDocument, setIsCreatingDocument] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [documentForVersionHistory, setDocumentForVersionHistory] = useState<string | null>(null);
  // Add rename states
  const [isRenaming, setIsRenaming] = useState(false);
  const [itemToRename, setItemToRename] = useState<FileItem | null>(null);
  const [newName, setNewName] = useState("");
  // Add move states
  const [isMoving, setIsMoving] = useState(false);
  const [itemToMove, setItemToMove] = useState<FileItem | null>(null);
  const [targetFolder, setTargetFolder] = useState<string>("");
  const [availableFolders, setAvailableFolders] = useState<string[]>([]);
  
  const [trashFolderId, setTrashFolderId] = useState<string | null>(null);
  
  const { 
    documents,
    folders,
    addDocument,
    updateDocument,
    deleteDocument,
    deleteMultipleDocuments,
    toggleComparisonDocument,
    clearComparisonDocuments,
    addFolder,
    deleteFolder,
    moveDocument,
    moveFolder,
    copyFolder,
    renameDocument,
    renameFolder,
    specialDirectoryIds
  } = useDocumentStore();

  // Load directory contents when path, documents, or folders change
  useEffect(() => {
    loadDirectoryContents();
  }, [path, documents, folders]);

  // Use special directories info in useEffect for checking trash folder
  useEffect(() => {
    // Check if we have special directory IDs in the store
    const trashId = specialDirectoryIds?.[SpecialDirectoryType.TRASH] || null;
    
    if (trashId) {
      console.log("Found trash folder from special directories:", trashId);
      setTrashFolderId(trashId);
    } else {
      // Legacy fallback
      console.log("Folders state updated, current folders:", folders.map(f => ({ id: f.id, name: f.name, parentId: f.parentId })));
      console.log("Current path:", path);
      console.log("Current trashFolderId:", trashFolderId);
      
      // Force check for trash folder on every folder update
      const trashFolder = folders.find(folder => 
        folder.name.toLowerCase() === "trash" && (folder.parentId === "/" || folder.parentId === null)
      );
      
      if (trashFolder) {
        console.log("Found trash folder:", trashFolder);
        if (trashFolderId !== trashFolder.id) {
          console.log("Updating trashFolderId from", trashFolderId, "to", trashFolder.id);
          setTrashFolderId(trashFolder.id);
        }
      } else {
        console.log("No trash folder found in folders list");
        
        // Check if we need to create a trash folder
        if (!trashFolderId) {
          console.log("Creating trash folder since none exists");
          createTrashFolder();
        }
      }
    }
  }, [folders, specialDirectoryIds]);

  const loadDirectoryContents = () => {
    try {
      // Get all documents in the current folder
      const folderDocuments = documents.filter(doc => doc.folderId === path);
      
      // Get all subfolders
      const subFolders = folders.filter(f => f.parentId === path);
      
      // Create document items
      const documentItems = folderDocuments.map(doc => ({
        name: doc.name,
        type: 'file' as const,
        path: doc.id,
        modified: new Date(doc.updatedAt),
        extension: doc.name.split('.').pop() || '',
        size: doc.content?.length || 0,
        metadata: {
          lastModified: new Date(doc.updatedAt).toLocaleString(),
          versions: doc.versions?.length || 0
        },
        children: undefined
      }));
      
      // Create folder items
      const folderItems = subFolders.map(folder => ({
        name: folder.name,
        type: 'directory' as const,
        path: folder.id,
        modified: new Date(folder.createdAt),
        size: 0,
        metadata: {
          itemCount: documents.filter(doc => doc.folderId === folder.id).length
        },
        children: undefined
      }));
      
      // Combine and sort items (folders first, then documents)
      const sortedItems = [...folderItems, ...documentItems].sort((a, b) => {
        if (a.type === b.type) {
          return a.name.localeCompare(b.name);
        }
        return a.type === 'directory' ? -1 : 1;
      });
      
      console.log(`Directory contents loaded: ${sortedItems.length} items (${folderItems.length} folders, ${documentItems.length} documents)`);
      
      // Update state with fresh data
      setItems(sortedItems);
    } catch (error) {
      console.error("Error loading directory contents:", error);
      toast({
        variant: "destructive",
        title: "Error loading contents",
        description: "Failed to load directory contents. Please try again."
      });
      setItems([]); // Set empty array in case of error
    }
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

  const handleItemClick = (itemPath: string, isDirectory: boolean) => {
    setSelectedPath(itemPath);
    if (isDirectory) {
      toggleDirectory(itemPath);
    }
    onFileSelect(itemPath, isDirectory);
  };

  const sortItems = (items: FileItem[]) => {
    return [...items].sort((a, b) => {
      let comparison = 0;
      switch (sortOption) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'date':
          comparison = (a.modified?.getTime() || 0) - (b.modified?.getTime() || 0);
          break;
        case 'size':
          comparison = (a.metadata?.itemCount || 0) - (b.metadata?.itemCount || 0);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedFilteredItems = sortItems(filteredItems);

  // Add function to get appropriate icon for a folder
  const getFolderIcon = (item: FileItem) => {
    // Check if this is a directory first
    if (item.type !== 'directory') {
      return <FileIcon className="h-5 w-5 text-blue-500" />;
    }
    
    // Find the corresponding folder
    const folder = folders.find(f => f.id === item.path);
    
    if (!folder) {
      return <FolderIcon className="h-5 w-5 text-yellow-500" />;
    }
    
    // Cast the folder to include a createdAt date if not present (just for type compatibility)
    const folderWithDate: FolderType = folder.createdAt 
      ? folder as FolderType 
      : { ...folder, createdAt: new Date() } as FolderType;
    
    // Check if it's a special directory
    const specialDirType = getSpecialDirectoryType(folderWithDate);
    
    if (specialDirType) {
      const iconName = SPECIAL_DIRECTORIES[specialDirType].icon;
      
      // Return appropriate icon
      switch (iconName) {
        case 'trash':
          return <Trash className="h-5 w-5 text-red-500" />;
        case 'settings':
          return <Settings className="h-5 w-5 text-blue-500" />;
        case 'file-text':
          return <FileIcon className="h-5 w-5 text-amber-500" />;
        case 'layers':
          return <Layers className="h-5 w-5 text-violet-500" />;
        default:
          return <FolderIcon className="h-5 w-5 text-yellow-500" />;
      }
    }
    
    // Default folder icon
    return <FolderIcon className="h-5 w-5 text-yellow-500" />;
  };

  // Update renderItem function to use special directory icons
  const renderItem = (item: FileItem, level: number = 0) => {
    const isDirectory = item.type === 'directory';
    const isExpanded = expandedDirs.has(item.path);
    const isSelected = selectedPath === item.path;

    // Check if this is a special directory
    let isSpecialDir = false;
    let isProtectedDir = false;
    
    if (isDirectory) {
      // Find the corresponding folder
      const folder = folders.find(f => f.id === item.path);
      
      if (folder) {
        // Cast the folder to include a createdAt date if not present
        const folderWithDate: FolderType = folder.createdAt 
          ? folder as FolderType 
          : { ...folder, createdAt: new Date() } as FolderType;
        
        isSpecialDir = isSpecialDirectory(folderWithDate);
        isProtectedDir = isDirectoryProtected(folderWithDate);
      }
    }

    return (
      <div key={item.path}>
        <div
          className={cn(
            "flex items-center gap-2 p-2 rounded-md hover:bg-accent cursor-pointer",
            isSelected && "bg-accent",
            showAlternatingRows && "even:bg-accent/20",
            isSpecialDir && "font-medium", // Highlight special directories
            className
          )}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
          onClick={() => handleItemClick(item.path, item.type === 'directory')}
        >
          {isDirectory ? (
            <>
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              {getFolderIcon(item)}
            </>
          ) : (
            <FileIcon className="h-5 w-5 text-blue-500" />
          )}
          <div className={cn(
            "flex-1 min-w-0",
            labelAlignment === 'left' && "text-left",
            labelAlignment === 'right' && "text-right"
          )}>
            <div className="truncate text-sm font-medium">{item.name}</div>
            {showMetadata && item.metadata && (
              <div className="text-xs text-muted-foreground">
                {Object.entries(item.metadata).map(([key, value]) => (
                  <span key={key} className="mr-2">{key}: {value}</span>
                ))}
              </div>
            )}
          </div>
        </div>
        {isDirectory && isExpanded && item.children && (
          <div>
            {item.children.map((child: FileItem) => renderItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const handleSelectPath = (itemPath: string, isDirectory: boolean) => {
    setSelectedPath(itemPath);
    onFileSelect(itemPath, isDirectory);
  };

  // Fix getAllFolders function to use in-memory data instead of API calls
  const getAllFolders = (): string[] => {
    try {
      // Return folder IDs directly from the store's folders data
      return folders.map(folder => folder.id);
    } catch (error) {
      console.error('Error getting folders:', error);
      return [];
    }
  };

  // Add a dedicated function to create trash folder
  const createTrashFolder = async () => {
    try {
      console.log("Creating trash folder...");
      await addFolder("Trash", null);
      console.log("Trash folder creation initiated");
    } catch (error) {
      console.error("Error creating trash folder:", error);
    }
  };

  // Optimized move to trash function to prevent excessive refreshes
  const moveToTrash = async (item: FileItem) => {
    if (!trashFolderId) {
      toast({
        variant: "destructive",
        title: "Trash unavailable",
        description: "Trash folder not found. Please refresh the page."
      });
      return;
    }
    
    try {
      // Get the document or folder object to check if it's already in trash
      let isInTrash = false;
      
      if (item.type === 'file') {
        const doc = documents.find(d => d.id === item.path);
        isInTrash = doc?.folderId === trashFolderId;
        
        if (isInTrash) {
          // If already in trash, delete permanently
          await deleteDocument(item.path);
          toast({
            title: "Document deleted",
            description: "The document has been permanently deleted."
          });
        } else {
          // Otherwise move to trash
          await moveDocument(item.path, trashFolderId);
          toast({
            title: "Item moved to trash",
            description: `${item.name} has been moved to trash.`
          });
        }
      } else {
        const folder = folders.find(f => f.id === item.path);
        isInTrash = folder?.parentId === trashFolderId;
        
        if (isInTrash) {
          // If already in trash, delete permanently
          await deleteFolder(item.path);
          toast({
            title: "Folder deleted",
            description: "The folder has been permanently deleted."
          });
        } else {
          // Otherwise move to trash
          await moveFolder(item.path, trashFolderId);
          toast({
            title: "Item moved to trash",
            description: `${item.name} has been moved to trash.`
          });
        }
      }
      
      // The store update will trigger the useEffect dependency on documents/folders
      // so we don't need to manually force a refresh here
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to process item",
        description: error instanceof Error ? error.message : "An unknown error occurred"
      });
    }
  };

  // Optimized empty trash function to prevent excessive refreshes
  const emptyTrash = async () => {
    if (!trashFolderId) return;
    
    const confirmEmpty = window.confirm("Are you sure you want to permanently delete all items in the trash? This action cannot be undone.");
    if (!confirmEmpty) return;
    
    try {
      // Get all documents in trash
      const trashDocuments = documents.filter(doc => doc.folderId === trashFolderId);
      
      // Get all folders in trash (direct children only)
      const trashFolders = folders.filter(folder => folder.parentId === trashFolderId);
      
      // Delete all documents in trash
      for (const doc of trashDocuments) {
        await deleteDocument(doc.id);
      }
      
      // Delete all folders in trash
      for (const folder of trashFolders) {
        await deleteFolder(folder.id);
      }
      
      toast({
        title: "Trash emptied",
        description: "All items in trash have been permanently deleted."
      });
      
      // The store update will trigger the useEffect dependency on documents/folders
      // so we don't need to manually force a refresh here
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to empty trash",
        description: error instanceof Error ? error.message : "An unknown error occurred"
      });
    }
  };

  // Update FileDropdownMenu to check if document is in a protected directory
  function FileDropdownMenu({ item }: { item: FileItem }) {
    const documentId = item.type === 'file' ? item.path : null;
    // Check if the file is in the trash folder
    const isInTrash = documentId ? documents.find(d => d.id === documentId)?.folderId === trashFolderId : false;
    
    // Check if the document is in a protected directory
    const isInProtectedDirectory = () => {
      if (!documentId) return false;
      
      // Get the document and its folder
      const doc = documents.find(d => d.id === documentId);
      if (!doc || !doc.folderId) return false;
      
      // Find the folder
      const folder = folders.find(f => f.id === doc.folderId);
      if (!folder) return false;
      
      // Create a folder with date for type checking
      const folderWithDate: FolderType = folder.createdAt 
        ? folder as FolderType 
        : { ...folder, createdAt: new Date() } as FolderType;
      
      // Check if folder is protected
      return isDirectoryProtected(folderWithDate);
    };
    
    const isProtected = isInProtectedDirectory();
    
    const handleRename = () => {
      // Set the item to rename and its current name
      setItemToRename(item);
      setNewName(item.name);
      setIsRenaming(true);
    };
    
    const handleViewVersionHistory = () => {
      if (documentId) {
        setDocumentForVersionHistory(documentId);
        setShowVersionHistory(true);
      }
    };
    
    const handleToggleComparison = () => {
      if (documentId && toggleComparisonDocument) {
        toggleComparisonDocument(documentId);
      }
    };
    
    const handleMove = () => {
      // Set the item to move
      setItemToMove(item);
      
      // Get available folders for moving
      try {
        const folderList = getAllFolders();
        setAvailableFolders(folderList);
        setTargetFolder(path || ''); // Default to current folder
        setIsMoving(true);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Failed to get folders",
          description: error instanceof Error ? error.message : "An unknown error occurred"
        });
      }
    };
    
    const handleMoveToTrash = async () => {
      if (!documentId) return;
      
      // Prevent trashing documents in protected directories
      if (isProtected) {
        toast({
          variant: "destructive",
          title: "Cannot move to trash",
          description: "This document is in a protected system directory and cannot be moved to trash."
        });
        return;
      }
      
      await moveToTrash(item);
    };

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleRename}>
            <Pencil className="mr-2 h-4 w-4" />
            <span>Rename</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleViewVersionHistory}>
            <History className="mr-2 h-4 w-4" />
            <span>Version History</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleToggleComparison}>
            <Layers className="mr-2 h-4 w-4" />
            <span>Compare</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleMove}>
            <FolderInput className="mr-2 h-4 w-4" />
            <span>Move</span>
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={handleMoveToTrash}
            className={isProtected ? "text-muted-foreground" : "text-destructive"}
            disabled={isProtected}
          >
            <Trash className="mr-2 h-4 w-4" />
            <span>{isInTrash ? "Delete Permanently" : "Move to Trash"}</span>
            {isProtected && <span className="text-xs ml-2">(Protected)</span>}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Update FolderDropdownMenu to check if folder is protected
  function FolderDropdownMenu({ item }: { item: FileItem }) {
    const folderId = item.type === 'directory' ? item.path : null;
    
    // Get the actual folder object
    const folder = folderId ? folders.find(f => f.id === folderId) : null;
    
    // Check if this is a special directory
    let isSpecialDir = false;
    let isProtectedDir = false;
    
    if (folder) {
      // Cast the folder to include a createdAt date if not present
      const folderWithDate: FolderType = folder.createdAt 
        ? folder as FolderType 
        : { ...folder, createdAt: new Date() } as FolderType;
      
      isSpecialDir = isSpecialDirectory(folderWithDate);
      isProtectedDir = isDirectoryProtected(folderWithDate);
    }
    
    // Check if the folder is the trash folder itself
    const isTrashFolder = folderId === trashFolderId;
    // Check if the folder is in the trash folder
    const isInTrash = folderId ? folders.find(f => f.id === folderId)?.parentId === trashFolderId : false;
    
    const handleRename = () => {
      if (isProtectedDir && !isTrashFolder) {
        toast({
          variant: "destructive",
          title: "Cannot rename protected directory",
          description: "This is a system directory and cannot be renamed."
        });
        return;
      }
      
      // Continue with existing rename code
      setItemToRename(item);
      setNewName(item.name);
      setIsRenaming(true);
    };
    
    const handleNewDocument = () => {
      if (folderId) {
        setNewItemName("");
        setIsCreatingDocument(true);
      }
    };
    
    const handleNewFromTemplate = () => {
      if (folderId) {
        setShowTemplateDialog(true);
      }
    };
    
    const handleNewFolder = () => {
      if (folderId) {
        setNewItemName("");
        setIsCreatingFolder(true);
      }
    };
    
    const handleCopyDirectory = async () => {
      if (!folderId || isTrashFolder) return;
      
      try {
        await copyFolder(folderId);
        toast({
          title: "Directory copied",
          description: "The directory has been copied successfully."
        });
        
        // The store update will trigger the useEffect dependency on folders
        // so we don't need to manually force a refresh here
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Failed to copy directory",
          description: error instanceof Error ? error.message : "An unknown error occurred"
        });
      }
    };
    
    const handleMove = () => {
      if (isTrashFolder) {
        toast({
          variant: "destructive",
          title: "Cannot move Trash",
          description: "The Trash folder cannot be moved."
        });
        return;
      }
      
      // Set the item to move
      setItemToMove(item);
      
      // Get available folders for moving
      try {
        const folderList = getAllFolders();
        // Filter out current folder and its subfolders to prevent circular references
        const filteredFolders = folderList.filter((folder: string) => 
          !folder.startsWith(item.path) && folder !== item.path
        );
        setAvailableFolders(filteredFolders);
        setTargetFolder(path || ''); // Default to current folder
        setIsMoving(true);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Failed to get folders",
          description: error instanceof Error ? error.message : "An unknown error occurred"
        });
      }
    };
    
    const handleEmptyTrash = async () => {
      if (isTrashFolder) {
        await emptyTrash();
      }
    };
    
    const handleMoveToTrash = async () => {
      if (!folderId) return;
      
      // Check if folder is protected
      if (isProtectedDir) {
        toast({
          variant: "destructive",
          title: "Cannot delete protected directory",
          description: "This is a system directory and cannot be deleted."
        });
        return;
      }
      
      await moveToTrash(item);
    };

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {!isTrashFolder && (
            <>
              <DropdownMenuItem onClick={handleRename}>
                <Pencil className="mr-2 h-4 w-4" />
                <span>Rename</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleNewDocument}>
                <FileText className="mr-2 h-4 w-4" />
                <span>New Document</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleNewFromTemplate}>
                <FileOutput className="mr-2 h-4 w-4" />
                <span>New from Template</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleNewFolder}>
                <FolderPlus className="mr-2 h-4 w-4" />
                <span>New Folder</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyDirectory}>
                <Copy className="mr-2 h-4 w-4" />
                <span>Copy Directory</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleMove}>
                <FolderInput className="mr-2 h-4 w-4" />
                <span>Move</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleMoveToTrash}>
                <Trash className="mr-2 h-4 w-4" />
                <span>{isInTrash ? "Delete Permanently" : "Move to Trash"}</span>
              </DropdownMenuItem>
            </>
          )}
          
          {isTrashFolder && (
            <DropdownMenuItem onClick={handleEmptyTrash}>
              <Trash className="mr-2 h-4 w-4" />
              <span>Empty Trash</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Optimized submitRename to prevent excessive refreshes
  const submitRename = async () => {
    if (!itemToRename || !newName.trim() || newName === itemToRename.name) {
      // Cancel if no item or no change
      setIsRenaming(false);
      setItemToRename(null);
      return;
    }

    try {
      if (itemToRename.type === 'file') {
        await renameDocument(itemToRename.path, newName.trim());
        toast({
          title: "Document renamed",
          description: `Successfully renamed document to "${newName.trim()}"`
        });
      } else {
        await renameFolder(itemToRename.path, newName.trim());
        toast({
          title: "Folder renamed",
          description: `Successfully renamed folder to "${newName.trim()}"`
        });
      }
      
      // Reset state
      setIsRenaming(false);
      setItemToRename(null);
      setNewName("");
      
      // The store update will trigger the useEffect dependency on documents/folders
      // so we don't need to manually force a refresh here
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to rename",
        description: error instanceof Error ? error.message : "An unknown error occurred"
      });
    }
  };

  // Optimized submitMove to prevent excessive refreshes
  const submitMove = async () => {
    if (!itemToMove || !targetFolder) {
      setIsMoving(false);
      setItemToMove(null);
      return;
    }

    try {
      if (itemToMove.type === 'file') {
        await moveDocument(itemToMove.path, targetFolder);
        toast({
          title: "Document moved",
          description: `Successfully moved document to destination folder`
        });
      } else {
        await moveFolder(itemToMove.path, targetFolder);
        toast({
          title: "Folder moved",
          description: `Successfully moved folder to destination folder`
        });
      }
      
      // Reset state
      setIsMoving(false);
      setItemToMove(null);
      setTargetFolder("");
      
      // The store update will trigger the useEffect dependency on documents/folders
      // so we don't need to manually force a refresh here
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to move",
        description: error instanceof Error ? error.message : "An unknown error occurred"
      });
    }
  };

  const renderListView = () => {
    return (
      <div className="space-y-1 py-2">
        {filteredItems.map((item, index) => {
          const isSelected = selectedPath === item.path;
          const isExpanded = item.type === 'directory' && expandedDirs.has(item.path);
          
          return (
            <div
              key={item.path}
              className={cn(
                "flex items-center px-2 py-1 hover:bg-accent/50 rounded-md cursor-pointer group",
                isSelected && "bg-accent",
                showAlternatingRows && index % 2 === 0 && "bg-muted/30"
              )}
            >
              <div className="flex-grow flex items-center" onClick={() => handleSelectPath(item.path, item.type === 'directory')}>
                <div className="mr-2">
                  {item.type === 'directory' ? (
                    isExpanded ? <FolderOpen className="text-yellow-500" /> : <FolderClosed className="text-yellow-500" />
                  ) : (
                    <FileText className="text-blue-500" />
                  )}
                </div>
                <div className="flex-grow">
                  <div className="font-medium">{item.name}</div>
                  {showMetadata && (
                    <div className="text-sm text-muted-foreground flex gap-4">
                      <span>{item.type === 'directory' ? 'Folder' : item.extension}</span>
                      <span>{item.modified ? format(item.modified, 'MMM d, yyyy') : 'Unknown date'}</span>
                      {item.type === 'file' && <span>{fileSizeFormat(item.size || 0)}</span>}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Add dropdown menus */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                {item.type === 'directory' ? (
                  <FolderDropdownMenu item={item} />
                ) : (
                  <FileDropdownMenu item={item} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderGridView = () => {
    // Apply the same filtering as in the list view
    const filteredItems = items
      .filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => {
        // Apply the same sorting as in sortItems function
        if (a.type === 'directory' && b.type === 'file') return -1;
        if (a.type === 'file' && b.type === 'directory') return 1;
        
        switch (sortOption) {
          case 'name':
            return sortDirection === 'asc' 
              ? a.name.localeCompare(b.name)
              : b.name.localeCompare(a.name);
          case 'date':
            const dateA = a.modified ? a.modified.getTime() : 0;
            const dateB = b.modified ? b.modified.getTime() : 0;
            return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
          case 'size':
            const sizeA = a.size || 0;
            const sizeB = b.size || 0;
            return sortDirection === 'asc' ? sizeA - sizeB : sizeB - sizeA;
          default:
            return 0;
        }
      });
    
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 p-4 pb-20">
        {filteredItems.map((item: FileItem) => (
          <Card
            key={item.path}
            className={cn(
              "flex flex-col items-center justify-center p-4 cursor-pointer h-[200px] relative",
              selectedPath === item.path && "border-primary"
            )}
            onClick={() => handleItemClick(item.path, item.type === 'directory')}
          >
            <div className="absolute top-2 right-2 z-10">
              {item.type === 'file' ? (
                <FileDropdownMenu item={item} />
              ) : (
                <FolderDropdownMenu item={item} />
              )}
            </div>
            
            {item.type === 'directory' ? (
              <FolderIcon className={cn("h-12 w-12 mb-2", selectedPath === item.path && "text-primary")} />
            ) : (
              <FileText className={cn("h-12 w-12 mb-2", selectedPath === item.path && "text-primary")} />
            )}
            
            <div className="text-center mt-2">
              <div className="font-medium truncate max-w-[150px]">{item.name}</div>
              {showMetadata && (
                <div className="text-xs text-muted-foreground mt-1">
                  {item.modified && format(item.modified, 'MMM d, yyyy')}
                </div>
              )}
              {showMetadata && item.type === 'file' && item.size && (
                <div className="text-xs text-muted-foreground">
                  {fileSizeFormat(item.size)}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <DirectoryViewContext.Provider value={{ onCompareDocuments }}>
      <div className={cn("flex flex-col h-full", className)}>
        <div className="flex items-center gap-2 p-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex-1">
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8"
            />
          </div>
          <Select value={sortOption} onValueChange={(value: SortOption) => setSortOption(value)}>
            <SelectTrigger className="h-8 w-[120px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="type">Type</SelectItem>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="size">Size</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="h-8 w-8"
          >
            {sortDirection === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => setViewMode('list')}>
                <ListIcon className="h-4 w-4 mr-2" />
                List View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setViewMode('grid')}>
                <LayoutGrid className="h-4 w-4 mr-2" />
                Grid View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setViewMode('columns')}>
                <ColumnsIcon className="h-4 w-4 mr-2" />
                Columns View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setViewMode('gallery')}>
                <GalleryIcon className="h-4 w-4 mr-2" />
                Gallery View
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowAlternatingRows(!showAlternatingRows)}>
                <div className="flex items-center">
                  <div className="h-4 w-4 mr-2 border rounded" />
                  Alternating Rows
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowMetadata(!showMetadata)}>
                {showMetadata ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
                Show Metadata
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowQuickActions(!showQuickActions)}>
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Quick Actions
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5">
                <div className="text-sm font-medium mb-2">Icon Size</div>
                <Slider
                  value={[iconSize]}
                  onValueChange={([value]) => setIconSize(value)}
                  min={24}
                  max={96}
                  step={8}
                  className="w-full"
                />
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setLabelAlignment('left')}>
                <AlignLeft className="h-4 w-4 mr-2" />
                Left Align Labels
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLabelAlignment('center')}>
                <AlignCenter className="h-4 w-4 mr-2" />
                Center Labels
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLabelAlignment('right')}>
                <AlignRight className="h-4 w-4 mr-2" />
                Right Align Labels
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <ScrollArea className="flex-1">
          <div className={cn(
            "p-4",
            viewMode === 'list' && "space-y-1",
            viewMode === 'grid' && "grid gap-4",
            viewMode === 'gallery' && "grid grid-cols-3 gap-6",
            viewMode === 'columns' && "grid grid-cols-3 gap-4"
          )}>
            {viewMode === 'list' && renderListView()}
            {viewMode === 'grid' && renderGridView()}
            {viewMode === 'columns' && (
              <div className="flex gap-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="flex-1">
                    {filteredItems.map(item => renderItem(item, index))}
                  </div>
                ))}
              </div>
            )}
            {viewMode === 'gallery' && filteredItems.map(item => renderItem(item))}
          </div>
        </ScrollArea>
      </div>
      
      {/* Add dialogs */}
      {showVersionHistory && documentForVersionHistory && (
        <Dialog open={showVersionHistory} onOpenChange={setShowVersionHistory}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Version History</DialogTitle>
            </DialogHeader>
            <VersionHistory 
              documentId={documentForVersionHistory} 
              onClose={() => setShowVersionHistory(false)} 
            />
          </DialogContent>
        </Dialog>
      )}
      
      {showTemplateDialog && (
        <TemplateDialog 
          open={showTemplateDialog} 
          onOpenChange={setShowTemplateDialog}
        />
      )}
      
      {/* Add rename dialog */}
      {isRenaming && itemToRename && (
        <Dialog open={isRenaming} onOpenChange={setIsRenaming}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Rename {itemToRename.type === 'file' ? 'Document' : 'Folder'}</DialogTitle>
            </DialogHeader>
            <div className="flex items-center space-y-2">
              <Input
                id="name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitRename();
                  if (e.key === 'Escape') setIsRenaming(false);
                }}
                className="flex-1"
                autoFocus
              />
            </div>
            <DialogFooter className="sm:justify-start">
              <Button type="button" variant="secondary" onClick={() => setIsRenaming(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={submitRename}>
                Rename
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Move dialog */}
      {isMoving && itemToMove && (
        <Dialog open={isMoving} onOpenChange={setIsMoving}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Move {itemToMove.type === 'file' ? 'Document' : 'Folder'}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col space-y-4">
              <Label htmlFor="target-folder">Select destination folder:</Label>
              <Select value={targetFolder} onValueChange={setTargetFolder}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a folder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="/">Root</SelectItem>
                  {availableFolders.map((folder) => (
                    <SelectItem key={folder} value={folder}>
                      {folder === "" ? "Root" : folder}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="sm:justify-start">
              <Button type="button" variant="secondary" onClick={() => setIsMoving(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={submitMove}>
                Move
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </DirectoryViewContext.Provider>
  );
} 