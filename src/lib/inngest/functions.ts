import { 
  analyzeDocumentClient, 
  improveWritingClient,
  generateTemplateClient,
  analyzeNarrativeClient,
  enhanceMetaphorsClient,
  knowledgeGraphClient
} from './client';
import { kv } from '@vercel/kv';
import { tools } from '../agents/tools';

// Define types for all event payloads
// Note: We're not using event.name here because Inngest uses that internally
interface AnalysisEvent {
  data: {
    documentId: string;
    focusAreas?: string[];
  };
  [key: string]: unknown;
}

interface WritingEvent {
  data: {
    content: string;
    style?: string;
  };
  [key: string]: unknown;
}

interface TemplateEvent {
  data: {
    userId: string;
    templateType: string;
    customInstructions?: string;
  };
  [key: string]: unknown;
}

interface NarrativeEvent {
  data: {
    documentId: string;
    structureType?: 'three-act' | 'hero-journey' | 'save-the-cat' | 'any';
  };
  [key: string]: unknown;
}

interface MetaphorEvent {
  data: {
    content: string;
    theme?: string;
    tone?: string;
  };
  [key: string]: unknown;
}

interface KnowledgeGraphEvent {
  data: {
    documentId: string;
    focusAreas?: string[];
    depth?: number;
  };
  [key: string]: unknown;
}

type StepFunction = {
  run: <T>(name: string, fn: () => Promise<T>) => Promise<T>;
};

// Define a type for Error objects that might be thrown
interface ErrorWithMessage {
  message?: string;
}

// Helper function to safely extract error message
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as ErrorWithMessage).message);
  }
  return String(error);
}

export const analyzeDocumentFunction = analyzeDocumentClient.createFunction(
  { name: 'Analyze Document' },
  { event: 'document.analysis.requested' },
  async ({ event, step }: { event: AnalysisEvent; step: StepFunction }) => {
    const { documentId, focusAreas } = event.data;
    
    // Store request status in KV
    await kv.set(`analysis:${documentId}:status`, 'processing');
    
    try {
      // Execute analysis through agent
      const result = await step.run('Execute analysis', async () => {
        return await tools.analyzeDocument({ documentId, focusAreas });
      });
      
      // Store results
      await kv.set(`analysis:${documentId}:result`, result);
      await kv.set(`analysis:${documentId}:status`, 'completed');
      
      return { success: true, documentId, result };
    } catch (error: unknown) {
      await kv.set(`analysis:${documentId}:status`, 'failed');
      await kv.set(`analysis:${documentId}:error`, getErrorMessage(error));
      return { success: false, error: getErrorMessage(error) };
    }
  }
);

export const improveWritingFunction = improveWritingClient.createFunction(
  { name: 'Improve Writing' },
  { event: 'writing.improvement.requested' },
  async ({ event, step }: { event: WritingEvent; step: StepFunction }) => {
    const { content, style } = event.data;
    const requestId = `writing_${Date.now()}`;
    
    await kv.set(`improvement:${requestId}:status`, 'processing');
    
    try {
      const result = await step.run('Execute improvement', async () => {
        return await tools.improveWriting({ content, style });
      });
      
      await kv.set(`improvement:${requestId}:result`, result);
      await kv.set(`improvement:${requestId}:status`, 'completed');
      
      return { success: true, requestId, result };
    } catch (error: unknown) {
      await kv.set(`improvement:${requestId}:status`, 'failed');
      await kv.set(`improvement:${requestId}:error`, getErrorMessage(error));
      return { success: false, error: getErrorMessage(error) };
    }
  }
);

export const generateSmartTemplateFunction = generateTemplateClient.createFunction(
  { name: 'Generate Smart Template' },
  { event: 'template.generation.requested' },
  async ({ event, step }: { event: TemplateEvent; step: StepFunction }) => {
    const { userId, templateType, customInstructions } = event.data;
    const requestId = `template_${Date.now()}`;
    
    await kv.set(`template:${requestId}:status`, 'processing');
    
    try {
      const result = await step.run('Generate template', async () => {
        return await tools.generateSmartTemplate({ userId, templateType, customInstructions });
      });
      
      await kv.set(`template:${requestId}:result`, result);
      await kv.set(`template:${requestId}:status`, 'completed');
      
      return { success: true, requestId, result };
    } catch (error: unknown) {
      await kv.set(`template:${requestId}:status`, 'failed');
      await kv.set(`template:${requestId}:error`, getErrorMessage(error));
      return { success: false, error: getErrorMessage(error) };
    }
  }
);

export const analyzeNarrativeStructureFunction = analyzeNarrativeClient.createFunction(
  { name: 'Analyze Narrative Structure' },
  { event: 'narrative.analysis.requested' },
  async ({ event, step }: { event: NarrativeEvent; step: StepFunction }) => {
    const { documentId, structureType } = event.data;
    
    await kv.set(`narrative:${documentId}:status`, 'processing');
    
    try {
      const result = await step.run('Analyze narrative', async () => {
        return await tools.analyzeNarrativeStructure({ documentId, structureType });
      });
      
      await kv.set(`narrative:${documentId}:result`, result);
      await kv.set(`narrative:${documentId}:status`, 'completed');
      
      return { success: true, documentId, result };
    } catch (error: unknown) {
      await kv.set(`narrative:${documentId}:status`, 'failed');
      await kv.set(`narrative:${documentId}:error`, getErrorMessage(error));
      return { success: false, error: getErrorMessage(error) };
    }
  }
);

export const enhanceMetaphorsFunction = enhanceMetaphorsClient.createFunction(
  { name: 'Enhance Metaphors' },
  { event: 'metaphor.enhancement.requested' },
  async ({ event, step }: { event: MetaphorEvent; step: StepFunction }) => {
    const { content, theme, tone } = event.data;
    const requestId = `metaphor_${Date.now()}`;
    
    await kv.set(`metaphor:${requestId}:status`, 'processing');
    
    try {
      const result = await step.run('Enhance metaphors', async () => {
        return await tools.enhanceMetaphorsImagery({ content, theme, tone });
      });
      
      await kv.set(`metaphor:${requestId}:result`, result);
      await kv.set(`metaphor:${requestId}:status`, 'completed');
      
      return { success: true, requestId, result };
    } catch (error: unknown) {
      await kv.set(`metaphor:${requestId}:status`, 'failed');
      await kv.set(`metaphor:${requestId}:error`, getErrorMessage(error));
      return { success: false, error: getErrorMessage(error) };
    }
  }
);

export const generateKnowledgeGraphFunction = knowledgeGraphClient.createFunction(
  { name: 'Generate Knowledge Graph' },
  { event: 'knowledge.graph.generation.requested' },
  async ({ event, step }: { event: KnowledgeGraphEvent; step: StepFunction }) => {
    const { documentId, focusAreas, depth } = event.data;
    
    await kv.set(`graph:${documentId}:status`, 'processing');
    
    try {
      const result = await step.run('Generate graph', async () => {
        return await tools.generateKnowledgeGraph({ documentId, focusAreas, depth });
      });
      
      await kv.set(`graph:${documentId}:result`, result);
      await kv.set(`graph:${documentId}:status`, 'completed');
      
      return { success: true, documentId, result };
    } catch (error: unknown) {
      await kv.set(`graph:${documentId}:status`, 'failed');
      await kv.set(`graph:${documentId}:error`, getErrorMessage(error));
      return { success: false, error: getErrorMessage(error) };
    }
  }
);