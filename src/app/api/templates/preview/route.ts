import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Define the templates directory
const TEMPLATES_DIR = path.join(process.cwd(), 'vault', 'templates');

/**
 * GET handler for /api/templates/preview
 * Returns the raw content of a template without processing it
 */
export async function GET(request: NextRequest) {
  // Get the template name from the query
  const searchParams = request.nextUrl.searchParams;
  const name = searchParams.get('name');
  
  if (!name) {
    return NextResponse.json({ error: 'Template name is required' }, { status: 400 });
  }
  
  try {
    // Sanitize the name to prevent path traversal
    const safeName = name.replace(/[^a-z0-9-_]/gi, '-').toLowerCase();
    const templatePath = path.join(TEMPLATES_DIR, `${safeName}.md`);
    
    // Check if the template exists
    if (!fs.existsSync(templatePath)) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    
    // Read the template content
    const content = fs.readFileSync(templatePath, 'utf8');
    
    // Strip frontmatter from the content
    const contentWithoutFrontmatter = content.replace(/^---\n[\s\S]*?\n---\n/, '');
    
    return NextResponse.json({ 
      name,
      content: contentWithoutFrontmatter 
    });
  } catch (error) {
    console.error('Error getting template preview:', error);
    return NextResponse.json({ error: 'Failed to get template preview' }, { status: 500 });
  }
} 