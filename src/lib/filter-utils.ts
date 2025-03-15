/**
 * Utility functions for document filtering using Git-style patterns
 */

import { Document, Folder } from './store';

/**
 * Convert a glob pattern to a regular expression
 * @param pattern The glob pattern to convert
 * @returns A RegExp object that matches the pattern
 */
export function globToRegExp(pattern: string): RegExp {
  // Escape special regex characters except * and ?
  let regexPattern = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  
  // Convert glob * to regex .*
  regexPattern = regexPattern.replace(/\*/g, '.*');
  
  // Convert glob ? to regex .
  regexPattern = regexPattern.replace(/\?/g, '.');
  
  // Ensure the pattern matches the entire string
  regexPattern = `^${regexPattern}$`;
  
  return new RegExp(regexPattern);
}

/**
 * Check if a path matches any of the provided patterns
 * @param path The path to check
 * @param patterns Array of glob patterns
 * @returns True if the path matches any pattern
 */
export function matchesPatterns(path: string, patterns: string[]): boolean {
  if (!patterns || patterns.length === 0) {
    return true; // If no patterns, match everything
  }
  
  // First, check if there are any positive patterns
  const hasPositivePatterns = patterns.some(p => !p.startsWith('!') && !p.startsWith('#'));
  
  // Start with default inclusion state
  // If we have positive patterns, default is to exclude unless matched
  // If we only have negative patterns, default is to include unless excluded
  let isIncluded = !hasPositivePatterns;
  
  // Process patterns in order
  for (const pattern of patterns) {
    // Skip comments and empty lines
    if (pattern.trim().startsWith('#') || pattern.trim() === '') {
      continue;
    }
    
    if (pattern.startsWith('!')) {
      // Negated pattern - exclude if matched
      const negatedPattern = pattern.substring(1);
      if (matchesPattern(path, negatedPattern)) {
        isIncluded = false;
      }
    } else {
      // Regular pattern - include if matched
      if (matchesPattern(path, pattern)) {
        isIncluded = true;
      }
    }
  }
  
  return isIncluded;
}

/**
 * Check if a path matches a single pattern
 * @param path The path to check
 * @param pattern The glob pattern
 * @returns True if the path matches the pattern
 */
function matchesPattern(path: string, pattern: string): boolean {
  const regex = globToRegExp(pattern);
  return regex.test(path);
}

/**
 * Get the full path for a document including folder hierarchy
 * @param doc The document
 * @param folders All folders in the system
 * @returns The full path of the document
 */
export function getDocumentPath(doc: Document, folders: Folder[]): string {
  let path = `${doc.name}.md`;
  let currentFolderId = doc.folderId;
  
  // Build the path by traversing up the folder hierarchy
  while (currentFolderId) {
    const folder = folders.find(f => f.id === currentFolderId);
    if (!folder) break;
    
    path = `${folder.name}/${path}`;
    currentFolderId = folder.parentId;
  }
  
  return path;
}

/**
 * Filter documents based on a set of patterns
 * @param documents All documents
 * @param folders All folders
 * @param patterns Array of glob patterns
 * @returns Filtered documents
 */
export function filterDocuments(
  documents: Document[], 
  folders: Folder[], 
  patterns: string[]
): Document[] {
  if (!patterns || patterns.length === 0) {
    return documents; // No filtering
  }
  
  return documents.filter(doc => {
    const path = getDocumentPath(doc, folders);
    return matchesPatterns(path, patterns);
  });
}
