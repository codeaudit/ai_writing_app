import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { DEFAULT_PROMPTS } from '@/lib/ai-roles';

// Set the runtime to Node.js since we need access to the file system
export const runtime = 'nodejs';

/**
 * API endpoint to get the system prompt for a specific AI role
 */
export async function GET(request: NextRequest) {
  try {
    // Get role from query parameter and convert to lowercase
    const role = (request.nextUrl.searchParams.get('role') || 'assistant').toLowerCase();
    const configPath = path.join(process.cwd(), 'vault/system/ai-roles.md');
    
    // Check if the file exists
    if (!fs.existsSync(configPath)) {
      console.warn(`AI roles config file not found, using default prompt for role "${role}"`);
      return NextResponse.json({ 
        prompt: DEFAULT_PROMPTS[role as keyof typeof DEFAULT_PROMPTS] || DEFAULT_PROMPTS.assistant 
      });
    }
    
    // Read and parse the markdown file
    const fileContent = fs.readFileSync(configPath, 'utf8');
    
    // Look for the section for the requested role
    const sectionRegex = new RegExp(`## ${role}\\s*([\\s\\S]*?)(?=## |$)`, 'i');
    const sectionMatch = fileContent.match(sectionRegex);
    
    if (!sectionMatch || !sectionMatch[1]) {
      console.warn(`Section for role "${role}" not found in config file, using default prompt`);
      return NextResponse.json({ 
        prompt: DEFAULT_PROMPTS[role as keyof typeof DEFAULT_PROMPTS] || DEFAULT_PROMPTS.assistant 
      });
    }
    
    // Extract the prompt content (everything after the heading)
    const promptContent = sectionMatch[1].trim();
    
    // Set appropriate caching headers
    const response = NextResponse.json({ prompt: promptContent });
    response.headers.set('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
    
    return response;
  } catch (error) {
    console.error('Error reading AI role prompt from config file:', error);
    
    // Get role from query parameter again since it might not be available in the catch block
    const role = request.nextUrl.searchParams.get('role') || 'assistant';
    
    // Return default prompt with error info for debugging
    return NextResponse.json({
      prompt: DEFAULT_PROMPTS[role as keyof typeof DEFAULT_PROMPTS] || DEFAULT_PROMPTS.assistant,
      error: process.env.NODE_ENV === 'development' ? 
        String(error) : 'An error occurred processing the AI role prompt'
    });
  }
} 