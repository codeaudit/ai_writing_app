import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Base directory for all files and folders (the vault)
const VAULT_DIR = path.join(process.cwd(), 'vault');

// Templates directory
const TEMPLATES_DIR = path.join(VAULT_DIR, 'templates');

// GET /api/templates/content - Get the raw content of a template
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const templateName = url.searchParams.get('name');
    
    if (!templateName) {
      return NextResponse.json({ error: 'Template name is required' }, { status: 400 });
    }
    
    const templatePath = path.join(TEMPLATES_DIR, `${templateName}.md`);
    
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