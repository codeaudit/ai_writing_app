import { serve } from 'inngest/next';
import { NextRequest } from 'next/server';
import { 
  analyzeDocumentClient,
  improveWritingClient,
  generateTemplateClient,
  analyzeNarrativeClient,
  enhanceMetaphorsClient,
  knowledgeGraphClient
} from '@/lib/inngest/client';
import { InngestFunction } from 'inngest';
import {
  analyzeDocumentFunction,
  improveWritingFunction,
  generateSmartTemplateFunction,
  analyzeNarrativeStructureFunction,
  enhanceMetaphorsFunction,
  generateKnowledgeGraphFunction
} from '@/lib/inngest/functions';

// Create separate serve handlers for each function with its corresponding client
const analyzeDocumentHandler = serve({
  client: analyzeDocumentClient,
  functions: [analyzeDocumentFunction as unknown as InngestFunction<Record<string, unknown>, unknown>]
});

const improveWritingHandler = serve({
  client: improveWritingClient,
  functions: [improveWritingFunction as unknown as InngestFunction<Record<string, unknown>, unknown>]
});

const generateTemplateHandler = serve({
  client: generateTemplateClient,
  functions: [generateSmartTemplateFunction as unknown as InngestFunction<Record<string, unknown>, unknown>]
});

const analyzeNarrativeHandler = serve({
  client: analyzeNarrativeClient,
  functions: [analyzeNarrativeStructureFunction as unknown as InngestFunction<Record<string, unknown>, unknown>]
});

const enhanceMetaphorsHandler = serve({
  client: enhanceMetaphorsClient,
  functions: [enhanceMetaphorsFunction as unknown as InngestFunction<Record<string, unknown>, unknown>]
});

const generateKnowledgeGraphHandler = serve({
  client: knowledgeGraphClient,
  functions: [generateKnowledgeGraphFunction as unknown as InngestFunction<Record<string, unknown>, unknown>]
});

// Create combined handlers
export async function GET(req: NextRequest) {
  // Try each handler in sequence
  try {
    // First try the standard Inngest ping
    if (req.url.includes('/api/inngest')) {
      if (req.url.endsWith('ping')) {
        return new Response('OK', { status: 200 });
      }
    }
    
    // Then try each function handler
    const handlers = [
      analyzeDocumentHandler,
      improveWritingHandler,
      generateTemplateHandler,
      analyzeNarrativeHandler,
      enhanceMetaphorsHandler,
      generateKnowledgeGraphHandler
    ];
    
    for (const handler of handlers) {
      try {
        // Using the handler's GET property as a method
        // Without arguments - the handler itself has access to the request from the Next.js context
        const response = await handler.GET();
        if (response.status !== 404) {
          return response;
        }
      } catch (error) {
        console.error('Handler error:', error);
        // Continue to next handler
      }
    }
    
    // If no handler matched, return 404
    return new Response('Not found', { status: 404 });
  } catch (error) {
    console.error('Error in Inngest GET handler:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // Try each handler in sequence
  try {
    // First check if this is a standard Inngest ping
    if (req.url.includes('/api/inngest')) {
      if (req.url.endsWith('ping')) {
        return new Response('OK', { status: 200 });
      }
    }
    
    // Try each function handler
    const handlers = [
      analyzeDocumentHandler,
      improveWritingHandler,
      generateTemplateHandler,
      analyzeNarrativeHandler,
      enhanceMetaphorsHandler,
      generateKnowledgeGraphHandler
    ];
    
    for (const handler of handlers) {
      try {
        // Using the handler's POST property as a method
        // Without arguments - the handler itself has access to the request from the Next.js context
        const response = await handler.POST();
        if (response.status !== 404) {
          return response;
        }
      } catch (error) {
        console.error('Handler error:', error);
        // Continue to next handler
      }
    }
    
    // If no handler matched, return 404
    return new Response('Not found', { status: 404 });
  } catch (error) {
    console.error('Error in Inngest POST handler:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
} 