import { createAI } from 'ai-sdk-rsc';
import { kv } from '@vercel/kv';

export const AI = createAI({
  actions: {
    generateSmartTemplate: async (templateType, customInstructions = '') => {
      const requestId = `template_${Date.now()}`;
      
      // Trigger background template generation job
      await fetch('/api/ai/smart-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateType, customInstructions, requestId })
      });
      
      // Poll for completion
      let status = 'processing';
      while (status === 'processing') {
        status = await kv.get(`template:${requestId}:status`);
        if (status === 'completed') {
          return await kv.get(`template:${requestId}:result`);
        } else if (status === 'failed') {
          throw new Error(await kv.get(`template:${requestId}:error`));
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    },
    
    analyzeNarrativeStructure: async (documentId, structureType = 'any') => {
      // Trigger background narrative analysis job
      await fetch('/api/ai/narrative-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId, structureType })
      });
      
      // Poll for completion
      let status = 'processing';
      while (status === 'processing') {
        status = await kv.get(`narrative:${documentId}:status`);
        if (status === 'completed') {
          return await kv.get(`narrative:${documentId}:result`);
        } else if (status === 'failed') {
          throw new Error(await kv.get(`narrative:${documentId}:error`));
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    },
    
    enhanceMetaphors: async (content, theme, tone) => {
      const requestId = `metaphor_${Date.now()}`;
      
      // Trigger background metaphor enhancement job
      await fetch('/api/ai/metaphor-enhancement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, theme, tone, requestId })
      });
      
      // Poll for completion
      let status = 'processing';
      while (status === 'processing') {
        status = await kv.get(`metaphor:${requestId}:status`);
        if (status === 'completed') {
          return await kv.get(`metaphor:${requestId}:result`);
        } else if (status === 'failed') {
          throw new Error(await kv.get(`metaphor:${requestId}:error`));
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    },
    
    generateKnowledgeGraph: async (documentId, focusAreas, depth = 3) => {
      // Trigger background knowledge graph generation job
      await fetch('/api/ai/knowledge-graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId, focusAreas, depth })
      });
      
      // Poll for completion
      let status = 'processing';
      while (status === 'processing') {
        status = await kv.get(`graph:${documentId}:status`);
        if (status === 'completed') {
          return await kv.get(`graph:${documentId}:result`);
        } else if (status === 'failed') {
          throw new Error(await kv.get(`graph:${documentId}:error`));
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
}); 