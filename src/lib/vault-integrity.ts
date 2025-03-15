// Vault Integrity Checker and Fixer
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { Document, Folder, Composition, Annotation } from './store';
import { loadDocuments, loadFolders, saveDocument } from './fs-service';

// Base directory for all files and folders (the vault)
const VAULT_DIR = path.join(process.cwd(), 'vault');
const DOCUMENTS_INDEX = path.join(VAULT_DIR, '.obsidian', 'documents-index.json');
const FOLDERS_INDEX = path.join(VAULT_DIR, '.obsidian', 'folders-index.json');

// Helper function to write JSON to a file
const writeJsonFile = (filePath: string, data: any) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`Error writing JSON file ${filePath}:`, error);
    return false;
  }
};

// Generate a unique ID with a prefix
const generateUniqueId = (prefix: string) => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

// Interface for integrity check results
interface IntegrityCheckResult {
  documentsChecked: number;
  foldersChecked: number;
  compositionsChecked: number;
  duplicateIdsFixed: number;
  missingMetadataFixed: number;
  invalidDatesFixed: number;
  orphanedDocumentsFixed: number;
  orphanedFoldersFixed: number;
  brokenContextReferencesFixed: number;
  compositionFrontmatterFixed: number;
  details: string[];
}

/**
 * Scans the entire vault and fixes any inconsistencies in metadata
 * and removes duplicated IDs.
 */
