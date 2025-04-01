import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
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
} from '@/components/ui/dropdown-menu';
import { 
  List, 
  Grid, 
  Columns, 
  Image as ImageIcon,
  Folder,
  File,
  SortAsc,
  SortDesc,
  MoreVertical,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ViewMode = 'list' | 'grid' | 'columns' | 'gallery';
type SortOption = 'name' | 'type' | 'date' | 'size';
type SortDirection = 'asc' | 'desc';

interface FileItem {
  name: string;
  type: 'file' | 'directory';
  path: string;
  size?: number;
  modified?: Date;
  icon?: string;
}

interface DirectoryViewProps {
  path: string;
  onFileSelect: (path: string, isDirectory: boolean) => void;
  className?: string;
}

export function DirectoryView({ path, onFileSelect, className }: DirectoryViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortOption, setSortOption] = useState<SortOption>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<FileItem[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());

  // Load directory contents when path changes
  useEffect(() => {
    loadDirectoryContents();
  }, [path]);

  // Mock data - replace with actual API call
  const loadDirectoryContents = async () => {
    // TODO: Implement actual directory loading
    const mockItems: FileItem[] = [
      { name: 'Documents', type: 'directory', path: '/Documents' },
      { name: 'Images', type: 'directory', path: '/Images' },
      { name: 'report.pdf', type: 'file', path: '/report.pdf' },
      { name: 'presentation.pptx', type: 'file', path: '/presentation.pptx' },
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
    loadDirectoryContents();
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

  const renderItem = (item: FileItem) => {
    const isDirectory = item.type === 'directory';
    const isExpanded = expandedDirs.has(item.path);

    return (
      <div
        key={item.path}
        className={cn(
          "flex items-center gap-2 p-2 rounded-md hover:bg-accent cursor-pointer",
          viewMode === 'grid' && "flex-col text-center",
          viewMode === 'gallery' && "flex-col text-center",
          className
        )}
        onClick={() => {
          if (isDirectory) {
            toggleDirectory(item.path);
          } else {
            onFileSelect(item.path, false); // Pass false to indicate it's a file
          }
        }}
      >
        {isDirectory ? (
          <>
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <Folder className="h-5 w-5 text-yellow-500" />
          </>
        ) : (
          <File className="h-5 w-5 text-blue-500" />
        )}
        <span className="truncate">{item.name}</span>
      </div>
    );
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex items-center gap-2 p-2 border-b">
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
        >
          {sortDirection === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setViewMode('list')}>
              <List className="h-4 w-4 mr-2" />
              List View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setViewMode('grid')}>
              <Grid className="h-4 w-4 mr-2" />
              Grid View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setViewMode('columns')}>
              <Columns className="h-4 w-4 mr-2" />
              Columns View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setViewMode('gallery')}>
              <ImageIcon className="h-4 w-4 mr-2" />
              Gallery View
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <ScrollArea className="flex-1">
        <div className={cn(
          "p-2",
          viewMode === 'grid' && "grid grid-cols-4 gap-2",
          viewMode === 'gallery' && "grid grid-cols-3 gap-4",
          viewMode === 'columns' && "grid grid-cols-3 gap-2"
        )}>
          {sortedItems.map(renderItem)}
        </div>
      </ScrollArea>
    </div>
  );
} 