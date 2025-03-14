import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Base directory for all files and folders (the vault)
const VAULT_DIR = path.join(process.cwd(), 'vault');

// Templates directory
const TEMPLATES_DIR = path.join(VAULT_DIR, 'templates');

// Composition templates directory
const COMPOSITION_TEMPLATES_DIR = path.join(VAULT_DIR, 'composition_templates');

// GET /api/templates/content - Get the raw content of a template
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const templateName = url.searchParams.get('name');
    const directory = url.searchParams.get('directory');
    
    if (!templateName) {
      return NextResponse.json({ error: 'Template name is required' }, { status: 400 });
    }
    
    let templatesDir = TEMPLATES_DIR; // Default to regular templates
    
    if (directory === 'composition_templates') {
      templatesDir = COMPOSITION_TEMPLATES_DIR;
    }
    
    const templatePath = path.join(templatesDir, `${templateName}.md`);
    
    if (!fs.existsSync(templatePath)) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    
    const content = fs.readFileSync(templatePath, 'utf8');
    
    return NextResponse.json({ content });
  } catch (error) {
    console.error('Error fetching template content:', error);
    return NextResponse.json({ error: 'Failed to fetch template content' }, { status: 500 });
  }
} 