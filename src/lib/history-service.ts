'use server'

import fs from 'fs';
import path from 'path';
import { format } from 'date-fns';

// Base directory for the vault
const VAULT_DIR = path.join(process.cwd(), 'vault');
const SYSTEM_DIR = path.join(VAULT_DIR, 'system');
const HISTORY_FILE = path.join(SYSTEM_DIR, 'history.md');

/**
 * Ensure the system directory exists
 */
export const ensureSystemDirectory = async () => {
  try {
    // Make sure the vault directory exists first
    if (!fs.existsSync(VAULT_DIR)) {
      console.log(`Creating vault directory at ${VAULT_DIR}`);
      fs.mkdirSync(VAULT_DIR, { recursive: true });
    }
    
    // Then make sure the system directory exists
    if (!fs.existsSync(SYSTEM_DIR)) {
      console.log(`Creating system directory at ${SYSTEM_DIR}`);
      fs.mkdirSync(SYSTEM_DIR, { recursive: true });
    }
    
    console.log(`Directory structure verified: ${SYSTEM_DIR}`);
    return true;
  } catch (error) {
    console.error('Error ensuring system directory:', error);
    return false;
  }
};

/**
 * Initialize the history file if it doesn't exist
 */
export const initHistoryFile = async () => {
  try {
    // Ensure directories exist
    await ensureSystemDirectory();
    
    // Check if file exists
    if (!fs.existsSync(HISTORY_FILE)) {
      console.log(`Creating new history file at ${HISTORY_FILE}`);
      
      // Create markdown file with header
      const content = `# Chat History

This file contains a record of all user messages from the AI chat interface.

## History
`;
      try {
        fs.writeFileSync(HISTORY_FILE, content, 'utf8');
        console.log(`Successfully created history file`);
        return true;
      } catch (writeError) {
        console.error(`Error writing history file: ${writeError instanceof Error ? writeError.message : 'Unknown error'}`);
        return false;
      }
    } else {
      console.log(`History file already exists at ${HISTORY_FILE}`);
      return true;
    }
  } catch (error) {
    console.error('Error initializing history file:', error);
    return false;
  }
};

/**
 * Append a user message to the history file
 * @param message The user message to append
 * @returns Boolean indicating success or failure
 */
export async function appendToHistory(message: string): Promise<boolean> {
  console.log(`Attempting to append message to history file at ${HISTORY_FILE}`);
  
  try {
    // Initialize file if needed
    if (!fs.existsSync(HISTORY_FILE)) {
      const initialized = await initHistoryFile();
      if (!initialized) return false;
    }
    
    // Format the current date
    const timestamp = format(new Date(), "yyyy-MM-dd HH:mm:ss");
    
    // Format the message with timestamp
    const formattedMessage = `\n### ${timestamp}\n\n${message}\n`;
    
    // Append to file
    try {
      fs.appendFileSync(HISTORY_FILE, formattedMessage, 'utf8');
      console.log(`Successfully appended message to history file`);
      return true;
    } catch (writeError) {
      console.error("Error appending to history file:", writeError);
      return false;
    }
  } catch (error) {
    console.error('Error appending to history file:', error);
    return false;
  }
}

/**
 * Read the history file
 * @returns The content of the history file
 */
export async function readHistory(): Promise<string> {
  try {
    // Initialize file if needed
    if (!fs.existsSync(HISTORY_FILE)) {
      const initialized = await initHistoryFile();
      if (!initialized) return 'Failed to initialize history file';
    }
    
    // Read the file
    const content = fs.readFileSync(HISTORY_FILE, 'utf8');
    return content;
  } catch (error) {
    console.error('Error reading history file:', error);
    return 'Error reading history file';
  }
}

/**
 * Extract user messages from the history file
 * @returns An array of {timestamp: string, message: string} objects
 */
export async function getUserMessages(): Promise<Array<{timestamp: string, message: string}>> {
  try {
    const content = await readHistory();
    
    // If there's no content or an error occurred
    if (!content || content.startsWith('Error') || content.startsWith('Failed')) {
      return [];
    }
    
    // Regular expression to match timestamp headers and the messages that follow
    const messageRegex = /### ([\d-]+ [\d:]+)\s+\n\s*([^#]+)/g;
    const messages: Array<{timestamp: string, message: string}> = [];
    
    // Find all matches in the content
    let match;
    while ((match = messageRegex.exec(content)) !== null) {
      const timestamp = match[1];
      const message = match[2].trim();
      
      if (message) {
        messages.push({ timestamp, message });
      }
    }
    
    return messages.reverse(); // Return most recent first
  } catch (error) {
    console.error('Error extracting user messages:', error);
    return [];
  }
} 