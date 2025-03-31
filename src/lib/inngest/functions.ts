import { inngest } from './client';
import { kv } from '@vercel/kv';
import { tools } from '../agents/tools';
import { 
  DocumentAnalysisRequestedEvent,
  WritingImprovementRequestedEvent,
  SmartTemplateGenerationRequestedEvent,
  NarrativeAnalysisRequestedEvent,
  MetaphorEnhancementRequestedEvent,
  KnowledgeGraphGenerationRequestedEvent
} from './events';

export const analyzeDocumentFunction = inngest.createFunction(
  { name: 'Analyze Document' },
  { event: 'document.analysis.requested' },
  async ({ event, step }) => {
    const { documentId, userId, focusAreas } = event.data;
    
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
    } catch (error) {
      await kv.set(`analysis:${documentId}:status`, 'failed');
      await kv.set(`analysis:${documentId}:error`, error.message);
      return { success: false, error: error.message };
    }
  }
);

export const improveWritingFunction = inngest.createFunction(
  { name: 'Improve Writing' },
  { event: 'writing.improvement.requested' },
  async ({ event, step }) => {
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
    } catch (error) {
      await kv.set(`improvement:${requestId}:status`, 'failed');
      await kv.set(`improvement:${requestId}:error`, error.message);
      return { success: false, error: error.message };
    }
  }
);

export const generateSmartTemplateFunction = inngest.createFunction(
  { name: 'Generate Smart Template' },
  { event: 'template.generation.requested' },
  async ({ event, step }) => {
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
    } catch (error) {
      await kv.set(`template:${requestId}:status`, 'failed');
      await kv.set(`template:${requestId}:error`, error.message);
      return { success: false, error: error.message };
    }
  }
);

export const analyzeNarrativeStructureFunction = inngest.createFunction(
  { name: 'Analyze Narrative Structure' },
  { event: 'narrative.analysis.requested' },
  async ({ event, step }) => {
    const { documentId, structureType } = event.data;
    
    await kv.set(`narrative:${documentId}:status`, 'processing');
    
    try {
      const result = await step.run('Analyze narrative', async () => {
        return await tools.analyzeNarrativeStructure({ documentId, structureType });
      });
      
      await kv.set(`narrative:${documentId}:result`, result);
      await kv.set(`narrative:${documentId}:status`, 'completed');
      
      return { success: true, documentId, result };
    } catch (error) {
      await kv.set(`narrative:${documentId}:status`, 'failed');
      await kv.set(`narrative:${documentId}:error`, error.message);
      return { success: false, error: error.message };
    }
  }
);

export const enhanceMetaphorsFunction = inngest.createFunction(
  { name: 'Enhance Metaphors' },
  { event: 'metaphor.enhancement.requested' },
  async ({ event, step }) => {
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
    } catch (error) {
      await kv.set(`metaphor:${requestId}:status`, 'failed');
      await kv.set(`metaphor:${requestId}:error`, error.message);
      return { success: false, error: error.message };
    }
  }
);

export const generateKnowledgeGraphFunction = inngest.createFunction(
  { name: 'Generate Knowledge Graph' },
  { event: 'knowledge.graph.generation.requested' },
  async ({ event, step }) => {
    const { documentId, focusAreas, depth } = event.data;
    
    await kv.set(`graph:${documentId}:status`, 'processing');
    
    try {
      const result = await step.run('Generate graph', async () => {
        return await tools.generateKnowledgeGraph({ documentId, focusAreas, depth });
      });
      
      await kv.set(`graph:${documentId}:result`, result);
      await kv.set(`graph:${documentId}:status`, 'completed');
      
      return { success: true, documentId, result };
    } catch (error) {
      await kv.set(`graph:${documentId}:status`, 'failed');
      await kv.set(`graph:${documentId}:error`, error.message);
      return { success: false, error: error.message };
    }
  }
); 