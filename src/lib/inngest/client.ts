import { Inngest } from 'inngest';

// Create a shared event key for all clients
const eventKey = process.env.INNGEST_EVENT_KEY;

// Create individual clients for each function to avoid ID conflicts
export const inngest = new Inngest({ 
  id: 'writing-app',
  eventKey 
});

// These clients are used for specific functions to avoid duplicate IDs
export const analyzeDocumentClient = new Inngest({
  id: 'analyze-document',
  eventKey
});

export const improveWritingClient = new Inngest({
  id: 'improve-writing',
  eventKey
});

export const generateTemplateClient = new Inngest({
  id: 'generate-template',
  eventKey
});

export const analyzeNarrativeClient = new Inngest({
  id: 'analyze-narrative',
  eventKey
});

export const enhanceMetaphorsClient = new Inngest({
  id: 'enhance-metaphors',
  eventKey
});

export const knowledgeGraphClient = new Inngest({
  id: 'knowledge-graph',
  eventKey
}); 