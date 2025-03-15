/**
 * Utility functions for document filtering using GitIgnore pattern syntax
 * 
 * This implementation follows the GitIgnore specification for pattern matching:
 * - Blank lines or lines beginning with # are treated as comments
 * - Leading and trailing whitespaces are ignored unless escaped
 * - Patterns support wildcards (*, ?, **)
 * - Directory-specific patterns (ending with /)
 * - Anchored patterns (starting with /)
 * - Negation patterns (starting with !)
 * - Character ranges ([a-z])
 * - Proper precedence rules (top-down evaluation)
 */

import { Document, Folder } from './store';

/**
 * Converts a GitIgnore pattern to a regular expression
 * @param pattern The GitIgnore pattern to convert
 * @returns A RegExp object that matches the pattern
 */
function patternToRegExp(pattern: string): RegExp {
  try {
    // Handle empty patterns
    if (!pattern.trim()) {
      return /^$/;
    }

    // Remove trailing whitespace (unless escaped)
    pattern = pattern.replace(/(?<!\\)\s+$/, '');

    // Handle escaped leading whitespace
    pattern = pattern.replace(/^\\(\s)/, '$1');

    // Prepare the pattern for conversion
    let regexPattern = '';
    
    // Handle anchored patterns (starting with /)
    if (pattern.startsWith('/')) {
      regexPattern = '^';
      pattern = pattern.substring(1);
    } else {
      // Non-anchored patterns can match at any directory level
      regexPattern = '(^|/)';
    }
    
    // Process the pattern character by character
    let i = 0;
    while (i < pattern.length) {
      const char = pattern[i];
      
      if (char === '\\' && i + 1 < pattern.length) {
        // Handle escaped characters
        regexPattern += pattern[i + 1];
        i += 2;
      } else if (char === '*' && i + 1 < pattern.length && pattern[i + 1] === '*') {
        // Handle ** (matches any number of directories)
        if (i + 2 < pattern.length && pattern[i + 2] === '/') {
          // **/ matches zero or more directories
          regexPattern += '(.*?/)?';
          i += 3;
        } else {
          // ** without trailing slash matches anything
          regexPattern += '.*';
          i += 2;
        }
      } else if (char === '*') {
        // Handle * (matches zero or more characters except /)
        regexPattern += '[^/]*';
        i++;
      } else if (char === '?') {
        // Handle ? (matches exactly one character except /)
        regexPattern += '[^/]';
        i++;
      } else if (char === '[' && pattern.indexOf(']', i) > i) {
        // Handle character ranges [a-z]
        const closingBracket = pattern.indexOf(']', i);
        const range = pattern.substring(i, closingBracket + 1);
        regexPattern += range;
        i = closingBracket + 1;
      } else if (char === '/') {
        // Handle directory separator
        regexPattern += '/';
        i++;
      } else {
        // Handle regular characters
        regexPattern += escapeRegExp(char);
        i++;
      }
    }
    
    // Handle directory-specific patterns (ending with /)
    if (pattern.endsWith('/')) {
      // Match directories only
      regexPattern += '(?:/.*)?$';
    } else {
      // Match exact path
      regexPattern += '$';
    }
    
    return new RegExp(regexPattern, 'i'); // Case-insensitive matching
  } catch (error) {
    console.error(`Error creating regex from pattern "${pattern}":`, error);
    return /^$/; // Return a regex that won't match anything
  }
}

/**
 * Escapes special characters in a string for use in a regular expression
 * @param string The string to escape
 * @returns The escaped string
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Determines if a path should be included based on GitIgnore patterns
 * @param path The path to check
 * @param patterns Array of GitIgnore patterns
 * @returns True if the path should be included, false if it should be excluded
 */
