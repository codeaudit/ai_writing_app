import { Folder } from './store';

// Define the special directory types
export enum SpecialDirectoryType {
  TRASH = 'trash',
  SYSTEM = 'system',
  TEMPLATES = 'templates',
  COMPOSITION_TEMPLATES = 'composition_templates'
}

// Structure for special directory information
export interface SpecialDirectory {
  type: SpecialDirectoryType;
  name: string;
  icon: string;
  description: string;
  isProtected: boolean; // If true, contents can't be deleted except for trash
}

// Registry of special directories
export const SPECIAL_DIRECTORIES: Record<SpecialDirectoryType, SpecialDirectory> = {
  [SpecialDirectoryType.TRASH]: {
    type: SpecialDirectoryType.TRASH,
    name: 'trash',
    icon: 'trash',
    description: 'Items moved here can be restored or permanently deleted',
    isProtected: false
  },
  [SpecialDirectoryType.SYSTEM]: {
    type: SpecialDirectoryType.SYSTEM,
    name: 'system',
    icon: 'settings',
    description: 'System files and settings',
    isProtected: true
  },
  [SpecialDirectoryType.TEMPLATES]: {
    type: SpecialDirectoryType.TEMPLATES,
    name: 'templates',
    icon: 'file-text',
    description: 'Document templates',
    isProtected: true
  },
  [SpecialDirectoryType.COMPOSITION_TEMPLATES]: {
    type: SpecialDirectoryType.COMPOSITION_TEMPLATES,
    name: 'composition_templates',
    icon: 'layers',
    description: 'Templates for document compositions',
    isProtected: true
  }
};

// Store IDs of special directories for quick lookup
export interface SpecialDirectoryIds {
  [SpecialDirectoryType.TRASH]: string | null;
  [SpecialDirectoryType.SYSTEM]: string | null;
  [SpecialDirectoryType.TEMPLATES]: string | null;
  [SpecialDirectoryType.COMPOSITION_TEMPLATES]: string | null;
}

// Helper function to check if a folder is a special directory
export function isSpecialDirectory(folder: Folder): boolean {
  return Object.values(SPECIAL_DIRECTORIES).some(
    specialDir => 
      folder.name.toLowerCase() === specialDir.name.toLowerCase() && 
      (folder.parentId === null || folder.parentId === '/')
  );
}

// Helper function to get the type of special directory
export function getSpecialDirectoryType(folder: Folder): SpecialDirectoryType | null {
  const specialDir = Object.values(SPECIAL_DIRECTORIES).find(
    specialDir => 
      folder.name.toLowerCase() === specialDir.name.toLowerCase() && 
      (folder.parentId === null || folder.parentId === '/')
  );
  
  return specialDir ? specialDir.type : null;
}

// Helper function to ensure a special directory exists
export async function ensureSpecialDirectoryExists(
  directoryType: SpecialDirectoryType,
  folderList: Folder[],
  addFolder: (name: string, parentId?: string | null) => Promise<void>
): Promise<string | null> {
  const specialDir = SPECIAL_DIRECTORIES[directoryType];
  
  // Check if directory already exists at root level
  const existingDir = folderList.find(folder => 
    folder.name.toLowerCase() === specialDir.name.toLowerCase() && 
    (folder.parentId === null || folder.parentId === '/')
  );
  
  if (existingDir) {
    console.log(`${specialDir.name} directory already exists:`, existingDir.id);
    return existingDir.id;
  }
  
  // Create a new directory
  console.log(`Creating new ${specialDir.name} directory`);
  try {
    await addFolder(specialDir.name, null);
    
    // Find the newly created directory
    const updatedFolderList = [...folderList];
    const newDir = updatedFolderList.find(folder => 
      folder.name.toLowerCase() === specialDir.name.toLowerCase() && 
      (folder.parentId === null || folder.parentId === '/')
    );
    
    if (newDir) {
      console.log(`${specialDir.name} directory created with ID:`, newDir.id);
      return newDir.id;
    } else {
      console.error(`Failed to find newly created ${specialDir.name} directory`);
      return null;
    }
  } catch (error) {
    console.error(`Failed to create ${specialDir.name} directory:`, error);
    return null;
  }
}

// Initialize all special directories
export async function initializeSpecialDirectories(
  folderList: Folder[],
  addFolder: (name: string, parentId?: string | null) => Promise<void>
): Promise<SpecialDirectoryIds> {
  const specialDirIds: SpecialDirectoryIds = {
    [SpecialDirectoryType.TRASH]: null,
    [SpecialDirectoryType.SYSTEM]: null,
    [SpecialDirectoryType.TEMPLATES]: null,
    [SpecialDirectoryType.COMPOSITION_TEMPLATES]: null
  };
  
  // Ensure each special directory exists
  for (const dirType of Object.values(SpecialDirectoryType)) {
    const dirId = await ensureSpecialDirectoryExists(dirType, folderList, addFolder);
    specialDirIds[dirType] = dirId;
  }
  
  return specialDirIds;
}

// Get the protected status of a directory
export function isDirectoryProtected(folder: Folder): boolean {
  const dirType = getSpecialDirectoryType(folder);
  if (!dirType) return false;
  
  return SPECIAL_DIRECTORIES[dirType].isProtected;
}

// Get folder icon based on special directory type
export function getFolderIcon(folder: Folder): string {
  const dirType = getSpecialDirectoryType(folder);
  if (!dirType) return 'folder';
  
  return SPECIAL_DIRECTORIES[dirType].icon;
} 