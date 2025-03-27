import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Base directory for all files and folders (the vault)
const VAULT_DIR = path.join(process.cwd(), 'vault');

// Templates directory
const TEMPLATES_DIR = path.join(VAULT_DIR, 'templates');

/**
 * POST handler for /api/templates/save
 * Saves changes to a template file
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const { name, content } = await request.json();
    
    // Validate request
    if (!name || !content) {
      return NextResponse.json({ error: 'Template name and content are required' }, { status: 400 });
    }
    
    // Sanitize the name to prevent path traversal
    const safeName = name.replace(/[^a-z0-9-_]/gi, '-').toLowerCase();
    const templatePath = path.join(TEMPLATES_DIR, `${safeName}.md`);
    
    // Check if the template exists
    if (!fs.existsSync(templatePath)) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    
    // Read the original template to preserve frontmatter
    const originalContent = fs.readFileSync(templatePath, 'utf8');
    const frontmatterMatch = originalContent.match(/^---\n([\s\S]*?)\n---\n/);
    
    let newContent;
    if (frontmatterMatch) {
      // Update the updatedAt field in frontmatter
      const frontmatter = frontmatterMatch[1];
      const updatedFrontmatter = frontmatter.replace(
        /updatedAt:.*(\r?\n)/,
        `updatedAt: ${new Date().toISOString()}$1`
      );
      
      // If updatedAt wasn't found, add it
      const finalFrontmatter = updatedFrontmatter.includes('updatedAt:') 
        ? updatedFrontmatter
        : updatedFrontmatter + `updatedAt: ${new Date().toISOString()}\n`;
      
      // Combine frontmatter with new content
      newContent = `---\n${finalFrontmatter}---\n\n${content}`;
    } else {
      // No frontmatter found, create new frontmatter
      const now = new Date().toISOString();
      newContent = `---
name: ${safeName}
category: General
createdAt: ${now}
updatedAt: ${now}
---

${content}`;
    }
    
    // Write the updated content to the file
    fs.writeFileSync(templatePath, newContent);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Template saved successfully',
      path: templatePath
    });
  } catch (error) {
    console.error('Error saving template:', error);
    return NextResponse.json({ error: 'Failed to save template' }, { status: 500 });
  }
} 