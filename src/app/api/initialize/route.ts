import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Define paths
const VAULT_DIR = path.join(process.cwd(), 'vault');
const SYSTEM_DIR = path.join(VAULT_DIR, 'system');
const SESSIONS_FILE = path.join(SYSTEM_DIR, 'sessions.md');

// Flag to track if sessions have been pre-fetched
let sessionsPrefetched = false;

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
    
    console.log(`Directory structure verified: ${SYSTEM_DIR}`);
    return true;
  } catch (error) {
    console.error('Error ensuring system directory:', error);
    return false;
  }
};

export async function GET() {
  try {
    console.log("Initializing application...");
    
    // Ensure the system directory exists
    ensureSystemDirectory();
    
    // Initialize sessions if needed
    let sessionsExist = false;
    if (fs.existsSync(SESSIONS_FILE)) {
      console.log('Sessions file exists');
      sessionsExist = true;
    } else {
      console.log('Creating empty sessions file');
      // Create empty markdown file for sessions
      fs.writeFileSync(SESSIONS_FILE, '# Document Sessions\n\nNo sessions defined yet.\n', 'utf8');
    }
    
    // List files in system directory for debugging
    const files = fs.readdirSync(SYSTEM_DIR);
    console.log("Files in system directory:", files);
    
    // Make an internal API call to load sessions - only once per server instance
    if (!sessionsPrefetched) {
      try {
        console.log("Pre-fetching sessions data...");
        const sessionsResponse = await fetch(new URL('/api/sessions', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').toString());
        if (sessionsResponse.ok) {
          const sessions = await sessionsResponse.json();
          console.log(`Successfully pre-fetched ${sessions.length} sessions`);
          sessionsPrefetched = true;
        } else {
          console.error("Failed to pre-fetch sessions:", sessionsResponse.statusText);
        }
      } catch (error) {
        console.error("Error pre-fetching sessions:", error);
      }
    } else {
      console.log("Sessions already pre-fetched, skipping");
    }
    
    // Create response with cache control headers
    const response = NextResponse.json({
      success: true,
      message: 'Application initialized successfully',
      systemFiles: files,
      sessionsExist
    });
    
    // Add cache-control header to avoid repeated calls
    response.headers.set('Cache-Control', 'private, max-age=3600');
    
    return response;
  } catch (error) {
    console.error('Error initializing application:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to initialize application',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 