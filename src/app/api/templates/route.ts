import { NextRequest, NextResponse } from 'next/server';
import { getTemplates, processTemplate } from '@/lib/fs-service';

// GET /api/templates - Get all templates
export async function GET() {
  try {
    const templates = getTemplates();
    return NextResponse.json(templates);
  } catch (error) {
    console.error('Error loading templates:', error);
    return NextResponse.json({ error: 'Failed to load templates' }, { status: 500 });
  }
}

// POST /api/templates/:name - Process a template with variables
export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const templateName = url.searchParams.get('name');
    
    if (!templateName) {
      return NextResponse.json({ error: 'Template name is required' }, { status: 400 });
    }
    
    const variables = await request.json() as Record<string, string>;
    const processedTemplate = processTemplate(templateName, variables);
    
    return NextResponse.json({ content: processedTemplate });
  } catch (error) {
    console.error('Error processing template:', error);
    return NextResponse.json({ error: 'Failed to process template' }, { status: 500 });
  }
} 