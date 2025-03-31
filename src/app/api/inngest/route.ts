import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import {
  analyzeDocumentFunction,
  improveWritingFunction,
  generateSmartTemplateFunction,
  analyzeNarrativeStructureFunction,
  enhanceMetaphorsFunction,
  generateKnowledgeGraphFunction
} from '@/lib/inngest/functions';

export const { GET, POST } = serve({
  client: inngest,
  functions: [
    analyzeDocumentFunction,
    improveWritingFunction,
    generateSmartTemplateFunction,
    analyzeNarrativeStructureFunction,
    enhanceMetaphorsFunction,
    generateKnowledgeGraphFunction
  ]
}); 