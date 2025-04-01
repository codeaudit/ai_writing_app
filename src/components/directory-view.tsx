import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
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
  Folder as FolderIcon,
  File,
  SortAsc,
  SortDesc,
  MoreVertical,
  ChevronRight,
  ChevronDown,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  FileCode,
  FileSpreadsheet,
  Presentation,
  AlignLeft,
  AlignCenter,
  AlignRight,
  SlidersHorizontal,
  Eye,
  EyeOff,
  LayoutGrid,
  List as ListIcon,
  Columns as ColumnsIcon,
  Image as GalleryIcon,
  Volume2,
  VolumeX,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHotkeys } from 'react-hotkeys-hook';
import { useDocumentStore } from '@/lib/store';
import { getDocumentPath } from '@/lib/filter-utils';
import type { Document, Folder } from '@/lib/store';

type ViewMode = 'list' | 'grid' | 'columns' | 'gallery';
type SortOption = 'name' | 'type' | 'date' | 'size';
type SortDirection = 'asc' | 'desc';
type LabelAlignment = 'left' | 'center' | 'right';

interface FileItem {
  name: string;
  type: 'file' | 'directory';
  path: string;
  size?: number;
  modified?: Date;
  icon?: string;
  extension?: string;
  preview?: string;
  metadata?: {
    dimensions?: string;
    duration?: string;
    pages?: number;
    [key: string]: string | number | undefined;
  };
}

interface DirectoryViewProps {
  path: string;
  onFileSelect: (path: string, isDirectory: boolean) => void;
  className?: string;
}

// Get the full path for a folder
const getFolderPath = (folder: Folder, folders: Folder[]): string => {
  const path: string[] = [folder.name];
  let currentFolderId = folder.parentId;
  
  while (currentFolderId) {
    const parentFolder = folders.find(f => f.id === currentFolderId);
    if (!parentFolder) break;
    
    path.unshift(parentFolder.name);
    currentFolderId = parentFolder.parentId;
  }
  
  return path.join('/');
};

