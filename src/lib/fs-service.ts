// This file should only be imported in server components or API routes
import fs from 'fs';
import path from 'path';
import { Document, Folder, DocumentVersion } from './store';
import matter from 'gray-matter';
import yaml from 'js-yaml';
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
const writeJsonFile = (filePath: string, data: any) => {
  try {
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error(`Error writing JSON file ${filePath}:`, error);
    throw error;
  }
};

// Helper function to read JSON from a file
const readJsonFile = <T>(filePath: string, defaultValue: T): T => {
  try {
    if (!fs.existsSync(filePath)) {
      return defaultValue;
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data) as T;
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return defaultValue;
  }
};

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

// Parse a Markdown file with YAML frontmatter to a Document
const markdownToDocument = (filePath: string, relativePath: string): Document => {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(fileContent);
  
  // Extract the filename without extension as the document name
  const fileName = path.basename(filePath, '.md');
  
  // Determine the folder ID based on the relative path
  const folderPath = path.dirname(relativePath);
  const folders = loadFolders();
  let folderId: string | null = null;
  
  if (folderPath !== '.') {
    // Find or create folders for the path
    const pathParts = folderPath.split(path.sep);
    let currentPath = '';
    let parentId: string | null = null;
    
    for (const part of pathParts) {
      currentPath = currentPath ? path.join(currentPath, part) : part;
      let folder = folders.find(f => 
        sanitizeName(f.name) === part && f.parentId === parentId
      );
      
      if (!folder) {
        // Create a new folder if it doesn't exist
        folder = {
          id: `folder-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          name: part,
          createdAt: new Date(),
          parentId
        };
        folders.push(folder);
      }
      
      parentId = folder.id;
      folderId = folder.id;
    }
    
    // Save the updated folders
    writeJsonFile(FOLDERS_INDEX, folders);
  }
  
  // Parse annotations from frontmatter
  const annotations = Array.isArray(data.annotations) ? data.annotations.map((anno: any) => ({
    id: anno.id,
    documentId: anno.documentId,
    startOffset: anno.startOffset,
    endOffset: anno.endOffset,
    content: anno.content,
    color: anno.color,
    createdAt: anno.createdAt ? new Date(anno.createdAt) : new Date(),
    updatedAt: anno.updatedAt ? new Date(anno.updatedAt) : new Date(),
    tags: Array.isArray(anno.tags) ? anno.tags : []
  })) : [];
  
  // Create a document object
  const doc: Document = {
    id: data.id || `doc-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    name: data.name || fileName,
    content,
    createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
    updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
    versions: (data.versions || []).map((v: any) => ({
      id: v.id,
      content: '', // We don't store version content in the frontmatter
      createdAt: new Date(v.createdAt),
      message: v.message
    })),
    folderId,
    annotations: Array.isArray(data.annotations) ? data.annotations.map((anno: any) => ({
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
    contextDocuments: Array.isArray(data.contextDocuments) ? data.contextDocuments.map((contextDoc: any) => ({
      id: contextDoc.id,
      name: contextDoc.name
    })) : []
  };
  
  return doc;
};

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
    const docPathMap = new Map<string, string>();
    
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
          const { data, content } = matter(fileContent);
          
          // Extract the filename without extension as the document name
          const fileName = path.basename(fullPath, '.md');
          
          // Determine the folder ID based on the relative path
          const dirPath = path.dirname(entryRelativePath);
          let folderId: string | null = null;
          
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
            // If the existing doc has a different name or path, this is a duplicate ID
            if (existingDoc.name !== fileName || existingDoc.folderId !== folderId) {
              console.warn(`Duplicate document ID found: ${docId}. Generating new ID.`);
              docId = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            }
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
            versions: (data.versions || []).map((v: any) => ({
              id: v.id,
              content: '', // We don't store version content in the frontmatter
              createdAt: new Date(v.createdAt),
              message: v.message
            })),
            folderId,
            annotations: Array.isArray(data.annotations) ? data.annotations.map((anno: any) => ({
              id: anno.id,
              documentId: anno.documentId || docId, // Default to the document ID if not specified
              startOffset: anno.startOffset,
              endOffset: anno.endOffset,
              content: anno.content || '',
              color: anno.color || 'yellow',
              createdAt: anno.createdAt ? new Date(anno.createdAt) : new Date(),
              updatedAt: anno.updatedAt ? new Date(anno.updatedAt) : new Date(),
              tags: Array.isArray(anno.tags) ? anno.tags : []
            })) : [],
            contextDocuments: Array.isArray(data.contextDocuments) ? data.contextDocuments.map((contextDoc: any) => ({
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
    writeJsonFile(DOCUMENTS_INDEX, finalDocuments);
    
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
    writeJsonFile(FOLDERS_INDEX, folders);
    
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
    const document = documents.find(doc => doc.id === docId);
    
    if (!document) {
      return null;
    }
    
    // Get the old path before updating the name
    const folders = loadFolders();
    const oldPath = getDocumentPath(document, folders);
    
    // Update document name
    document.name = newName;
    document.updatedAt = new Date();
    
    // Get the new path after updating the name
    const newPath = getDocumentPath(document, folders);
    
    // Move the file if it exists
    if (fs.existsSync(oldPath)) {
      // Ensure the directory exists
      ensureDir(path.dirname(newPath));
      
      // Read the content
      const content = fs.readFileSync(oldPath, 'utf8');
      
      // Write to new location
      fs.writeFileSync(newPath, content, 'utf8');
      
      // Delete the old file - ensure this runs
      try {
        fs.unlinkSync(oldPath);
      } catch (deleteError) {
        console.error(`Error deleting old file at ${oldPath}:`, deleteError);
        // Try with rimraf-like approach if direct unlink fails
        if (fs.existsSync(oldPath)) {
          fs.writeFileSync(oldPath, '', 'utf8'); // Clear the file first
          fs.unlinkSync(oldPath); // Try delete again
        }
      }
    }
    
    // Update the index
    const updatedDocuments = documents.map(doc => 
      doc.id === docId ? document : doc
    );
    writeJsonFile(DOCUMENTS_INDEX, updatedDocuments);
    
    return document;
  } catch (error) {
    console.error('Error renaming document:', error);
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
    
    // Get the old path
    const oldPath = getFolderPath(folder, folders);
    
    // Update folder name
    folder.name = newName;
    
    // Get the new path
    const newPath = getFolderPath(folder, folders);
    
    // Move the directory
    if (fs.existsSync(oldPath)) {
      // Ensure the parent directory exists
      ensureDir(path.dirname(newPath));
      
      // Rename the directory
      fs.renameSync(oldPath, newPath);
    }
    
    // Update the index
    const updatedFolders = folders.map(f => 
      f.id === folderId ? folder : f
    );
    writeJsonFile(FOLDERS_INDEX, updatedFolders);
    
    return folder;
  } catch (error) {
    console.error('Error renaming folder:', error);
    throw error;
  }
};

// Move a document to a different folder
export const moveDocument = (docId: string, targetFolderId: string | null) => {
  try {
    // Get document metadata
    const documents = loadDocuments();
    const document = documents.find(doc => doc.id === docId);
    
    if (!document) {
      return null;
    }
    
    // Get the old path
    const folders = loadFolders();
    const oldPath = getDocumentPath(document, folders);
    
    // Update document folder
    document.folderId = targetFolderId;
    document.updatedAt = new Date();
    
    // Get the new path
    const newPath = getDocumentPath(document, folders);
    
    // Move the file
    if (fs.existsSync(oldPath)) {
      // Ensure the directory exists
      ensureDir(path.dirname(newPath));
      
      // Read the content
      const content = fs.readFileSync(oldPath, 'utf8');
      
      // Write to new location
      fs.writeFileSync(newPath, content, 'utf8');
      
      // Delete the old file
      fs.unlinkSync(oldPath);
    }
    
    // Update the index
    const updatedDocuments = documents.map(doc => 
      doc.id === docId ? document : doc
    );
    writeJsonFile(DOCUMENTS_INDEX, updatedDocuments);
    
    return document;
  } catch (error) {
    console.error('Error moving document:', error);
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
    
    // Get the old path
    const oldPath = getFolderPath(folder, folders);
    
    // Update folder parent
    folder.parentId = targetParentId;
    
    // Get the new path
    const newPath = getFolderPath(folder, folders);
    
    // Move the directory
    if (fs.existsSync(oldPath)) {
      // Ensure the parent directory exists
      ensureDir(path.dirname(newPath));
      
      // Rename/move the directory
      fs.renameSync(oldPath, newPath);
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

// Update links when a document is renamed
export const updateLinks = (oldName: string, newName: string) => {
  const documents = loadDocuments();
  let updatedCount = 0;
  
  for (const doc of documents) {
    const oldLink = `[[${oldName}]]`;
    const newLink = `[[${newName}]]`;
    
    if (doc.content.includes(oldLink)) {
      doc.content = doc.content.replace(new RegExp(escapeRegExp(oldLink), 'g'), newLink);
      doc.updatedAt = new Date();
      saveDocument(doc);
      updatedCount++;
    }
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
  });
  
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

// Process a template with variable substitution using Nunjucks
export const processTemplate = (templateName: string, variables: Record<string, any>): string => {
  try {
    const templatePath = path.join(TEMPLATES_DIR, `${templateName}.md`);
    
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template not found: ${templateName}`);
    }
    
    // Read the template content
    const templateContent = fs.readFileSync(templatePath, 'utf8');
    
    // Configure Nunjucks if not already configured
    const nunjucksEnv = configureNunjucks();
    
    // Default variables
    const defaultVariables = {
      date: new Date().toISOString(),
      dateFormatted: new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      time: new Date().toLocaleTimeString(),
      timeFormatted: new Date().toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      }),
      timestamp: new Date().getTime().toString(),
      year: new Date().getFullYear().toString(),
      month: (new Date().getMonth() + 1).toString().padStart(2, '0'),
      day: new Date().getDate().toString().padStart(2, '0'),
    };
    
    // Merge default variables with user-provided variables
    const mergedVariables: Record<string, any> = {
      ...defaultVariables,
      ...variables
    };
    
    // Process Date objects to ensure they're formatted correctly for Nunjucks
    const processDateValues = (obj: Record<string, any>): Record<string, any> => {
      const result: Record<string, any> = {};
      
      Object.entries(obj).forEach(([key, value]) => {
        // Handle Date objects
        if (value instanceof Date) {
          result[key] = value.toISOString();
        } 
        // Handle nested objects
        else if (value && typeof value === 'object' && !Array.isArray(value)) {
          result[key] = processDateValues(value as Record<string, any>);
        } 
        // Handle arrays
        else if (Array.isArray(value)) {
          result[key] = value.map(item => {
            if (item instanceof Date) {
              return item.toISOString();
            } else if (item && typeof item === 'object') {
              return processDateValues(item as Record<string, any>);
            }
            return item;
          });
        } 
        // Handle primitive values
        else {
          result[key] = value;
        }
      });
      
      return result;
    };
    
    // Process all variables to handle Date objects
    const processedVariables = processDateValues(mergedVariables);
    
    // Remove the schema definition from the template before processing
    // Using a workaround for the 's' flag (dotAll) for compatibility
    const schemaRegex = /\{%\s*set\s+schema\s*=\s*\{[^}]*(?:\{[^}]*\}[^}]*)*\}\s*%\}/g;
    const cleanedTemplate = templateContent.replace(schemaRegex, '');
    
    // Process the template with Nunjucks
    const processedContent = nunjucksEnv.renderString(cleanedTemplate, processedVariables);
    
    return processedContent;
  } catch (error) {
    console.error('Error processing template:', error);
    throw new Error(`Failed to process template: ${error instanceof Error ? error.message : String(error)}`);
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