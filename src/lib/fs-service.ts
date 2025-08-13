// This file should only be imported in server components or API routes
import fs from 'fs';
import path from 'path';
import { Document, Folder } from './store';
import matter from 'gray-matter';
import nunjucks from 'nunjucks';
import { format } from 'date-fns';

// Base directory for all files and folders (the vault)
const VAULT_DIR = path.join(process.cwd(), 'vault');

// Templates directory
const TEMPLATES_DIR = path.join(VAULT_DIR, 'templates');

// Ensure vault directory exists
try {
  if (!fs.existsSync(VAULT_DIR)) {
    fs.mkdirSync(VAULT_DIR, { recursive: true });
  }
} catch (error) {
  console.error('Error creating vault directory:', error);
}

// Ensure templates directory exists
try {
  if (!fs.existsSync(TEMPLATES_DIR)) {
    fs.mkdirSync(TEMPLATES_DIR, { recursive: true });    
  }
} catch (error) {
  console.error('Error creating templates directory:', error);
}

// File paths for metadata index
const DOCUMENTS_INDEX = path.join(VAULT_DIR, '.obsidian', 'documents-index.json');
const FOLDERS_INDEX = path.join(VAULT_DIR, '.obsidian', 'folders-index.json');

// Ensure .obsidian directory exists for metadata
try {
  const obsidianDir = path.join(VAULT_DIR, '.obsidian');
  if (!fs.existsSync(obsidianDir)) {
    fs.mkdirSync(obsidianDir, { recursive: true });
  }
} catch (error) {
  console.error('Error creating .obsidian directory:', error);
}

// Helper function to ensure a directory exists
const ensureDir = (dirPath: string) => {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  } catch (error) {
    console.error(`Error ensuring directory ${dirPath}:`, error);
    throw error;
  }
};

// Helper function to write JSON to a file
const writeJsonFile = <T>(filePath: string, data: T) => {
  try {
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error(`Error writing JSON file ${filePath}:`, error);
    throw error;
  }
};

// Helper to only write JSON when content actually changes
const writeJsonFileIfChanged = <T>(filePath: string, data: T) => {
  try {
    const next = JSON.stringify(data, null, 2);
    if (fs.existsSync(filePath)) {
      const current = fs.readFileSync(filePath, 'utf8');
      if (current === next) return; // No change; avoid touching the file
    }
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, next, 'utf8');
  } catch (error) {
    console.error(`Error conditionally writing JSON file ${filePath}:`, error);
    throw error;
  }
};

// Comment out unused readJsonFile
// const readJsonFile = <T>(filePath: string, defaultValue: T): T => {
//   try {
//     if (!fs.existsSync(filePath)) {
//       return defaultValue;
//     }
//     const data = fs.readFileSync(filePath, 'utf8');
//     return JSON.parse(data) as T;
//   } catch (error) {
//     console.error(`Error reading ${filePath}:`, error);
//     return defaultValue;
//   }
// };

// Get the full path for a document based on its folder structure
const getDocumentPath = (document: Document, folders: Folder[]): string => {
  // Start with the document's folder
  let currentFolderId = document.folderId;
  const folderPath: string[] = [];
  
  // Build the folder path by traversing up the folder hierarchy
  while (currentFolderId) {
    const folder = folders.find(f => f.id === currentFolderId);
    if (!folder) break;
    
    folderPath.unshift(sanitizeName(folder.name));
    currentFolderId = folder.parentId;
  }
  
  // Create the full path
  const sanitizedName = sanitizeName(document.name);
  const fullPath = path.join(VAULT_DIR, ...folderPath, `${sanitizedName}.md`);
  return fullPath;
};

// Get the full path for a folder based on its parent structure
const getFolderPath = (folder: Folder, folders: Folder[]): string => {
  // Start with the current folder
  let currentFolderId = folder.parentId;
  const folderPath: string[] = [sanitizeName(folder.name)];
  
  // Build the folder path by traversing up the folder hierarchy
  while (currentFolderId) {
    const parentFolder = folders.find(f => f.id === currentFolderId);
    if (!parentFolder) break;
    
    folderPath.unshift(sanitizeName(parentFolder.name));
    currentFolderId = parentFolder.parentId;
  }
  
  // Create the full path
  return path.join(VAULT_DIR, ...folderPath);
};

// Helper function to get relative path for a document (vault-relative, no .md extension)
const getRelativeDocumentPath = (document: Document, folders: Folder[]): string => {
  const fullPath = getDocumentPath(document, folders);
  const relativePathWithExt = path.relative(VAULT_DIR, fullPath);
  return relativePathWithExt.replace(/\.md$/, '');
};

// Helper function to get relative path for a folder (vault-relative)
const getRelativeFolderPath = (folder: Folder, folders: Folder[]): string => {
  const fullPath = getFolderPath(folder, folders);
  return path.relative(VAULT_DIR, fullPath);
};

