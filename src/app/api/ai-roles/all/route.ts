import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { DEFAULT_ROLES, DEFAULT_PROMPTS, AIRoleInfo } from '@/lib/ai-roles';

// Set the runtime to Node.js since we need access to the file system
export const runtime = 'nodejs';

/**
 * API endpoint to get all AI roles with their system prompts
 */
export async function GET() {
  try {
    const configPath = path.join(process.cwd(), 'vault/system/ai-roles.md');
    
    // Check if the file exists
    if (!fs.existsSync(configPath)) {
      console.warn('AI roles config file not found, using default roles and prompts');
      return NextResponse.json({ 
        roles: DEFAULT_ROLES.map(role => ({
          role,
          prompt: DEFAULT_PROMPTS[role]
        }))
      });
    }
    
    // Read and parse the markdown file
    const fileContent = fs.readFileSync(configPath, 'utf8');
    
    // Extract sections for each role
    const sectionMatches = fileContent.match(/## ([^\n]+)([^#]*?)(?=## |$)/g);
    
    if (!sectionMatches || sectionMatches.length === 0) {
      console.warn('No roles found in config file, using default roles and prompts');
      return NextResponse.json({ 
        roles: DEFAULT_ROLES.map(role => ({
          role,
          prompt: DEFAULT_PROMPTS[role]
        }))
      });
    }
    
    // Parse each section to extract role name and prompt content
    const roles: AIRoleInfo[] = sectionMatches.map(section => {
      const headingMatch = section.match(/## ([^\n]+)/);
      const role = headingMatch ? headingMatch[1].trim().toLowerCase() : '';
      const promptContent = section.replace(/## [^\n]+/, '').trim();
      
      return {
        role: role as AIRoleInfo['role'],
        prompt: promptContent
      };
    });
    
    // Set appropriate caching headers
    const response = NextResponse.json({ roles });
    response.headers.set('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
    
    return response;
  } catch (error) {
    console.error('Error reading all AI roles from config file:', error);
    
    // Return default roles with error info for debugging
    return NextResponse.json({ 
      roles: DEFAULT_ROLES.map(role => ({
        role,
        prompt: DEFAULT_PROMPTS[role]
      })),
      error: process.env.NODE_ENV === 'development' ? 
        String(error) : 'An error occurred processing the AI roles'
    });
  }
} 