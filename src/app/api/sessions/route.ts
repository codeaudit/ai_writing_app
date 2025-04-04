import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { DocumentSession } from '@/lib/session-store';

// Define paths
const VAULT_DIR = path.join(process.cwd(), 'vault');
const SYSTEM_DIR = path.join(VAULT_DIR, 'system');
const SESSIONS_FILE = path.join(SYSTEM_DIR, 'sessions.md');

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

// Parse sessions from markdown content
const parseSessionsFromMarkdown = (content: string): DocumentSession[] => {
  if (!content) return [];
  
  const sessions: DocumentSession[] = [];
  
  // First extract the header section separately
  const parts = content.split(/^# Document Sessions/m);
  // Skip the header part and process only the session blocks
  const sessionsContent = parts.length > 1 ? parts[1] : content;
  
  const sessionBlocks = sessionsContent.split(/^## Session:/gm).filter(block => block.trim());
  
  for (const block of sessionBlocks) {
    try {
      const lines = block.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) continue;
      
      // Extract session name from the first line
      const name = lines[0].trim();
      if (!name) continue; // Skip if name is empty
      
      // Extract explicit ID if it exists
      const idLine = lines.find(line => line.startsWith('ID:'));
      let id = idLine
        ? idLine.substring('ID:'.length).trim()
        : undefined;
      
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
      
      // If no explicit ID, generate a stable ID from name and creation timestamp
      if (!id) {
        id = `session-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${created.getTime()}`;
      }
      
      // Validate the session before adding
      if (id && name) {
        sessions.push({
          id,
          name,
          description,
          documentIds,
          created,
          lastAccessed,
          color,
        });
      } else {
        console.warn('Skipping invalid session data:', { id, name });
      }
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
    
    // Store ID explicitly for better stability
    markdown += `ID: ${session.id}\n`;
    
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

// GET /api/sessions - Get all sessions
export async function GET() {
  try {
    // Ensure the system directory exists
    ensureSystemDirectory();
    
    // Check if the sessions file exists
    if (fs.existsSync(SESSIONS_FILE)) {
      // Don't log every time to reduce noise
      const content = fs.readFileSync(SESSIONS_FILE, 'utf8');
      
      // Parse sessions from markdown
      const sessions = parseSessionsFromMarkdown(content);
      
      // Check for possible corruption and fix if needed
      if (sessions.some(s => s.name === '# Document Sessions')) {
        console.warn('Found corrupted session data, repairing file');
        // Filter out invalid sessions and rewrite the file
        const validSessions = sessions.filter(s => 
          s.name !== '# Document Sessions' && 
          s.name.trim() !== '' && 
          !s.name.startsWith('#')
        );
        
        const markdown = formatSessionsToMarkdown(validSessions);
        fs.writeFileSync(SESSIONS_FILE, markdown, 'utf8');
        
        return NextResponse.json(validSessions);
      }
      
      return NextResponse.json(sessions);
    } else {
      console.log('Sessions file does not exist, creating with empty sessions');
      
      // Create empty sessions file
      const markdown = formatSessionsToMarkdown([]);
      fs.writeFileSync(SESSIONS_FILE, markdown, 'utf8');
      
      return NextResponse.json([]);
    }
  } catch (error) {
    console.error('Error loading sessions:', error);
    return NextResponse.json(
      { error: 'Failed to load sessions' },
      { status: 500 }
    );
  }
}

// POST /api/sessions - Create or update sessions
export async function POST(request: NextRequest) {
  try {
    const { sessions } = await request.json();
    
    if (!Array.isArray(sessions)) {
      return NextResponse.json(
        { error: 'Invalid sessions data' },
        { status: 400 }
      );
    }
    
    // Ensure the system directory exists
    ensureSystemDirectory();
    
    // Fix dates that might have been serialized as strings
    const fixedSessions = sessions.map(session => ({
      ...session,
      created: typeof session.created === 'string' ? new Date(session.created) : session.created,
      lastAccessed: typeof session.lastAccessed === 'string' ? new Date(session.lastAccessed) : session.lastAccessed
    }));
    
    // Convert sessions to markdown
    const markdown = formatSessionsToMarkdown(fixedSessions);
    
    // Save to file
    fs.writeFileSync(SESSIONS_FILE, markdown, 'utf8');
    
    return NextResponse.json({ success: true, count: fixedSessions.length });
  } catch (error) {
    console.error('Error saving sessions:', error);
    return NextResponse.json(
      { error: 'Failed to save sessions' },
      { status: 500 }
    );
  }
}

// PATCH /api/sessions/:id - Update a specific session
export async function PATCH(request: NextRequest) {
  try {
    const { id, updates } = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { error: 'Session ID is required' },
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
    
    // Find and update the session
    const sessionIndex = sessions.findIndex(s => s.id === id);
    if (sessionIndex === -1) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }
    
    // Apply updates
    sessions[sessionIndex] = {
      ...sessions[sessionIndex],
      ...updates,
      lastAccessed: new Date() // Always update lastAccessed
    };
    
    // Convert sessions to markdown
    const markdown = formatSessionsToMarkdown(sessions);
    
    // Save to file
    fs.writeFileSync(SESSIONS_FILE, markdown, 'utf8');
    
    return NextResponse.json({ success: true, session: sessions[sessionIndex] });
  } catch (error) {
    console.error('Error updating session:', error);
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    );
  }
}

// DELETE /api/sessions/:id - Delete a session
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Session ID is required' },
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
    
    // Filter out the session to delete
    const updatedSessions = sessions.filter(s => s.id !== id);
    
    // If no sessions were removed, the session wasn't found
    if (updatedSessions.length === sessions.length) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }
    
    // Convert sessions to markdown
    const markdown = formatSessionsToMarkdown(updatedSessions);
    
    // Save to file
    fs.writeFileSync(SESSIONS_FILE, markdown, 'utf8');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting session:', error);
    return NextResponse.json(
      { error: 'Failed to delete session' },
      { status: 500 }
    );
  }
} 