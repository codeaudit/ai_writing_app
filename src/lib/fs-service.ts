// This file should only be imported in server components or API routes
import fs from 'fs';
import path from 'path';
import { Document, Folder, DocumentVersion } from './store';

// Base directory for all files and folders
const ROOT_DIR = path.join(process.cwd(), 'data');

// Ensure root directory exists
try {
  if (!fs.existsSync(ROOT_DIR)) {
    fs.mkdirSync(ROOT_DIR, { recursive: true });
  }
} catch (error) {
  console.error('Error creating root directory:', error);
}

// File paths
const DOCUMENTS_FILE = path.join(ROOT_DIR, 'documents.json');
const FOLDERS_FILE = path.join(ROOT_DIR, 'folders.json');

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
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error(`Error writing to ${filePath}:`, error);
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

// Get the file path for a document's content
const getDocumentFilePath = (docId: string, docName: string) => {
  const sanitizedName = docName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  return path.join(ROOT_DIR, `${sanitizedName}-${docId}.md`);
};

// Get the folder path for a folder
const getFolderPath = (folderId: string, folderName: string) => {
  const sanitizedName = folderName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  return path.join(ROOT_DIR, sanitizedName);
};

// Save a document to the file system
export const saveDocument = (document: Document) => {
  try {
    // Save document metadata
    const documents = readJsonFile<Document[]>(DOCUMENTS_FILE, []);
    const existingIndex = documents.findIndex(doc => doc.id === document.id);
    
    if (existingIndex >= 0) {
      documents[existingIndex] = document;
    } else {
      documents.push(document);
    }
    
    writeJsonFile(DOCUMENTS_FILE, documents);
    
    // Save document content to a separate file
    fs.writeFileSync(getDocumentFilePath(document.id, document.name), document.content, 'utf8');
    
    return document;
  } catch (error) {
    console.error('Error saving document:', error);
    throw error;
  }
};

// Load all documents from the file system
export const loadDocuments = (): Document[] => {
  try {
    return readJsonFile<Document[]>(DOCUMENTS_FILE, []);
  } catch (error) {
    console.error('Error loading documents:', error);
    return [];
  }
};

// Save a folder to the file system
export const saveFolder = (folder: Folder) => {
  try {
    // Save folder metadata
    const folders = readJsonFile<Folder[]>(FOLDERS_FILE, []);
    const existingIndex = folders.findIndex(f => f.id === folder.id);
    
    if (existingIndex >= 0) {
      folders[existingIndex] = folder;
    } else {
      folders.push(folder);
    }
    
    writeJsonFile(FOLDERS_FILE, folders);
    
    // Create folder directory if it doesn't exist
    ensureDir(getFolderPath(folder.id, folder.name));
    
    return folder;
  } catch (error) {
    console.error('Error saving folder:', error);
    throw error;
  }
};

// Load all folders from the file system
export const loadFolders = (): Folder[] => {
  try {
    return readJsonFile<Folder[]>(FOLDERS_FILE, []);
  } catch (error) {
    console.error('Error loading folders:', error);
    return [];
  }
};

// Delete a document from the file system
export const deleteDocument = (docId: string) => {
  try {
    // Remove document metadata
    const documents = readJsonFile<Document[]>(DOCUMENTS_FILE, []);
    const document = documents.find(doc => doc.id === docId);
    
    if (!document) {
      return;
    }
    
    const updatedDocuments = documents.filter(doc => doc.id !== docId);
    writeJsonFile(DOCUMENTS_FILE, updatedDocuments);
    
    // Remove document file
    const filePath = getDocumentFilePath(docId, document.name);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
};

// Delete a folder from the file system
export const deleteFolder = (folderId: string) => {
  try {
    // Remove folder metadata
    const folders = readJsonFile<Folder[]>(FOLDERS_FILE, []);
    const folder = folders.find(f => f.id === folderId);
    
    if (!folder) {
      return;
    }
    
    const updatedFolders = folders.filter(f => f.id !== folderId);
    writeJsonFile(FOLDERS_FILE, updatedFolders);
    
    // Remove folder directory (but not the documents inside)
    const folderPath = getFolderPath(folderId, folder.name);
    if (fs.existsSync(folderPath)) {
      try {
        fs.rmdirSync(folderPath);
      } catch (error) {
        console.error(`Error removing folder directory ${folderPath}:`, error);
      }
    }
  } catch (error) {
    console.error('Error deleting folder:', error);
    throw error;
  }
}; 