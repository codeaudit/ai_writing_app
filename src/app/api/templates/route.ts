import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { mkdir } from 'fs/promises';
import matter from 'gray-matter';

// Define the templates directory
const TEMPLATES_DIR = path.join(process.cwd(), 'vault', 'templates');

// Ensure templates directory exists
async function ensureTemplatesDir() {
  try {
    if (!fs.existsSync(TEMPLATES_DIR)) {
      await mkdir(TEMPLATES_DIR, { recursive: true });
    }
  } catch (error) {
    console.error('Error creating templates directory:', error);
  }
}

// GET /api/templates - Get all templates
export async function GET() {
  try {
    await ensureTemplatesDir();
    
    // Check if the templates directory exists
    if (!fs.existsSync(TEMPLATES_DIR)) {
      return NextResponse.json([]);
    }
    
    // Get all markdown files in the templates directory
    const files = fs.readdirSync(TEMPLATES_DIR)
      .filter(file => file.endsWith('.md') || file.endsWith('.mdx'));
    
    // Map files to template objects
    const templates = files.map(file => {
      const filePath = path.join(TEMPLATES_DIR, file);
      const extension = file.endsWith('.mdx') ? '.mdx' : '.md';
      const name = file.replace(new RegExp(`${extension}$`), '');
      
      try {
        // Try to get frontmatter for additional metadata
        const content = fs.readFileSync(filePath, 'utf8');
        const { data } = matter(content);
        
        return {
          id: name,
          name: data.name || name,
          description: data.description || '',
          ...data
        };
      } catch (error) {
        // Fallback if reading fails
        return {
          id: name,
          name,
          description: ''
        };
      }
    });
    
    return NextResponse.json(templates);
  } catch (error) {
    console.error('Error getting templates:', error);
    return NextResponse.json({ error: 'Failed to get templates' }, { status: 500 });
  }
}

// POST /api/templates - Create or update a template
export async function POST(request: Request) {
  try {
    await ensureTemplatesDir();
    
    // Parse request body
    const body = await request.json();
    const { name, content, category = 'General' } = body;
    
    // Validate request
    if (!name || !content) {
      return NextResponse.json({ error: 'Name and content are required' }, { status: 400 });
    }
    
    // Check if content already has frontmatter
    const hasFrontmatter = content.trim().startsWith('---\n');
    
    // Create filename from name (sanitize to prevent directory traversal)
    const filename = name.replace(/[^a-z0-9-_]/gi, '-').toLowerCase() + '.md';
    const filePath = path.join(TEMPLATES_DIR, filename);
    
    // Create or use existing content
    let fileContent;
    if (hasFrontmatter) {
      fileContent = content;
    } else {
      // Create content with frontmatter
      const now = new Date().toISOString();
      fileContent = `---
name: ${name}
category: ${category}
createdAt: ${now}
updatedAt: ${now}
---

${content}`;
    }
    
    // Write file
    fs.writeFileSync(filePath, fileContent);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Template saved successfully',
      path: filePath 
    });
  } catch (error) {
    console.error('Error saving template:', error);
    return NextResponse.json({ error: 'Failed to save template' }, { status: 500 });
  }
} 