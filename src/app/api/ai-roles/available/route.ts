import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { DEFAULT_ROLES } from '@/lib/ai-roles';

// Set the runtime to Node.js since we need access to the file system
export const runtime = 'nodejs';

/**
 * API endpoint to get available AI roles from the markdown file
 */
export async function GET() {
  try {
    const configPath = path.join(process.cwd(), 'vault/system/ai-roles.md');
    
    // Check if the file exists
    if (!fs.existsSync(configPath)) {
      console.warn('AI roles config file not found, using default roles');
      return NextResponse.json({ roles: DEFAULT_ROLES });
    }
    
    // Read and parse the markdown file
    const fileContent = fs.readFileSync(configPath, 'utf8');
    const headingMatches = fileContent.match(/^## ([^\n]+)/gm);
    
    if (!headingMatches || headingMatches.length === 0) {
      console.warn('No roles found in config file, using default roles');
      return NextResponse.json({ roles: DEFAULT_ROLES });
    }
    
    // Extract role names from headings and convert to lowercase
    const roles = headingMatches.map(match => match.replace('## ', '').trim().toLowerCase());
    
    // Set appropriate caching headers
    const response = NextResponse.json({ roles });
    response.headers.set('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
    
    return response;
  } catch (error) {
    console.error('Error reading AI roles config file:', error);
    
    // Return default roles with error info for debugging
    return NextResponse.json({ 
      roles: DEFAULT_ROLES,
      error: process.env.NODE_ENV === 'development' ? 
        String(error) : 'An error occurred processing the AI roles'
    });
  }
} 