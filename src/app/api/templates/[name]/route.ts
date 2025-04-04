import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

// Constants
const TEMPLATES_DIR = process.env.TEMPLATES_DIR || path.join(process.cwd(), 'templates');

export async function GET(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const { name } = params;
    
    // Check if the template exists with either .md or .mdx extension
    let templatePath = path.join(TEMPLATES_DIR, `${name}.md`);
    
    // If .md doesn't exist, try .mdx
    if (!fs.existsSync(templatePath)) {
      templatePath = path.join(TEMPLATES_DIR, `${name}.mdx`);
    }
    
    // Return 404 if template doesn't exist
    if (!fs.existsSync(templatePath)) {
      return NextResponse.json(
        { error: `Template '${name}' not found` },
        { status: 404 }
      );
    }
    
    // Read and parse the template
    const content = fs.readFileSync(templatePath, 'utf8');
    const { data, content: templateContent } = matter(content);
    
    return NextResponse.json({
      name,
      content: templateContent,
      metadata: {
        ...data,
        name: data.name || name,
        description: data.description || ''
      }
    });
  } catch (error) {
    console.error('Error fetching template:', error);
    return NextResponse.json(
      { error: 'Failed to fetch template' },
      { status: 500 }
    );
  }
} 