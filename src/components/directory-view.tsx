import { useEffect, useState, createContext } from 'react';
import { useDocumentStore } from '@/lib/store';
import { ChevronRight, ChevronDown, LayoutGrid, List as ListIcon, Columns as ColumnsIcon, Image as GalleryIcon, MoreVertical, SortAsc, SortDesc, AlignLeft, AlignCenter, AlignRight, SlidersHorizontal, Eye, EyeOff, FolderPlus, FileText, MoreHorizontal, Pencil, History, Layers, FolderInput, Trash, FolderClosed, FolderOpen, FileOutput, Copy, File as FileIcon, Folder as FolderIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
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
} from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { format } from 'date-fns';
import * as filesizeLib from 'filesize';
const fileSizeFormat = filesizeLib.filesize;

interface FileItem {
  name: string;
  type: 'file' | 'directory';
  path: string;
  children?: FileItem[];
  modified?: Date;
  extension?: string;
  size?: number;
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
  const router = useRouter();
  
  // States for operations
  const [comparisonMode, setComparisonMode] = useState(false);
  const [isCreatingDocument, setIsCreatingDocument] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [showTokenCounterDialog, setShowTokenCounterDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [documentForVersionHistory, setDocumentForVersionHistory] = useState<string | null>(null);
  
  const { 
    documents,
    folders,
    selectedDocumentId,
    comparisonDocumentIds,
    selectedFolderId,
    selectDocument,
    selectFolder,
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
    copyFolder
  } = useDocumentStore();

  // Load directory contents when path, documents, or folders change
  useEffect(() => {
    loadDirectoryContents();
  }, [path, documents, folders]);

  const loadDirectoryContents = () => {
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
    
    setItems(sortedItems);
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

  const handleItemClick = (item: FileItem) => {
    if (item.type === 'directory') {
      toggleDirectory(item.path);
      onFileSelect(item.path, true);
    } else {
      // For documents, update both the store and URL
      selectDocument(item.path);
      router.push(`/documents/${item.path}`);
      onFileSelect(item.path, false);
    }
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

  const sortedItems = sortItems(filteredItems);

  const renderItem = (item: FileItem, level: number = 0) => {
    const isDirectory = item.type === 'directory';
    const isExpanded = expandedDirs.has(item.path);
    const isSelected = selectedPath === item.path;

    return (
      <div key={item.path}>
        <div
          className={cn(
            "flex items-center gap-2 p-2 rounded-md hover:bg-accent cursor-pointer",
            isSelected && "bg-accent",
            showAlternatingRows && "even:bg-accent/20",
            className
          )}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
          onClick={() => handleItemClick(item)}
        >
          {isDirectory ? (
            <>
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <FolderIcon className="h-5 w-5 text-yellow-500" />
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

  // Add FileDropdownMenu component
  function FileDropdownMenu({ item }: { item: FileItem }) {
    const documentId = item.type === 'file' ? item.path : null;
    const { toast } = useToast();
    
    const handleRename = () => {
      // Implement renaming logic
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
      // Implement move logic
    };
    
    const handleDelete = async () => {
      if (!documentId) return;
      
      const confirmDelete = window.confirm("Are you sure you want to delete this document?");
      if (confirmDelete) {
        try {
          await deleteDocument(documentId);
          toast({
            title: "Document deleted",
            description: "The document has been deleted successfully."
          });
        } catch (error) {
          toast({
            variant: "destructive",
            title: "Failed to delete document",
            description: error instanceof Error ? error.message : "An unknown error occurred"
          });
        }
      }
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
          <DropdownMenuItem onClick={handleDelete}>
            <Trash className="mr-2 h-4 w-4" />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Add FolderDropdownMenu component
  function FolderDropdownMenu({ item }: { item: FileItem }) {
    const folderId = item.type === 'directory' ? item.path : null;
    const { toast } = useToast();
    
    const handleRename = () => {
      // Implement renaming logic
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
      if (!folderId) return;
      
      try {
        await copyFolder(folderId);
        toast({
          title: "Directory copied",
          description: "The directory has been copied successfully."
        });
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Failed to copy directory",
          description: error instanceof Error ? error.message : "An unknown error occurred"
        });
      }
    };
    
    const handleDelete = async () => {
      if (!folderId) return;
      
      const confirmDelete = window.confirm("Are you sure you want to delete this folder and all its contents?");
      if (confirmDelete) {
        try {
          await deleteFolder(folderId);
          toast({
            title: "Folder deleted",
            description: "The folder has been deleted successfully."
          });
        } catch (error) {
          toast({
            variant: "destructive",
            title: "Failed to delete folder",
            description: error instanceof Error ? error.message : "An unknown error occurred"
          });
        }
      }
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
          <DropdownMenuItem onClick={handleDelete}>
            <Trash className="mr-2 h-4 w-4" />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

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
    return (
      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 py-4">
        {filteredItems.map((item) => {
          const isSelected = selectedPath === item.path;
          
          return (
            <Card
              key={item.path}
              className={cn(
                "p-2 flex flex-col items-center cursor-pointer group relative",
                isSelected && "bg-accent"
              )}
            >
              <div 
                className="w-full flex flex-col items-center" 
                onClick={() => handleSelectPath(item.path, item.type === 'directory')}
              >
                <div style={{ width: iconSize, height: iconSize }} className="flex items-center justify-center mb-2">
                  {item.type === 'directory' ? (
                    <FolderClosed className="w-full h-full text-yellow-500" />
                  ) : (
                    <FileText className="w-full h-full text-blue-500" />
                  )}
                </div>
                <div className={cn(
                  "text-sm font-medium truncate max-w-full",
                  labelAlignment === 'left' && "self-start",
                  labelAlignment === 'right' && "self-end",
                  labelAlignment === 'center' && "text-center"
                )}>
                  {item.name}
                </div>
                {showMetadata && (
                  <div className={cn(
                    "text-xs text-muted-foreground mt-1",
                    labelAlignment === 'left' && "self-start",
                    labelAlignment === 'right' && "self-end",
                    labelAlignment === 'center' && "text-center"
                  )}>
                    {item.type === 'file' ? fileSizeFormat(item.size || 0) : 'Folder'}
                  </div>
                )}
              </div>
              
              {/* Add dropdown menus */}
              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {item.type === 'directory' ? (
                  <FolderDropdownMenu item={item} />
                ) : (
                  <FileDropdownMenu item={item} />
                )}
              </div>
            </Card>
          );
        })}
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
    </DirectoryViewContext.Provider>
  );
} 