export function matchesPatterns(path: string, patterns: string[]): boolean {
  try {
    // If no patterns, include everything
    if (!patterns || patterns.length === 0) {
      return true;
    }
    
    // Filter out comments and empty lines
    const validPatterns = patterns.filter(p => 
      p.trim() !== '' && !p.trim().startsWith('#')
    );
    
    if (validPatterns.length === 0) {
      return true; // No valid patterns, include everything
    }
    
    // Check if we have any non-negated patterns
    const hasPositivePatterns = validPatterns.some(p => !p.startsWith('!'));
    
    // Default inclusion state:
    // - If we only have negated patterns, default is to include
    // - If we have any non-negated patterns, default is to exclude
    let isIncluded = !hasPositivePatterns;
    
    // Process patterns in order (top-down evaluation)
    for (const pattern of validPatterns) {
      try {
        // Skip empty patterns
        if (!pattern.trim()) continue;
        
        // Handle negation patterns
        const isNegated = pattern.startsWith('!');
        const cleanPattern = isNegated ? pattern.substring(1).trim() : pattern.trim();
        
        // Skip empty patterns after removing negation
        if (!cleanPattern) continue;
        
        // Convert pattern to regex and test against path
        const regex = patternToRegExp(cleanPattern);
        const isMatch = regex.test(path);
        
        if (isMatch) {
          // If pattern matches:
          // - For negated patterns (!), include the file
          // - For regular patterns, exclude the file
          isIncluded = isNegated;
        }
      } catch (patternError) {
        console.error(`Error processing pattern "${pattern}":`, patternError);
        continue; // Skip this pattern and continue with the next one
      }
    }
    
    return isIncluded;
  } catch (error) {
    console.error(`Error in matchesPatterns for path "${path}":`, error);
    return true; // In case of error, include the document (fail open)
  }
}

/**
 * Gets the full path for a document including folder hierarchy
 * @param doc The document
 * @param folders All folders in the system
 * @returns The full path of the document
 */
export function getDocumentPath(doc: Document, folders: Folder[]): string {
  try {
    // Start with the document name
    let path = doc.name;
    let currentFolderId = doc.folderId;
    
    // Build the path by traversing up the folder hierarchy
    const folderPath: string[] = [];
    while (currentFolderId) {
      const folder = folders.find(f => f.id === currentFolderId);
      if (!folder) break;
      
      // Add folder to the beginning of the path array
      folderPath.unshift(folder.name);
      currentFolderId = folder.parentId;
    }
    
    // Construct the full path
    const fullPath = folderPath.length > 0 
      ? `${folderPath.join('/')}/${path}` 
      : path;
      
    return fullPath;
  } catch (error) {
    console.error(`Error getting path for document "${doc.id}":`, error);
    return doc.name; // Return just the document name as fallback
  }
}

/**
 * Filters documents based on GitIgnore patterns
 * @param documents All documents
 * @param folders All folders
 * @param patterns Array of GitIgnore patterns
 * @returns Filtered documents
 */
export function filterDocuments(
  documents: Document[], 
  folders: Folder[], 
  patterns: string[]
): Document[] {
  try {
    // If no patterns, return all documents
    if (!patterns || patterns.length === 0) {
      return documents;
    }
    
    // Filter documents based on patterns
    return documents.filter(doc => {
      const path = getDocumentPath(doc, folders);
      return matchesPatterns(path, patterns);
    });
  } catch (error) {
    console.error('Error filtering documents:', error);
    return documents; // Return all documents in case of error
  }
}

/**
 * Validates GitIgnore patterns and returns any errors
 * @param patterns Array of GitIgnore patterns
 * @returns Array of error messages, empty if all patterns are valid
 */
export function validatePatterns(patterns: string[]): string[] {
  const errors: string[] = [];
  
  if (!patterns || patterns.length === 0) {
    return errors; // No patterns, no errors
  }
  
  // Check each pattern for validity
  patterns.forEach((pattern, index) => {
    // Skip comments and empty lines
    if (pattern.trim() === '' || pattern.trim().startsWith('#')) {
      return;
    }
    
    try {
      // Try to create a regex from the pattern
      patternToRegExp(pattern.startsWith('!') ? pattern.substring(1).trim() : pattern.trim());
    } catch (error: any) {
      errors.push(`Pattern ${index + 1} "${pattern}" is invalid: ${error.message || 'Unknown error'}`);
    }
  });
  
  return errors;
}

/**
 * Checks if a specific folder should be visible based on patterns
 * @param folderId The folder ID to check
 * @param folders All folders
 * @param filteredDocuments Documents that passed the filter
 * @returns True if the folder should be visible
 */
export function shouldShowFolder(
  folderId: string,
  folders: Folder[],
  filteredDocuments: Document[]
): boolean {
  // Get all documents in this folder
  const documentsInFolder = filteredDocuments.filter(doc => doc.folderId === folderId);
  
  // If this folder has visible documents, show it
  if (documentsInFolder.length > 0) {
    return true;
  }
  
  // Check if any child folders have visible documents
  const childFolders = folders.filter(f => f.parentId === folderId);
  
  for (const childFolder of childFolders) {
    if (shouldShowFolder(childFolder.id, folders, filteredDocuments)) {
      return true;
    }
  }
  
  // No visible documents in this folder or its children
  return false;
}
