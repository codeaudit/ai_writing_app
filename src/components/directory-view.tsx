import { useEffect, useState } from 'react';
import { useDocumentStore } from '@/lib/store';
import { File, Folder, ChevronRight, ChevronDown, LayoutGrid, List as ListIcon, Columns as ColumnsIcon, Image as GalleryIcon, MoreVertical, SortAsc, SortDesc, AlignLeft, AlignCenter, AlignRight, SlidersHorizontal, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
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

interface FileItem {
  name: string;
  type: 'file' | 'directory';
  path: string;
  children?: FileItem[];
  modified?: Date;
  extension?: string;
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
}

type ViewMode = 'list' | 'grid' | 'columns' | 'gallery';
type SortOption = 'name' | 'type' | 'date' | 'size';
type SortDirection = 'asc' | 'desc';
type LabelAlignment = 'left' | 'center' | 'right';

export function DirectoryView({ path, onFileSelect, className }: DirectoryViewProps) {
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
  const { documents, folders, selectDocument } = useDocumentStore();

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
              <Folder className="h-5 w-5 text-yellow-500" />
            </>
          ) : (
            <File className="h-5 w-5 text-blue-500" />
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
          {viewMode === 'list' && sortedItems.map(item => renderItem(item))}
          {viewMode === 'grid' && (
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(auto-fill, ${iconSize * 2}px)` }}>
              {sortedItems.map(item => renderItem(item))}
            </div>
          )}
          {viewMode === 'columns' && (
            <div className="flex gap-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex-1">
                  {sortedItems.map(item => renderItem(item, index))}
                </div>
              ))}
            </div>
          )}
          {viewMode === 'gallery' && sortedItems.map(item => renderItem(item))}
        </div>
      </ScrollArea>
    </div>
  );
} 