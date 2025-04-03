import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { DocumentSession } from '@/lib/session-store';

// Define paths
const VAULT_DIR = path.join(process.cwd(), 'vault');
const SYSTEM_DIR = path.join(VAULT_DIR, 'system');
const SESSIONS_FILE = path.join(SYSTEM_DIR, 'sessions.md');

// Parse sessions from markdown content
const parseSessionsFromMarkdown = (content: string): DocumentSession[] => {
  if (!content) return [];
  
  const sessions: DocumentSession[] = [];
  const sessionBlocks = content.split(/^## Session:/gm).filter(block => block.trim());
  
  for (const block of sessionBlocks) {
    try {
      const lines = block.split('\n').filter(line => line.trim());
      
      // Extract session name from the first line
      const name = lines[0].trim();
      
      // Extract description (if exists)
      const descriptionLine = lines.find(line => line.startsWith('Description:'));
      const description = descriptionLine
        ? descriptionLine.substring('Description:'.length).trim()
        : undefined;
      
      // Extract color (if exists)
      const colorLine = lines.find(line => line.startsWith('Color:'));
      const color = colorLine
        ? colorLine.substring('Color:'.length).trim()
        : undefined;
      
      // Extract dates
      const createdLine = lines.find(line => line.startsWith('Created:'));
      const lastAccessedLine = lines.find(line => line.startsWith('Last accessed:'));
      
      const created = createdLine
        ? new Date(createdLine.substring('Created:'.length).trim())
        : new Date();
      
      const lastAccessed = lastAccessedLine
        ? new Date(lastAccessedLine.substring('Last accessed:'.length).trim())
        : new Date();
      
      // Extract document IDs
      const documentsLine = lines.findIndex(line => line.startsWith('Documents:'));
      const documentIds: string[] = [];
      
      if (documentsLine !== -1) {
        const startIndex = documentsLine + 1;
        
        // Go through subsequent lines that start with dashes (list items)
        for (let i = startIndex; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.startsWith('- ')) {
            // Extract document ID from markdown list item
            const docId = line.substring(2).trim();
            documentIds.push(docId);
          } else if (!line.startsWith('-')) {
            // Stop when we hit a non-list item
            break;
          }
        }
      }
      
      // Generate a stable ID for the session
      const id = `session-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${created.getTime()}`;
      
      sessions.push({
        id,
        name,
        description,
        documentIds,
        created,
        lastAccessed,
        color,
      });
    } catch (error) {
      console.error('Error parsing session block:', error);
      // Continue with next session block
    }
  }
  
  return sessions;
};

// Convert sessions to markdown format
const formatSessionsToMarkdown = (sessions: DocumentSession[]): string => {
  if (!sessions.length) return '# Document Sessions\n\nNo sessions defined yet.\n';
  
  let markdown = '# Document Sessions\n\n';
  
  for (const session of sessions) {
    markdown += `## Session: ${session.name}\n\n`;
    
    if (session.description) {
      markdown += `Description: ${session.description}\n`;
    }
    
    if (session.color) {
      markdown += `Color: ${session.color}\n`;
    }
    
    markdown += `Created: ${session.created.toISOString()}\n`;
    markdown += `Last accessed: ${session.lastAccessed.toISOString()}\n\n`;
    
    markdown += 'Documents:\n';
    for (const docId of session.documentIds) {
      markdown += `- ${docId}\n`;
    }
    
    markdown += '\n';
  }
  
  return markdown;
};

// Ensure system directory exists
const ensureSystemDirectory = () => {
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
    
    return true;
  } catch (error) {
    console.error('Error ensuring system directory:', error);
    return false;
  }
};

// POST /api/sessions/documents - Add a document to a session
export async function POST(request: NextRequest) {
  try {
    const { sessionId, documentId } = await request.json();
    
    if (!sessionId || !documentId) {
      return NextResponse.json(
        { error: 'Session ID and Document ID are required' },
        { status: 400 }
      );
    }
    
    // Ensure the system directory exists
    ensureSystemDirectory();
    
    // Check if the sessions file exists
    if (!fs.existsSync(SESSIONS_FILE)) {
      return NextResponse.json(
        { error: 'Sessions file not found' },
        { status: 404 }
      );
    }
    
    // Read existing sessions
    const content = fs.readFileSync(SESSIONS_FILE, 'utf8');
    const sessions = parseSessionsFromMarkdown(content);
    
    // Find the session
    const sessionIndex = sessions.findIndex(s => s.id === sessionId);
    if (sessionIndex === -1) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }
    
    // Check if document is already in the session
    if (sessions[sessionIndex].documentIds.includes(documentId)) {
      return NextResponse.json(
        { success: true, message: 'Document already in session' }
      );
    }
    
    // Add document to session
    sessions[sessionIndex] = {
      ...sessions[sessionIndex],
      documentIds: [...sessions[sessionIndex].documentIds, documentId],
      lastAccessed: new Date()
    };
    
    // Convert sessions to markdown
    const markdown = formatSessionsToMarkdown(sessions);
    
    // Save to file
    fs.writeFileSync(SESSIONS_FILE, markdown, 'utf8');
    
    return NextResponse.json({ 
      success: true, 
      session: sessions[sessionIndex]
    });
  } catch (error) {
    console.error('Error adding document to session:', error);
    return NextResponse.json(
      { error: 'Failed to add document to session' },
      { status: 500 }
    );
  }
}

// DELETE /api/sessions/documents - Remove a document from a session
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');
    const documentId = url.searchParams.get('documentId');
    
    if (!sessionId || !documentId) {
      return NextResponse.json(
        { error: 'Session ID and Document ID are required' },
        { status: 400 }
      );
    }
    
    // Ensure the system directory exists
    ensureSystemDirectory();
    
    // Check if the sessions file exists
    if (!fs.existsSync(SESSIONS_FILE)) {
      return NextResponse.json(
        { error: 'Sessions file not found' },
        { status: 404 }
      );
    }
    
    // Read existing sessions
    const content = fs.readFileSync(SESSIONS_FILE, 'utf8');
    const sessions = parseSessionsFromMarkdown(content);
    
    // Find the session
    const sessionIndex = sessions.findIndex(s => s.id === sessionId);
    if (sessionIndex === -1) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }
    
    // Check if document is in the session
    if (!sessions[sessionIndex].documentIds.includes(documentId)) {
      return NextResponse.json(
        { success: true, message: 'Document not in session' }
      );
    }
    
    // Remove document from session
    sessions[sessionIndex] = {
      ...sessions[sessionIndex],
      documentIds: sessions[sessionIndex].documentIds.filter(id => id !== documentId),
      lastAccessed: new Date()
    };
    
    // Convert sessions to markdown
    const markdown = formatSessionsToMarkdown(sessions);
    
    // Save to file
    fs.writeFileSync(SESSIONS_FILE, markdown, 'utf8');
    
    return NextResponse.json({ 
      success: true, 
      session: sessions[sessionIndex]
    });
  } catch (error) {
    console.error('Error removing document from session:', error);
    return NextResponse.json(
      { error: 'Failed to remove document from session' },
      { status: 500 }
    );
  }
} 