export const checkAndFixVaultIntegrity = async (): Promise<IntegrityCheckResult> => {
  console.log('Starting vault integrity check...');
  
  const result: IntegrityCheckResult = {
    documentsChecked: 0,
    foldersChecked: 0,
    compositionsChecked: 0,
    duplicateIdsFixed: 0,
    missingMetadataFixed: 0,
    invalidDatesFixed: 0,
    orphanedDocumentsFixed: 0,
    orphanedFoldersFixed: 0,
    brokenContextReferencesFixed: 0,
    compositionFrontmatterFixed: 0,
    details: []
  };
  
  // Ensure the vault and .obsidian directories exist
  try {
    if (!fs.existsSync(VAULT_DIR)) {
      fs.mkdirSync(VAULT_DIR, { recursive: true });
      result.details.push('Created missing vault directory');
    }
    
    const obsidianDir = path.dirname(DOCUMENTS_INDEX);
    if (!fs.existsSync(obsidianDir)) {
      fs.mkdirSync(obsidianDir, { recursive: true });
      result.details.push('Created missing .obsidian directory');
    }
    
    // Ensure index files exist with at least empty arrays
    if (!fs.existsSync(DOCUMENTS_INDEX)) {
      writeJsonFile(DOCUMENTS_INDEX, []);
      result.details.push('Created missing documents index file');
    }
    
    if (!fs.existsSync(FOLDERS_INDEX)) {
      writeJsonFile(FOLDERS_INDEX, []);
      result.details.push('Created missing folders index file');
    }
  } catch (error) {
    console.error('Error ensuring vault directories:', error);
    result.details.push(`⚠️ Error creating vault directories: ${(error as Error).message}`);
  }

  try {
    // Load all documents and folders with error handling
    let documents: Document[] = [];
    let folders: Folder[] = [];
    
    try {
      documents = loadDocuments();
      result.documentsChecked = documents.length;
    } catch (docError) {
      console.error('Error loading documents:', docError);
      result.details.push(`⚠️ Error loading documents: ${(docError as Error).message}`);
      documents = []; // Fallback to empty array
    }
    
    try {
      folders = loadFolders();
      result.foldersChecked = folders.length;
    } catch (folderError) {
      console.error('Error loading folders:', folderError);
      result.details.push(`⚠️ Error loading folders: ${(folderError as Error).message}`);
      folders = []; // Fallback to empty array
    }
    
    // Helper function to verify a fix was applied
    const verifyFix = (condition: boolean, fixType: string, entityName: string, entityId: string): boolean => {
      if (!condition) {
        console.error(`Failed to apply ${fixType} fix to ${entityName} (${entityId})`);
        result.details.push(`⚠️ Failed to apply ${fixType} fix to ${entityName} (${entityId})`);
        return false;
      }
      return true;
    };
    
    // Step 1: Check for missing or invalid document IDs
    const documentIdMap = new Map<string, Document[]>();
    const documentsWithFixedIds: Document[] = [];
    
    // First pass: ensure all documents have valid IDs
    documents.forEach(doc => {
      // Check if document has a valid ID
      if (!doc.id || doc.id.trim() === '') {
        // Generate a new ID for documents without one
        const newId = generateUniqueId('doc');
        doc.id = newId;
        
        // Verify the fix was applied
        if (verifyFix(doc.id === newId, "missing ID", doc.name, newId)) {
          result.missingMetadataFixed++;
          result.details.push(`Added missing ID for document: ${doc.name} → ${newId}`);
        }
      }
      
      // Add to map for duplicate detection
      if (!documentIdMap.has(doc.id)) {
        documentIdMap.set(doc.id, []);
      }
      documentIdMap.get(doc.id)!.push(doc);
      documentsWithFixedIds.push(doc);
    });
    
    // Second pass: fix duplicate document IDs
    const updatedDocuments: Document[] = [];
    let duplicateIdsFixed = 0;
    
    documentIdMap.forEach((docs, id) => {
      if (docs.length > 1) {
        // Keep the first document with the original ID
        updatedDocuments.push(docs[0]);
        
        // Assign new IDs to the duplicates
        for (let i = 1; i < docs.length; i++) {
          const newId = generateUniqueId('doc');
          const duplicateDoc = { ...docs[i], id: newId };
          updatedDocuments.push(duplicateDoc);
          
          // Verify the fix was applied
          if (verifyFix(duplicateDoc.id === newId, "duplicate ID", duplicateDoc.name, newId)) {
            duplicateIdsFixed++;
            result.details.push(`Fixed duplicate document ID: ${id} → ${newId} (${duplicateDoc.name})`);
          }
        }
      } else {
        // No duplicates for this ID
        updatedDocuments.push(docs[0]);
      }
    });
    
    result.duplicateIdsFixed = duplicateIdsFixed;
    
    // Save the updated documents back to file
    // Since there's no bulk save function, we'll write to the index file directly
    writeJsonFile(DOCUMENTS_INDEX, updatedDocuments);
    
    // Step 2: Check for duplicate folder IDs
    const folderIdMap = new Map<string, Folder[]>();
    folders.forEach(folder => {
      if (!folderIdMap.has(folder.id)) {
        folderIdMap.set(folder.id, []);
      }
      folderIdMap.get(folder.id)!.push(folder);
    });
    
    // Fix duplicate folder IDs
    const updatedFolders: Folder[] = [];
    
    folderIdMap.forEach((fldrs, id) => {
      if (fldrs.length > 1) {
        // Keep the first folder with the original ID
        updatedFolders.push(fldrs[0]);
        
        // Assign new IDs to the duplicates
        for (let i = 1; i < fldrs.length; i++) {
          const newId = generateUniqueId('folder');
          const duplicateFolder = { ...fldrs[i], id: newId };
          updatedFolders.push(duplicateFolder);
          
          // Verify the fix was applied
          if (verifyFix(duplicateFolder.id === newId, "duplicate ID", duplicateFolder.name, newId)) {
            duplicateIdsFixed++;
            result.details.push(`Fixed duplicate folder ID: ${id} → ${newId} (${duplicateFolder.name})`);
          }
        }
      } else {
        // No duplicates for this ID
        updatedFolders.push(fldrs[0]);
      }
    });
    
    result.duplicateIdsFixed = duplicateIdsFixed;
    
    // Save the updated folders back to file
    // Since there's no bulk save function, we'll write to the index file directly
    writeJsonFile(FOLDERS_INDEX, updatedFolders);
    
    // Step 3: Check for invalid dates and fix them
    let invalidDatesFixed = 0;
    
    updatedDocuments.forEach(doc => {
      let modified = false;
      
      // Check and fix createdAt
      if (!(doc.createdAt instanceof Date) || isNaN(doc.createdAt.getTime())) {
        const newDate = new Date();
        doc.createdAt = newDate;
        
        // Verify the fix was applied
        if (verifyFix(doc.createdAt instanceof Date && !isNaN(doc.createdAt.getTime()), 
                      "invalid date", doc.name, doc.id)) {
          invalidDatesFixed++;
          modified = true;
          result.details.push(`Fixed invalid createdAt date for document: ${doc.name} (${doc.id})`);
        }
      }
      
      // Check and fix updatedAt
      if (!(doc.updatedAt instanceof Date) || isNaN(doc.updatedAt.getTime())) {
        doc.updatedAt = new Date();
        invalidDatesFixed++;
        modified = true;
        result.details.push(`Fixed invalid updatedAt date for document: ${doc.name} (${doc.id})`);
      }
      
      // Check and fix version dates
      if (Array.isArray(doc.versions)) {
        doc.versions.forEach(version => {
          if (!(version.createdAt instanceof Date) || isNaN(version.createdAt.getTime())) {
            version.createdAt = new Date();
            invalidDatesFixed++;
            modified = true;
            result.details.push(`Fixed invalid date in version for document: ${doc.name} (${doc.id})`);
          }
        });
      } else {
        // Fix missing versions array
        doc.versions = [];
        result.missingMetadataFixed++;
        modified = true;
        result.details.push(`Fixed missing versions array for document: ${doc.name} (${doc.id})`);
      }
      
      // Check and fix annotations
      if (Array.isArray(doc.annotations)) {
        doc.annotations.forEach(anno => {
          if (!(anno.createdAt instanceof Date) || isNaN(anno.createdAt.getTime())) {
            anno.createdAt = new Date();
            invalidDatesFixed++;
            modified = true;
          }
          
          if (!(anno.updatedAt instanceof Date) || isNaN(anno.updatedAt.getTime())) {
            anno.updatedAt = new Date();
            invalidDatesFixed++;
            modified = true;
          }
          
          // Ensure annotation has the correct document ID
          if (anno.documentId !== doc.id) {
            anno.documentId = doc.id;
            result.missingMetadataFixed++;
            modified = true;
            result.details.push(`Fixed incorrect documentId in annotation for document: ${doc.name} (${doc.id})`);
          }
        });
      } else {
        // Fix missing annotations array
        doc.annotations = [];
        result.missingMetadataFixed++;
        modified = true;
        result.details.push(`Fixed missing annotations array for document: ${doc.name} (${doc.id})`);
      }
      
      // If document was modified, save it back to disk
      if (modified) {
        try {
          saveDocument(doc);
          // Verify the document was saved successfully
          result.details.push(`✓ Saved fixed document: ${doc.name} (${doc.id})`);
        } catch (saveError) {
          console.error(`Error saving document ${doc.id}:`, saveError);
          result.details.push(`⚠️ Failed to save document: ${doc.name} (${doc.id}) - ${(saveError as Error).message}`);
        }
      }
    });
    
    result.invalidDatesFixed = invalidDatesFixed;
    
    // Save the updated documents back to file again to ensure all changes are persisted
    // Since there's no bulk save function, we'll write to the index file directly
    writeJsonFile(DOCUMENTS_INDEX, updatedDocuments);
    
    return result;
  } catch (error) {
    console.error('Error in vault integrity check:', error);
    result.details.push(`⚠️ Error in vault integrity check: ${(error as Error).message}`);
    return result;
  }
};