export function DirectoryView({ path, onFileSelect, className }: DirectoryViewProps) {
  const { documents, folders, loadData } = useDocumentStore();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortOption, setSortOption] = useState<SortOption>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<FileItem[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [iconSize, setIconSize] = useState(48);
  const [labelAlignment, setLabelAlignment] = useState<LabelAlignment>('center');
  const [showAlternatingRows, setShowAlternatingRows] = useState(true);
  const [selectedItem, setSelectedItem] = useState<FileItem | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [currentColumn, setCurrentColumn] = useState(0);
  const [showMetadata, setShowMetadata] = useState(true);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [muted, setMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Load data when component mounts
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load directory contents when path changes
  useEffect(() => {
    loadDirectoryContents();
  }, [path, documents, folders]);

  // Quick Look preview with spacebar
  useHotkeys('space', (e: KeyboardEvent) => {
    if (selectedItem) {
      e.preventDefault();
      setPreviewVisible(!previewVisible);
    }
  });

  const loadDirectoryContents = async () => {
    // Get the current directory path from the path prop
    const currentPath = path || '/';

    // If the path is a folder ID, find the folder
    const currentFolder = folders.find((folder: Folder) => folder.id === currentPath);

    // Filter documents and folders based on the current folder ID
    const currentDocuments = documents.filter((doc: Document) => {
      return doc.folderId === currentFolder?.id;
    });

    const currentFolders = folders.filter((folder: Folder) => {
      return folder.parentId === currentFolder?.id;
    });

    // Convert documents and folders to FileItems
    const documentItems: FileItem[] = currentDocuments.map((doc: Document) => ({
      name: doc.name,
      type: 'file' as const,
      path: doc.id,
      modified: new Date(doc.updatedAt),
      extension: doc.name.split('.').pop() || '',
      metadata: {
        lastModified: new Date(doc.updatedAt).toLocaleString(),
        versions: doc.versions.length
      }
    }));

    const folderItems: FileItem[] = currentFolders.map((folder: Folder) => ({
      name: folder.name,
      type: 'directory' as const,
      path: folder.id,
      modified: new Date(folder.createdAt),
      metadata: {
        itemCount: documents.filter((doc: Document) => doc.folderId === folder.id).length
      }
    }));

    // Combine and sort items
    const allItems = [...documentItems, ...folderItems];
    setItems(allItems);
  };

  const toggleDirectory = (dirPath: string) => {
    const newExpanded = new Set(expandedDirs);
    if (newExpanded.has(dirPath)) {
      newExpanded.delete(dirPath);
    } else {
      newExpanded.add(dirPath);
    }
    setExpandedDirs(newExpanded);
    loadDirectoryContents();
  };

  const getFileIcon = (item: FileItem) => {
    if (item.type === 'directory') {
      return <FolderIcon className="h-5 w-5 text-yellow-500" />;
    }

    const extension = item.extension?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return <FileText className="h-5 w-5 text-red-500" />;
      case 'docx':
      case 'doc':
        return <FileText className="h-5 w-5 text-blue-500" />;
      case 'xlsx':
      case 'xls':
        return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
      case 'pptx':
      case 'ppt':
        return <Presentation className="h-5 w-5 text-orange-500" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <FileImage className="h-5 w-5 text-purple-500" />;
      case 'mp4':
      case 'mov':
      case 'avi':
        return <FileVideo className="h-5 w-5 text-pink-500" />;
      case 'mp3':
      case 'wav':
      case 'ogg':
        return <FileAudio className="h-5 w-5 text-indigo-500" />;
      case 'zip':
      case 'rar':
      case '7z':
        return <FileArchive className="h-5 w-5 text-yellow-500" />;
      case 'ts':
      case 'js':
      case 'py':
      case 'java':
      case 'cpp':
        return <FileCode className="h-5 w-5 text-blue-500" />;
      default:
        return <File className="h-5 w-5 text-gray-500" />;
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
          comparison = (a.size || 0) - (b.size || 0);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  const filteredItems = items
    .filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const sortedItems = sortItems(filteredItems);

  const handleItemClick = (item: FileItem, columnIndex?: number) => {
    setSelectedItem(item);
    if (item.type === 'directory') {
      if (columnIndex !== undefined) {
        setCurrentColumn(columnIndex + 1);
      }
      toggleDirectory(item.path);
    } else {
      onFileSelect(item.path, false);
    }
  };

  const renderIconViewItem = (item: FileItem) => (
    <div
      key={item.path}
      className={cn(
        "group relative rounded-lg transition-all duration-200",
        "flex flex-col items-center p-4 hover:bg-accent/50",
        selectedItem?.path === item.path && "bg-accent"
      )}
      onClick={() => handleItemClick(item)}
      style={{ width: iconSize * 2, height: iconSize * 2 }}
    >
      <div className="flex items-center justify-center mb-2" style={{ width: iconSize, height: iconSize }}>
        {getFileIcon(item)}
      </div>
      <div className={cn(
        "text-sm text-center",
        labelAlignment === 'left' && "text-left",
        labelAlignment === 'right' && "text-right"
      )}>
        <div className="truncate text-sm font-medium">{item.name}</div>
        {!item.type && item.extension && (
          <div className="text-xs text-muted-foreground">{item.extension.toUpperCase()}</div>
        )}
      </div>
    </div>
  );

  const renderListViewItem = (item: FileItem) => (
    <div
      key={item.path}
      className={cn(
        "group relative flex items-center gap-2 p-2 rounded-lg transition-all duration-200",
        "hover:bg-accent/50",
        selectedItem?.path === item.path && "bg-accent",
        showAlternatingRows && "even:bg-accent/20"
      )}
      onClick={() => handleItemClick(item)}
    >
      {item.type === 'directory' ? (
        <>
          {expandedDirs.has(item.path) ? 
            <ChevronDown className="h-4 w-4" /> : 
            <ChevronRight className="h-4 w-4" />
          }
          <FolderIcon className="h-5 w-5 text-yellow-500" />
        </>
      ) : (
        <div className="w-4 h-4">{getFileIcon(item)}</div>
      )}
      <div className="flex-1 min-w-0">
        <div className="truncate text-sm font-medium">{item.name}</div>
        {item.metadata && (
          <div className="text-xs text-muted-foreground">
            {Object.entries(item.metadata).map(([key, value]) => (
              <span key={key} className="mr-2">{key}: {value}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderColumnViewItem = (item: FileItem, columnIndex: number) => (
    <div
      key={item.path}
      className={cn(
        "group relative flex items-center gap-2 p-2 rounded-lg transition-all duration-200",
        "hover:bg-accent/50",
        selectedItem?.path === item.path && "bg-accent",
        columnIndex === currentColumn && "bg-accent/30"
      )}
      onClick={() => handleItemClick(item, columnIndex)}
    >
      {item.type === 'directory' ? (
        <>
          {expandedDirs.has(item.path) ? 
            <ChevronDown className="h-4 w-4" /> : 
            <ChevronRight className="h-4 w-4" />
          }
          <FolderIcon className="h-5 w-5 text-yellow-500" />
        </>
      ) : (
        <div className="w-4 h-4">{getFileIcon(item)}</div>
      )}
      <div className="flex-1 min-w-0">
        <div className="truncate text-sm font-medium">{item.name}</div>
        {item.metadata && (
          <div className="text-xs text-muted-foreground">
            {Object.entries(item.metadata).map(([key, value]) => (
              <span key={key} className="mr-2">{key}: {value}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderGalleryViewItem = (item: FileItem) => (
    <div
      key={item.path}
      className={cn(
        "group relative rounded-lg transition-all duration-200",
        "flex flex-col items-center p-4 hover:bg-accent/50",
        selectedItem?.path === item.path && "bg-accent"
      )}
      onClick={() => handleItemClick(item)}
    >
      <div className="relative w-48 h-48 mb-2 bg-accent/20 rounded-lg overflow-hidden">
        {item.type === 'file' && item.extension && (
          <div className="absolute inset-0 flex items-center justify-center">
            {getFileIcon(item)}
          </div>
        )}
      </div>
      <div className="text-center">
        <div className="truncate text-sm font-medium">{item.name}</div>
        {item.metadata && (
          <div className="text-xs text-muted-foreground">
            {Object.entries(item.metadata).map(([key, value]) => (
              <span key={key} className="mr-2">{key}: {value}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderPreview = () => {
    if (!selectedItem || !previewVisible) return null;

    return (
      <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50">
        <div className="flex h-full">
          <div className="flex-1 p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-semibold">{selectedItem.name}</h2>
              <Button variant="ghost" size="icon" onClick={() => setPreviewVisible(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-auto">
              {selectedItem.type === 'file' && (
                <div className="space-y-4">
                  {selectedItem.extension === 'mp4' && (
                    <div className="relative">
                      <video
                        ref={videoRef}
                        className="w-full rounded-lg"
                        controls
                        muted={muted}
                        onPlay={() => setMuted(false)}
                        onPause={() => setMuted(true)}
                      />
                      <div className="absolute bottom-4 right-4 flex gap-2">
                        <Button
                          variant="secondary"
                          size="icon"
                          onClick={() => setMuted(!muted)}
                        >
                          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  )}
                  {selectedItem.metadata && (
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(selectedItem.metadata).map(([key, value]) => (
                        <div key={key} className="space-y-1">
                          <div className="text-sm font-medium">{key}</div>
                          <div className="text-xs text-muted-foreground">{value}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
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
          {viewMode === 'list' && sortedItems.map(renderListViewItem)}
          {viewMode === 'grid' && (
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(auto-fill, ${iconSize * 2}px)` }}>
              {sortedItems.map(renderIconViewItem)}
            </div>
          )}
          {viewMode === 'columns' && (
            <div className="flex gap-4">
              {Array.from({ length: currentColumn + 1 }).map((_, index) => (
                <div key={index} className="flex-1">
                  {sortedItems.map(item => renderColumnViewItem(item, index))}
                </div>
              ))}
            </div>
          )}
          {viewMode === 'gallery' && sortedItems.map(renderGalleryViewItem)}
        </div>
      </ScrollArea>
      {renderPreview()}
    </div>
  );
} 