// Sanitize a name for use in the filesystem
const sanitizeName = (name: string): string => {
  return name.replace(/[/\\?%*:|"<>]/g, '-');
};

// Convert a Document to a Markdown string with YAML frontmatter
export const documentToMarkdown = (document: Document): string => {
  // Create frontmatter object
  const frontmatter = {
    id: document.id,
    name: document.name,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
    versions: document.versions.map(v => ({
      id: v.id,
      createdAt: v.createdAt.toISOString(),
      message: v.message
    })),
    // Add annotations to frontmatter
    annotations: Array.isArray(document.annotations) ? document.annotations.map(anno => ({
      id: anno.id,
      documentId: anno.documentId,
      startOffset: anno.startOffset,
      endOffset: anno.endOffset,
      content: anno.content,
      color: anno.color,
      createdAt: anno.createdAt instanceof Date ? anno.createdAt.toISOString() : new Date(anno.createdAt).toISOString(),
      updatedAt: anno.updatedAt instanceof Date ? anno.updatedAt.toISOString() : new Date(anno.updatedAt).toISOString(),
      tags: anno.tags
    })) : [],
    // Add contextDocuments to frontmatter if they exist
    ...(Array.isArray(document.contextDocuments) && document.contextDocuments.length > 0 ? {
      contextDocuments: document.contextDocuments.map(doc => ({
        id: doc.id,
        name: doc.name
      }))
    } : {})
  };
  
  return matter.stringify(document.content, frontmatter);
};

// Comment out unused markdownToDocument
// const markdownToDocument = (markdown: string): unknown => {
//   const fileContent = fs.readFileSync(filePath, 'utf8');
//   const { data, content } = matter(fileContent);
  
//   // Extract the filename without extension as the document name
//   const fileName = path.basename(filePath, '.md');
  
//   // Determine the folder ID based on the relative path
//   const folderPath = path.dirname(relativePath);
//   const folders = loadFolders();
//   let folderId: string | null = null;
  
//   if (folderPath !== '.') {
//     // Find or create folders for the path
//     const pathParts = folderPath.split(path.sep);
//     let currentPath = '';
//     let parentId: string | null = null;
    
//     for (const part of pathParts) {
//       currentPath = currentPath ? path.join(currentPath, part) : part;
//       let folder = folders.find(f => 
//         sanitizeName(f.name) === part && f.parentId === parentId
//       );
      
//       if (!folder) {
//         // Create a new folder if it doesn't exist
//         folder = {
//           id: `folder-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
//           name: part,
//           createdAt: new Date(),
//           parentId
//         };
//         folders.push(folder);
//       }
      
//       parentId = folder.id;
//       folderId = folder.id;
//     }
    
//     // Save the updated folders
//     writeJsonFile(FOLDERS_INDEX, folders);
//   }
  
//   // Parse annotations from frontmatter
//   const annotations: unknown[] = Array.isArray(data.annotations) ? data.annotations.map((anno: unknown) => ({
//     id: anno.id,
//     documentId: anno.documentId,
//     startOffset: anno.startOffset,
//     endOffset: anno.endOffset,
//     content: anno.content,
//     color: anno.color,
//     createdAt: anno.createdAt ? new Date(anno.createdAt) : new Date(),
//     updatedAt: anno.updatedAt ? new Date(anno.updatedAt) : new Date(),
//     tags: Array.isArray(anno.tags) ? anno.tags : []
//   })) : [];
  
//   // Create a document object
//   const doc: Document = {
//     id: data.id || `doc-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
//     name: data.name || fileName,
//     content,
//     createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
//     updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
//     versions: (data.versions || []).map((v: any) => ({
//       id: v.id,
//       content: '', // We don't store version content in the frontmatter
//       createdAt: new Date(v.createdAt),
//       message: v.message
//     })),
//     folderId,
//     annotations: Array.isArray(data.annotations) ? data.annotations.map((anno: unknown) => ({
//       id: anno.id,
//       documentId: anno.documentId || doc.id, // Default to the document ID if not specified
//       startOffset: anno.startOffset,
//       endOffset: anno.endOffset,
//       content: anno.content || '',
//       color: anno.color || 'yellow',
//       createdAt: anno.createdAt ? new Date(anno.createdAt) : new Date(),
//       updatedAt: anno.updatedAt ? new Date(anno.updatedAt) : new Date(),
//       tags: Array.isArray(anno.tags) ? anno.tags : []
//     })) : [],
//     contextDocuments: Array.isArray(data.contextDocuments) ? data.contextDocuments.map((contextDoc: any) => ({
//       id: contextDoc.id,
//       name: contextDoc.name
//     })) : []
//   };
  
//   return doc;
// };

// Save a document to the file system
export const saveDocument = (document: Document) => {
  try {
    // Get all folders for path resolution
    const folders = loadFolders();
    
    // Save document metadata to the index
    const documents = loadDocuments();
    const existingIndex = documents.findIndex(doc => doc.id === document.id);
    
    if (existingIndex >= 0) {
      documents[existingIndex] = document;
    } else {
      documents.push(document);
    }
    
    writeJsonFile(DOCUMENTS_INDEX, documents);
    
    // Get the full path for the document
    const documentPath = getDocumentPath(document, folders);
    
    // Ensure the directory exists
    ensureDir(path.dirname(documentPath));
    
    // Convert document to Markdown with frontmatter and save
    const markdownContent = documentToMarkdown(document);
    fs.writeFileSync(documentPath, markdownContent, 'utf8');
    
    return document;
  } catch (error) {
    console.error('Error saving document:', error);
    throw error;
  }
};

// Load all documents from the file system
export const loadDocuments = (): Document[] => {
  try {
    // Try to load existing document index first to maintain consistent IDs
    let existingDocuments: Document[] = [];
    try {
      if (fs.existsSync(DOCUMENTS_INDEX)) {
        const data = fs.readFileSync(DOCUMENTS_INDEX, 'utf8');
        existingDocuments = JSON.parse(data) as Document[];
      }
    } catch (error) {
      console.error('Error reading existing document index:', error);
    }

    // Create a map of existing document IDs for quick lookup
    const existingDocMap = new Map<string, Document>();
    existingDocuments.forEach(doc => {
      existingDocMap.set(doc.id, doc);
    });

    // Create a map of document paths to existing document IDs
    // const docPathMap = new Map<string, string>();
    
    // Always scan the vault directory for Markdown files
    const documents: Document[] = [];
    const folders = loadFolders();
    
    // Create a map of folder paths to folder IDs for quick lookup
    const folderPathMap = new Map<string, string>();
    
    // Function to build the folder path map
    const buildFolderPathMap = (folders: Folder[]) => {
      // First, create a map of folder IDs to folder objects
      const folderMap = new Map<string, Folder>();
      folders.forEach(folder => folderMap.set(folder.id, folder));
      
      // Then, build paths for each folder
      folders.forEach(folder => {
        let path = sanitizeName(folder.name);
        let currentFolder = folder;
        
        // Traverse up the folder hierarchy to build the full path
        while (currentFolder.parentId) {
          const parentFolder = folderMap.get(currentFolder.parentId);
          if (!parentFolder) break;
          
          path = `${sanitizeName(parentFolder.name)}/${path}`;
          currentFolder = parentFolder;
        }
        
        // Store the mapping from path to folder ID
        folderPathMap.set(path, folder.id);
      });
    };
    
    buildFolderPathMap(folders);
    
    // Function to recursively scan directories
    const scanDirectory = (dir: string, relativePath: string = '') => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const entryRelativePath = path.join(relativePath, entry.name);
        
        // Skip .obsidian directory
        if (entry.name === '.obsidian') continue;
        
        if (entry.isDirectory()) {
          // Recursively scan subdirectories
          scanDirectory(fullPath, entryRelativePath);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          // Parse Markdown files
          const fileContent = fs.readFileSync(fullPath, 'utf8');

          interface FrontmatterVersion { id: string; createdAt: string | Date; message?: string }
          interface FrontmatterAnnotation { id: string; documentId?: string; startOffset: number; endOffset: number; content?: string; color?: string; createdAt?: string | Date; updatedAt?: string | Date; tags?: string[] }
          interface FrontmatterContextDoc { id: string; name: string }
          interface FrontmatterData { id?: string; name?: string; createdAt?: string | Date; updatedAt?: string | Date; versions?: FrontmatterVersion[]; annotations?: FrontmatterAnnotation[]; contextDocuments?: FrontmatterContextDoc[] }

          const parsed = matter(fileContent) as { data: FrontmatterData; content: string };
          const data = parsed.data;
          const content = parsed.content;
          
          // Extract the filename without extension as the document name
          const fileName = path.basename(fullPath, '.md');
          
          // Determine the folder ID based on the relative path
          const dirPath = path.dirname(entryRelativePath);
          let folderId: string | null = null; // eslint-disable-line prefer-const
          
          if (dirPath !== '.') {
            // Look up the folder ID from our path map
            folderId = folderPathMap.get(dirPath) || null;
            
            // If we couldn't find the folder ID, it might be a new folder
            if (!folderId) {
              console.warn(`Could not find folder ID for path: ${dirPath}`);
            }
          }
          
          // Check if we have an existing document with this ID
          let docId = data.id;
          
          // If the ID exists but is already used by a different file, generate a new ID
          if (docId && existingDocMap.has(docId)) {
            const existingDoc = existingDocMap.get(docId)!;
            // If the existing doc has a different name or path, prefer filesystem state and keep the ID
            // This can happen after folder renames; we'll update metadata based on the scanned file
            // No action needed here; proceed with docId as-is
          }
          
          // If no ID, generate a new one
          if (!docId) {
            docId = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
          }
          
          // Create a document object
          const doc: Document = {
            id: docId,
            name: data.name || fileName,
            content,
            createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
            updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
            versions: (data.versions || []).map((v: FrontmatterVersion) => ({
              id: v.id,
              content: '',
              createdAt: new Date(v.createdAt),
              message: v.message
            })),
            folderId,
            annotations: Array.isArray(data.annotations) ? data.annotations.map((anno: FrontmatterAnnotation) => ({
              id: anno.id,
              documentId: anno.documentId || doc.id, // Default to the document ID if not specified
              startOffset: anno.startOffset,
              endOffset: anno.endOffset,
              content: anno.content || '',
              color: anno.color || 'yellow',
              createdAt: anno.createdAt ? new Date(anno.createdAt) : new Date(),
              updatedAt: anno.updatedAt ? new Date(anno.updatedAt) : new Date(),
              tags: Array.isArray(anno.tags) ? anno.tags : []
            })) : [],
            contextDocuments: Array.isArray(data.contextDocuments) ? data.contextDocuments.map((contextDoc: FrontmatterContextDoc) => ({
              id: contextDoc.id,
              name: contextDoc.name
            })) : []
          };
          
          documents.push(doc);
          
          // Mark this ID as used
          existingDocMap.set(doc.id, doc);
        }
      }
    };
    
    // Start scanning from the vault root
    scanDirectory(VAULT_DIR);
    
    // Final check for duplicate IDs
    const idSet = new Set<string>();
    const finalDocuments = documents.map(doc => {
      if (idSet.has(doc.id)) {
        // This is a duplicate ID that wasn't caught earlier
        doc.id = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      }
      idSet.add(doc.id);
      return doc;
    });
    
    // Save the index for future use
    writeJsonFileIfChanged(DOCUMENTS_INDEX, finalDocuments);
    
    return finalDocuments;
  } catch (error) {
    console.error('Error loading documents:', error);
    return [];
  }
};

