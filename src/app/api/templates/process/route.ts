import { NextRequest, NextResponse } from 'next/server';
import nunjucks from 'nunjucks';
import { format } from 'date-fns';

// Configure Nunjucks
const configureNunjucks = () => {
  const env = nunjucks.configure({ 
    autoescape: false,
    trimBlocks: true,
    lstripBlocks: true
  });
  
  // Add custom filters
  env.addFilter('dateFormat', (date, formatStr = 'PPP') => {
    try {
      return format(new Date(date), formatStr);
    } catch (error) {
      console.error('Error formatting date:', error);
      return date;
    }
  });
  
  env.addFilter('timeFormat', (date, formatStr = 'p') => {
    try {
      return format(new Date(date), formatStr);
    } catch (error) {
      console.error('Error formatting time:', error);
      return date;
    }
  });
  
  env.addFilter('lowercase', (str) => {
    return String(str).toLowerCase();
  });
  
  env.addFilter('uppercase', (str) => {
    return String(str).toUpperCase();
  });
  
  env.addFilter('capitalize', (str) => {
    return String(str).charAt(0).toUpperCase() + String(str).slice(1);
  });
  
  env.addFilter('slugify', (str) => {
    return String(str)
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  });
  
  return env;
};

// POST /api/templates/process - Process a template with variables
export async function POST(request: NextRequest) {
  try {
    const { template, variables } = await request.json();
    
    if (!template) {
      return NextResponse.json({ error: 'Template content is required' }, { status: 400 });
    }
    
    // Configure Nunjucks
    const nunjucksEnv = configureNunjucks();
    
    // Default variables
    const defaultVariables = {
      date: new Date().toISOString(),
      time: new Date().toLocaleTimeString(),
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      day: new Date().getDate(),
      dateFormatted: format(new Date(), 'MMMM d, yyyy'),
      timeFormatted: format(new Date(), 'h:mm a'),
    };
    
    // Merge default variables with provided variables
    const mergedVariables = {
      ...defaultVariables,
      ...variables,
    };
    
    // Process the template with Nunjucks
    const processedContent = nunjucksEnv.renderString(template, mergedVariables);
    
    return NextResponse.json({ content: processedContent });
  } catch (error) {
    console.error('Error processing template:', error);
    return NextResponse.json({ error: 'Failed to process template' }, { status: 500 });
  }
} 