// Save a folder to the file system
export const saveFolder = (folder: Folder) => {
  try {
    // Save folder metadata
    const folders = loadFolders();
    const existingIndex = folders.findIndex(f => f.id === folder.id);
    
    if (existingIndex >= 0) {
      folders[existingIndex] = folder;
    } else {
      folders.push(folder);
    }
    
    writeJsonFile(FOLDERS_INDEX, folders);
    
    // Create folder directory if it doesn't exist
    const folderPath = getFolderPath(folder, folders);
    ensureDir(folderPath);
    
    return folder;
  } catch (error) {
    console.error('Error saving folder:', error);
    throw error;
  }
};

// Load all folders from the file system
export const loadFolders = (): Folder[] => {
  try {
    // Try to load existing folder index first to maintain consistent IDs
    let existingFolders: Folder[] = [];
    try {
      if (fs.existsSync(FOLDERS_INDEX)) {
        const data = fs.readFileSync(FOLDERS_INDEX, 'utf8');
        existingFolders = JSON.parse(data) as Folder[];
      }
    } catch (error) {
      console.error('Error reading existing folder index:', error);
    }
    
    // Create a map of folder paths to existing folder IDs
    const folderPathMap = new Map<string, string>();
    const folderIdMap = new Map<string, Folder>();
    
    // Build a map of existing folder paths to IDs
    existingFolders.forEach(folder => {
      folderIdMap.set(folder.id, folder);
    });
    
    // Function to get the full path for a folder
    const getFolderFullPath = (folder: Folder): string => {
      let path = sanitizeName(folder.name);
      let currentFolderId = folder.parentId;
      
      while (currentFolderId) {
        const parentFolder = folderIdMap.get(currentFolderId);
        if (!parentFolder) break;
        
        path = `${sanitizeName(parentFolder.name)}/${path}`;
        currentFolderId = parentFolder.parentId;
      }
      
      return path;
    };
    
    // Build the path map for existing folders
    existingFolders.forEach(folder => {
      const path = getFolderFullPath(folder);
      folderPathMap.set(path, folder.id);
    });
    
    // Now scan the vault directory for folders
    const folders: Folder[] = [];
    
    // Function to recursively scan directories
    const scanDirectory = (dir: string, parentId: string | null = null, relativePath: string = '') => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        // Skip .obsidian directory
        if (entry.name === '.obsidian') continue;
        
        if (entry.isDirectory()) {
          const fullPath = path.join(dir, entry.name);
          const entryRelativePath = path.join(relativePath, entry.name);
          
          // Check if this folder already exists in our index
          const folderPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
          let folderId = folderPathMap.get(folderPath);
          
          // Create a folder object
          const folder: Folder = {
            id: folderId || `folder-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            name: entry.name,
            createdAt: new Date(),
            parentId
          };
          
          // If we found an existing folder, preserve its creation date
          if (folderId) {
            const existingFolder = existingFolders.find(f => f.id === folderId);
            if (existingFolder) {
              folder.createdAt = new Date(existingFolder.createdAt);
            }
          }
          
          folders.push(folder);
          folderIdMap.set(folder.id, folder);
          
          // Recursively scan subdirectories
          scanDirectory(fullPath, folder.id, entryRelativePath);
        }
      }
    };
    
    // Start scanning from the vault root
    scanDirectory(VAULT_DIR);
    
    // Save the index for future use
    writeJsonFileIfChanged(FOLDERS_INDEX, folders);
    
    return folders;
  } catch (error) {
    console.error('Error loading folders:', error);
    return [];
  }
};

// Delete a document from the file system
export const deleteDocument = (docId: string) => {
  try {
    // Get document metadata
    const documents = loadDocuments();
    const document = documents.find(doc => doc.id === docId);
    
    if (!document) {
      return;
    }
    
    // Remove document from index
    const updatedDocuments = documents.filter(doc => doc.id !== docId);
    writeJsonFile(DOCUMENTS_INDEX, updatedDocuments);
    
    // Remove document file
    const folders = loadFolders();
    const documentPath = getDocumentPath(document, folders);
    
    if (fs.existsSync(documentPath)) {
      fs.unlinkSync(documentPath);
    }
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
};

// Delete a folder from the file system
export const deleteFolder = (folderId: string, options?: { recursive?: boolean }): { 
  success: boolean; 
  error?: string; 
  canRecurse?: boolean;
  documentCount?: number;
} => {
  try {
    const recursive = options?.recursive || false;
    
    // Get folder metadata
    const folders = loadFolders();
    const folder = folders.find(f => f.id === folderId);
    
    if (!folder) {
      return { success: false, error: 'Folder not found' };
    }
    
    // Check if folder has documents
    const documents = loadDocuments();
    const folderDocuments = documents.filter(doc => doc.folderId === folderId);
    const hasDocuments = folderDocuments.length > 0;
    
    // Check if folder has subfolders
    const subfolders = folders.filter(f => f.parentId === folderId);
    const hasSubfolders = subfolders.length > 0;
    
    // If the folder has contents but we're not doing recursive deletion,
    // return an error with the option to use recursive deletion
    if ((hasDocuments || hasSubfolders) && !recursive) {
      return { 
        success: false, 
        error: 'Cannot delete folder that contains documents or subfolders', 
        canRecurse: true,
        documentCount: folderDocuments.length
      };
    }
    
    // For recursive deletion, we need to:
    // 1. Recursively delete all subfolders
    // 2. Delete or move to trash all documents in this folder
    if (recursive) {
      // First recursively delete all subfolders
      for (const subfolder of subfolders) {
        const result = deleteFolder(subfolder.id, { recursive: true });
        if (!result.success) {
          return result; // Propagate the error
        }
      }
      
      // Then delete or move all documents to trash
      for (const doc of folderDocuments) {
        // For documents in folders marked for deletion, we'll move them to trash
        // instead of permanently deleting them for safety
        const result = moveToTrash(doc.id);
        if (!result.success) {
          return { success: false, error: `Failed to remove document: ${result.error}` };
        }
      }
    }
    
    // Remove folder from index
    const updatedFolders = folders.filter(f => f.id !== folderId);
    writeJsonFile(FOLDERS_INDEX, updatedFolders);
    
    // Remove folder directory
    const folderPath = getFolderPath(folder, folders);
    
    if (fs.existsSync(folderPath)) {
      try {
        if (recursive) {
          // Use rmSync with recursive option for recursive deletion
          fs.rmSync(folderPath, { recursive: true, force: true });
        } else {
          // Use rmdirSync for empty folders
          fs.rmdirSync(folderPath);
        }
      } catch (error) {
        console.error(`Error removing folder directory ${folderPath}:`, error);
        return { 
          success: false, 
          error: `Failed to remove folder directory: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting folder:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

// Rename a document (updates both metadata and file path)
export const renameDocument = (docId: string, newName: string) => {
  try {
    // Get document metadata
    const documents = loadDocuments();
    const folders = loadFolders(); // Load folders once
    const document = documents.find(doc => doc.id === docId);
    
    if (!document) {
      return null;
    }
    
    // Store the original document name for potential rollback
    const originalName = document.name;
    
    // Get the old path and relative path before updating
    const oldPath = getDocumentPath(document, folders);
    const oldRelativePath = getRelativeDocumentPath(document, folders);
    
    // Update document name
    document.name = newName;
    document.updatedAt = new Date();
    
    // Get the new path and relative path after updating the name
    const newPath = getDocumentPath(document, folders);
    const newRelativePath = getRelativeDocumentPath(document, folders);
    
    // Safety check - if paths are the same (e.g., only case changed on case-insensitive filesystem), 
    // use a temporary path for the operation
    const isSamePath = oldPath.toLowerCase() === newPath.toLowerCase();
    const tempPath = isSamePath ? `${newPath}.temp` : newPath;
    
    try {
      // Ensure the target directory exists
      ensureDir(path.dirname(newPath));
      
      // Create a file at the new location with the document's content
      const markdownContent = documentToMarkdown(document);
      fs.writeFileSync(tempPath, markdownContent, 'utf8');
      
      // Delete the old file if it exists
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
        // Verify deletion
        if (fs.existsSync(oldPath)) {
          throw new Error('Failed to delete old document file');
        }
        console.log(`Successfully deleted old document: ${oldPath}`);
      }
      
      // If we used a temp path (for case-only changes), rename to the final path
      if (isSamePath && fs.existsSync(tempPath)) {
        fs.renameSync(tempPath, newPath);
      }
      
      // Update links pointing to the old path
      const updatedLinks = updateLinksExactMatch(oldRelativePath, newRelativePath);
      
      // Update the index
      const updatedDocuments = documents.map(doc => 
        doc.id === docId ? document : doc
      );
      writeJsonFile(DOCUMENTS_INDEX, updatedDocuments);
      
      return { document, updatedLinks };
    } catch (error) {
      // Rollback - restore the original document name
      document.name = originalName;
      // Cleanup temporary file if it was created
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
        console.log(`Cleaned up temporary file: ${tempPath}`);
      }
      console.error('Error during document rename operation:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in renameDocument:', error);
    throw error;
  }
};

// Rename a folder (updates both metadata and directory path)
export const renameFolder = (folderId: string, newName: string) => {
  try {
    // Get folder metadata
    const folders = loadFolders();
    const folder = folders.find(f => f.id === folderId);
    
    if (!folder) {
      return null;
    }
    
    // Store the original folder name for potential rollback
    const originalName = folder.name;
    
    // Get the old path and relative path
    const oldPath = getFolderPath(folder, folders);
    const oldRelativeFolderPath = getRelativeFolderPath(folder, folders);
    
    // Update folder name
    folder.name = newName;
    
    // Get the new path and relative path
    const newPath = getFolderPath(folder, folders);
    const newRelativeFolderPath = getRelativeFolderPath(folder, folders);
    
    // Safety check - if paths are the same (e.g., only case changed on case-insensitive filesystem), 
    // use a temporary path for the operation
    const isSamePath = oldPath.toLowerCase() === newPath.toLowerCase();
    const tempPath = isSamePath ? `${newPath}_temp` : newPath;
    
    try {
      // Ensure the parent directory exists
      ensureDir(path.dirname(newPath));
      
      if (!isSamePath) {
        // Fast path: direct rename/move when destination differs
        if (fs.existsSync(oldPath)) {
          fs.renameSync(oldPath, newPath);
        } else {
          // If the old folder does not exist, ensure the new one exists
          if (!fs.existsSync(newPath)) fs.mkdirSync(newPath, { recursive: true });
        }
      } else {
        // Case-only change: copy to temp and swap
        if (!fs.existsSync(tempPath)) {
          fs.mkdirSync(tempPath, { recursive: true });
        }
        
        if (fs.existsSync(oldPath)) {
          const entries = fs.readdirSync(oldPath, { withFileTypes: true });
          for (const entry of entries) {
            const srcPath = path.join(oldPath, entry.name);
            const destPath = path.join(tempPath, entry.name);
            if (entry.isDirectory()) {
              fs.cpSync(srcPath, destPath, { recursive: true });
            } else {
              fs.copyFileSync(srcPath, destPath);
            }
          }
          // Remove the old directory tree
          fs.rmSync(oldPath, { recursive: true, force: true });
        }
        // Swap temp to final path
        if (fs.existsSync(tempPath)) {
          if (fs.existsSync(newPath)) {
            fs.rmSync(newPath, { recursive: true, force: true });
          }
          fs.renameSync(tempPath, newPath);
        }
      }
      
      // Update links that used the old folder path prefix
      updateLinksFolderPrefix(oldRelativeFolderPath, newRelativeFolderPath);
      
      // Update the index
      const updatedFolders = folders.map(f => 
        f.id === folderId ? folder : f
      );
      writeJsonFile(FOLDERS_INDEX, updatedFolders);
      
      return folder;
    } catch (error) {
      // Rollback - restore the original folder name
      folder.name = originalName;
      // Cleanup temporary directory if it was created
      if (fs.existsSync(tempPath)) {
        fs.rmSync(tempPath, { recursive: true, force: true });
      }
      console.error('Error during folder rename operation:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in renameFolder:', error);
    throw error;
  }
};

// Move a document to a different folder
export const moveDocument = (docId: string, targetFolderId: string | null) => {
  try {
    // Get document metadata
    const documents = loadDocuments();
    const folders = loadFolders(); // Load folders once
    const document = documents.find(doc => doc.id === docId);
    
    if (!document) {
      return null;
    }
    
    // Get the old path and relative path
    const oldPath = getDocumentPath(document, folders);
    const oldRelativePath = getRelativeDocumentPath(document, folders);
    
    // Update document folder
    document.folderId = targetFolderId;
    document.updatedAt = new Date();
    
    // Get the new path and relative path
    const newPath = getDocumentPath(document, folders);
    const newRelativePath = getRelativeDocumentPath(document, folders);
    
    // Move the file using fs.renameSync for atomicity
    if (fs.existsSync(oldPath)) {
      // Ensure the target directory exists
      ensureDir(path.dirname(newPath));
      
      // Perform the move (rename across directories)
      fs.renameSync(oldPath, newPath);

      // Update links pointing to the old path
      updateLinksExactMatch(oldRelativePath, newRelativePath);
    } else {
        // If file didn't exist, still update links based on metadata change
        updateLinksExactMatch(oldRelativePath, newRelativePath);
    }
    
    // Update the index *only after* successful operation
    const updatedDocuments = documents.map(doc => 
      doc.id === docId ? document : doc
    );
    writeJsonFile(DOCUMENTS_INDEX, updatedDocuments);
    
    return document;
  } catch (error) {
    console.error('Error moving document:', error);
    // Re-throw the error so the caller knows it failed
    throw error;
  }
};

// Move a folder to a different parent folder
export const moveFolder = (folderId: string, targetParentId: string | null) => {
  try {
    // Get folder metadata
    const folders = loadFolders();
    const folder = folders.find(f => f.id === folderId);
    
    if (!folder) {
      return null;
    }
    
    // Prevent circular references
    if (targetParentId) {
      let currentParentId: string | null = targetParentId;
      while (currentParentId) {
        if (currentParentId === folderId) {
          throw new Error('Cannot move a folder into its own subfolder');
        }
        const parentFolder = folders.find(f => f.id === currentParentId);
        if (!parentFolder) break;
        currentParentId = parentFolder.parentId;
      }
    }
    
    // Get the old path and relative path
    const oldPath = getFolderPath(folder, folders);
    const oldRelativeFolderPath = getRelativeFolderPath(folder, folders);
    
    // Update folder parent
    folder.parentId = targetParentId;
    
    // Get the new path and relative path
    const newPath = getFolderPath(folder, folders);
    const newRelativeFolderPath = getRelativeFolderPath(folder, folders);
    
    // Move the directory
    if (fs.existsSync(oldPath)) {
      // Ensure the parent directory exists
      ensureDir(path.dirname(newPath));
      
      // Rename/move the directory
      fs.renameSync(oldPath, newPath);

      // Update links that used the old folder path prefix
      updateLinksFolderPrefix(oldRelativeFolderPath, newRelativeFolderPath);
    } else {
        // If folder didn't exist, still update links based on metadata change
        updateLinksFolderPrefix(oldRelativeFolderPath, newRelativeFolderPath);
    }
    
    // Update the index
    const updatedFolders = folders.map(f => 
      f.id === folderId ? folder : f
    );
    writeJsonFile(FOLDERS_INDEX, updatedFolders);
    
    return folder;
  } catch (error) {
    console.error('Error moving folder:', error);
    throw error;
  }
};

// Parse internal links from content
export const parseInternalLinks = (content: string): string[] => {
  const linkRegex = /\[\[(.*?)\]\]/g;
  const links: string[] = [];
  let match;
  
  while ((match = linkRegex.exec(content)) !== null) {
    links.push(match[1]);
  }
  
  return links;
};

// Get all backlinks to a document
export const getBacklinks = (docId: string): { id: string; name: string }[] => {
  const documents = loadDocuments();
  const targetDoc = documents.find(doc => doc.id === docId);
  
  if (!targetDoc) {
    return [];
  }
  
  const backlinks = documents.filter(doc => {
    if (doc.id === docId) return false;
    
    const links = parseInternalLinks(doc.content);
    return links.some(link => link === targetDoc.name);
  });
  
  return backlinks.map(doc => ({ id: doc.id, name: doc.name }));
};

// Update links when a document path changes (rename or move)
// Handles exact matches: [[old/path/to/doc]] -> [[new/path/to/doc]]
export const updateLinksExactMatch = (oldRelativePath: string, newRelativePath: string) => {
  const documents = loadDocuments();
  let updatedCount = 0;

  // Escape paths for regex
  const oldLinkContent = escapeRegExp(oldRelativePath);
  // Regex to find the link, capturing potential display text '|displayText'
  const oldLinkRegex = new RegExp(`\[\[${oldLinkContent}(\|.*?)?\]\]`, 'g');

  for (const doc of documents) {
    let contentChanged = false;
    doc.content = doc.content.replace(oldLinkRegex, (match, displayPipe) => {
      contentChanged = true;
      const displaySuffix = displayPipe || ''; // displayPipe will be like "|displayText" or undefined
      return `[[${newRelativePath}${displaySuffix}]]`;
    });

    if (contentChanged) {
      doc.updatedAt = new Date();
      // saveDocument also updates the file content on disk
      saveDocument(doc);
      updatedCount++;
    }
  }

  if (updatedCount > 0) {
    console.log(`Updated exact link matches in ${updatedCount} documents: ${oldRelativePath} -> ${newRelativePath}`);
  }
  return updatedCount;
};

// Update links when a folder path changes (rename or move)
// Handles prefix matches: [[old/folder/path/doc]] -> [[new/folder/path/doc]]
export const updateLinksFolderPrefix = (oldRelativeFolderPath: string, newRelativeFolderPath: string) => {
  const documents = loadDocuments();
  let updatedCount = 0;

  // Ensure paths don't have trailing slashes for consistency, handle root case
  const oldPrefixPattern = oldRelativeFolderPath === '' ? '' : escapeRegExp(oldRelativeFolderPath) + '\/';
  const newPrefix = newRelativeFolderPath === '' ? '' : newRelativeFolderPath + '/';

  // Regex to find links starting with the old folder path prefix, capturing the rest
  // Matches [[oldFolder/rest/of/path...]] or [[oldFolder/rest/of/path...|displayText]]
  const oldLinkRegex = new RegExp(`\[\[(${oldPrefixPattern})(.*?)(\|.*?)?\]\]`, 'g');

  for (const doc of documents) {
    let contentChanged = false;
    // Match: [[prefix][restOfPath][displayPipe?]]
    doc.content = doc.content.replace(oldLinkRegex, (match, _prefix, restOfPath, displayPipe) => {
      // Avoid matching the folder itself if it was linked directly
      if (restOfPath === '') return match;

      contentChanged = true;
      const displaySuffix = displayPipe || '';
      const newFullPath = `${newPrefix}${restOfPath}`;
      return `[[${newFullPath}${displaySuffix}]]`;
    });

    if (contentChanged) {
      doc.updatedAt = new Date();
      saveDocument(doc);
      updatedCount++;
    }
  }

  if (updatedCount > 0) {
    console.log(`Updated folder prefix links in ${updatedCount} documents: ${oldRelativeFolderPath}/ -> ${newPrefix}`);
  }
  return updatedCount;
};

// Helper to escape special characters in regex
const escapeRegExp = (string: string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Get all available templates
export const getTemplates = (): { name: string; path: string }[] => {
  try {
    if (!fs.existsSync(TEMPLATES_DIR)) {
      return [];
    }
    
    const templateFiles = fs.readdirSync(TEMPLATES_DIR)
      .filter(file => file.endsWith('.md'))
      .map(file => ({
        name: file.replace(/\.md$/, ''),
        path: path.join(TEMPLATES_DIR, file)
      }));
    
    return templateFiles;
  } catch (error) {
    console.error('Error getting templates:', error);
    return [];
  }
};

// Configure Nunjucks
const configureNunjucks = () => {
  const env = nunjucks.configure({ 
    autoescape: false,
    trimBlocks: true,
    lstripBlocks: true
  }) as nunjucks.Environment | undefined;
  
  if (!env) {
    // Minimal fallback for tests if configure returns undefined
    return {
      render: (_template: string, _ctx: Record<string, unknown>) => '',
      addFilter: () => {}
    } as unknown as nunjucks.Environment;
  }
  
  // Add custom filters
  env.addFilter('dateFormat', (date, formatStr = 'PPP') => {
    try {
      return format(new Date(date), formatStr);
    } catch (error) {
      console.error('Error formatting date:', error);
      return date;
    }
  });
  
  env.addFilter('timeFormat', (date, formatStr = 'p') => {
    try {
      return format(new Date(date), formatStr);
    } catch (error) {
      console.error('Error formatting time:', error);
      return date;
    }
  });
  
  env.addFilter('lowercase', (str) => {
    return String(str).toLowerCase();
  });
  
  env.addFilter('uppercase', (str) => {
    return String(str).toUpperCase();
  });
  
  env.addFilter('capitalize', (str) => {
    return String(str).charAt(0).toUpperCase() + String(str).slice(1);
  });
  
  env.addFilter('slugify', (str) => {
    return String(str)
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  });
  
  return env;
};

// Initialize Nunjucks
const nunjucksEnv = configureNunjucks();
// Use nunjucksEnv to avoid unused var lint
void nunjucksEnv;

// Process a template with variable substitution using Nunjucks
export const processTemplate = (templateName: string, variables: Record<string, unknown>): string => {
  try {
    const templatePath = path.join(TEMPLATES_DIR, `${templateName}.md`);
    
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template not found: ${templateName}`);
    }
    
    const templateContent = fs.readFileSync(templatePath, 'utf8');
    return nunjucks.renderString(templateContent, variables);
  } catch (error) {
    console.error('Error processing template:', error);
    throw error;
  }
};

// Create and get the trash folder
const getOrCreateTrashFolder = (): Folder => {
  const folders = loadFolders();
  let trashFolder = folders.find(f => f.name === 'Trash' && f.parentId === null);
  
  if (!trashFolder) {
    // Create a Trash folder if it doesn't exist
    trashFolder = {
      id: `folder-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: 'Trash',
      createdAt: new Date(),
      parentId: null
    };
    
    // Save the trash folder to the filesystem
    saveFolder(trashFolder);
  }
  
  return trashFolder;
};

// Move a document to the trash instead of deleting it
export const moveToTrash = (docId: string): { success: boolean, error?: string } => {
  try {
    // Get document metadata
    const documents = loadDocuments();
    const document = documents.find(doc => doc.id === docId);
    
    if (!document) {
      return { success: false, error: "Document not found" };
    }
    
    // Get or create the trash folder
    const trashFolder = getOrCreateTrashFolder();
    
    // Create the trash folder on disk if it doesn't exist
    const folders = loadFolders();
    const trashPath = getFolderPath(trashFolder, folders);
    ensureDir(trashPath);
    
    // Get the old path
    const oldPath = getDocumentPath(document, folders);
    
    // Update document folder
    const originalDocument = { ...document };
    document.folderId = trashFolder.id;
    document.updatedAt = new Date();
    
    // Get the new path
    const newPath = getDocumentPath(document, folders);
    
    // Move the file
    if (fs.existsSync(oldPath)) {
      // Ensure the directory exists
      ensureDir(path.dirname(newPath));
      
      try {
        // Read the content
        const content = fs.readFileSync(oldPath, 'utf8');
        
        // Write to new location
        fs.writeFileSync(newPath, content, 'utf8');
        
        // Delete the old file
        fs.unlinkSync(oldPath);
        
        // Update the index
        const updatedDocuments = documents.map(doc => 
          doc.id === docId ? document : doc
        );
        writeJsonFile(DOCUMENTS_INDEX, updatedDocuments);
        
        return { success: true };
      } catch (fileError) {
        // Revert the document if file operations fail
        console.error('Error moving file to trash:', fileError);
        return { 
          success: false, 
          error: fileError instanceof Error ? fileError.message : String(fileError)
        };
      }
    } else {
      // If file doesn't exist, just update the metadata
      const updatedDocuments = documents.map(doc => 
        doc.id === docId ? document : doc
      );
      writeJsonFile(DOCUMENTS_INDEX, updatedDocuments);
      return { success: true };
    }
  } catch (error) {
    console.error('Error moving document to trash:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

// Empty the trash by permanently deleting all documents in the trash folder
export const emptyTrash = (): { success: boolean, error?: string, count?: number } => {
  try {
    const folders = loadFolders();
    const trashFolder = folders.find(f => f.name === 'Trash' && f.parentId === null);
    
    if (!trashFolder) {
      return { success: true, count: 0 };
    }
    
    // Get all documents in the trash
    const documents = loadDocuments();
    const trashDocuments = documents.filter(doc => doc.folderId === trashFolder.id);
    
    // Delete each document
    let deletedCount = 0;
    for (const doc of trashDocuments) {
      deleteDocument(doc.id);
      deletedCount++;
    }
    
    return { success: true, count: deletedCount };
  } catch (error) {
    console.error('Error emptying trash:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

// Restore a document from trash to its original location or root
export const restoreFromTrash = (docId: string, targetFolderId: string | null = null): { success: boolean, error?: string } => {
  try {
    // Get document metadata
    const documents = loadDocuments();
    const document = documents.find(doc => doc.id === docId);
    
    if (!document) {
      return { success: false, error: "Document not found" };
    }
    
    // Get trash folder
    const folders = loadFolders();
    const trashFolder = folders.find(f => f.name === 'Trash' && f.parentId === null);
    
    // Verify document is in trash
    if (!trashFolder || document.folderId !== trashFolder.id) {
      return { success: false, error: "Document is not in trash" };
    }
    
    // Move document to target folder or root
    const result = moveDocument(docId, targetFolderId);
    
    if (!result) {
      return { success: false, error: "Failed to restore document" };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error restoring document from trash:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error)
    };
  }
}; 