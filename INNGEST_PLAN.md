# Plan to Integrate Inngest AgentKit with LLM Tools and MCP Servers

## 1. Core Infrastructure Setup

### 1.1 Install Dependencies
```bash
npm install inngest @vercel/kv ai-sdk-rsc agentkit @langchain/core langchain @vercel/ai d3
```

### 1.2 Create Inngest Client
```typescript
// src/lib/inngest/client.ts
import { Inngest } from 'inngest';

export const inngest = new Inngest({ 
  id: 'writing-app',
  eventKey: process.env.INNGEST_EVENT_KEY 
});
```

## 2. AgentKit Integration

### 2.1 Define Agent Configuration

```typescript
// src/lib/agents/config.ts
import { defineAgent } from 'agentkit';
import { z } from 'zod';

export const writingAgent = defineAgent({
  name: 'writing-assistant',
  description: 'Advanced writing assistant that helps with document editing, analysis, and improvement',
  tools: [
    {
      name: 'analyze_document',
      description: 'Analyzes a document and provides comprehensive feedback',
      inputSchema: z.object({
        documentId: z.string().describe('ID of the document to analyze'),
        focusAreas: z.array(z.string()).optional().describe('Specific areas to focus on'),
      }),
    },
    {
      name: 'improve_writing',
      description: 'Suggests improvements to writing style, clarity, and structure',
      inputSchema: z.object({
        content: z.string().describe('Content to improve'),
        style: z.string().optional().describe('Target writing style'),
      }),
    },
    {
      name: 'extract_insights',
      description: 'Extracts key insights, topics, and themes from a document',
      inputSchema: z.object({
        documentId: z.string().describe('ID of the document to analyze'),
      }),
    },
    // New Tools
    {
      name: 'generate_smart_template',
      description: 'Generates personalized templates based on writing style analysis',
      inputSchema: z.object({
        userId: z.string().describe('User ID for style analysis'),
        templateType: z.string().describe('Type of content template to generate'),
        customInstructions: z.string().optional().describe('Specific requirements for the template'),
      }),
    },
    {
      name: 'analyze_narrative_structure',
      description: 'Analyzes narrative structure and provides improvement suggestions',
      inputSchema: z.object({
        documentId: z.string().describe('ID of the document to analyze'),
        structureType: z.enum(['three-act', 'hero-journey', 'save-the-cat', 'any']).optional().describe('Specific narrative structure to analyze against'),
      }),
    },
    {
      name: 'enhance_metaphors_imagery',
      description: 'Suggests vivid metaphors and imagery to enhance descriptions',
      inputSchema: z.object({
        content: z.string().describe('Content to enhance'),
        theme: z.string().optional().describe('Theme to align metaphors with'),
        tone: z.string().optional().describe('Tone of the content'),
      }),
    },
    {
      name: 'generate_knowledge_graph',
      description: 'Creates a semantic knowledge graph of concepts and relationships',
      inputSchema: z.object({
        documentId: z.string().describe('ID of the document to analyze'),
        focusAreas: z.array(z.string()).optional().describe('Specific areas to focus on'),
        depth: z.number().min(1).max(5).optional().describe('Depth of connections (1-5)'),
      }),
    }
  ],
  runtimeEnv: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  }
});
```

### 2.2 Create Tool Implementations

```typescript
// src/lib/agents/tools.ts
import { useDocumentStore } from '@/lib/store';
import { extractFrontmatter } from '@/domain/editor';

export async function analyzeDocument({ documentId, focusAreas = [] }) {
  // Get document content from store
  const { documents } = useDocumentStore.getState();
  const document = documents.find(doc => doc.id === documentId);
  
  if (!document) {
    throw new Error(`Document with ID ${documentId} not found`);
  }
  
  // Extract content and metadata
  const { frontmatter, content } = extractFrontmatter(document.content);
  
  // Return analysis based on document content and focus areas
  return {
    analysis: {
      // Analysis data structure
      title: document.name,
      wordCount: content.split(/\s+/).length,
      focusAreas: focusAreas.map(area => ({ area, feedback: '...' })),
      overallFeedback: '...',
      suggestedImprovements: []
    }
  };
}

export async function improveWriting({ content, style = 'clear' }) {
  // Implementation for improving writing
  return {
    improvedContent: '...',
    changes: []
  };
}

export async function extractInsights({ documentId }) {
  // Implementation for extracting insights
  return {
    topics: [],
    insights: [],
    keyPhrases: []
  };
}

// New tool implementations
export async function generateSmartTemplate({ userId, templateType, customInstructions = '' }) {
  // Get user's documents to analyze writing style
  const { documents } = useDocumentStore.getState();
  const userDocuments = documents.filter(doc => doc.userId === userId);
  
  if (userDocuments.length === 0) {
    throw new Error('No user documents found for style analysis');
  }
  
  // Analyze writing style from existing documents
  const samples = userDocuments.slice(0, 5).map(doc => doc.content);
  
  // Generate template based on analysis
  // This would involve a complex LLM call with proper prompting
  const template = {
    title: `${templateType.charAt(0).toUpperCase() + templateType.slice(1)} Template`,
    sections: [],
    styleGuide: {},
    examples: []
  };
  
  // Populate template sections based on templateType
  switch (templateType.toLowerCase()) {
    case 'blog':
      template.sections = [
        { name: 'Hook', description: 'Attention-grabbing opening', example: '...' },
        { name: 'Introduction', description: 'Context setting', example: '...' },
        // more sections
      ];
      break;
    case 'academic':
      template.sections = [
        { name: 'Abstract', description: 'Summary of research', example: '...' },
        { name: 'Introduction', description: 'Research context', example: '...' },
        // more sections
      ];
      break;
    // other template types
  }
  
  return {
    template,
    styleAnalysis: {
      // Analysis of user's writing style
      vocabulary: {
        level: 'advanced',
        distinctWords: 450,
        favoredTerms: []
      },
      sentenceStructure: {
        averageLength: 15,
        complexity: 'moderate'
      },
      // more style attributes
    }
  };
}

export async function analyzeNarrativeStructure({ documentId, structureType = 'any' }) {
  // Get document content
  const { documents } = useDocumentStore.getState();
  const document = documents.find(doc => doc.id === documentId);
  
  if (!document) {
    throw new Error(`Document with ID ${documentId} not found`);
  }
  
  // Extract content
  const { content } = extractFrontmatter(document.content);
  
  // Analyze narrative structure
  // This would involve advanced LLM prompting to identify story elements
  
  const structureMap = {
    // Map of identified story elements to narrative structure components
    exposition: { exists: true, strength: 'strong', location: 'beginning' },
    risingAction: { exists: true, strength: 'moderate', location: 'middle' },
    climax: { exists: false, strength: 'weak', location: null },
    // more structure elements
  };
  
  const recommendations = [
    {
      element: 'climax',
      issue: 'Missing clear climactic moment',
      suggestion: 'Consider adding a definitive moment where the protagonist faces their greatest challenge',
      exampleText: '...'
    },
    // more recommendations
  ];
  
  return {
    structure: structureType,
    analysis: structureMap,
    recommendations,
    visualization: {
      // Data for visualizing the narrative arc
      points: [
        { position: 0.1, tension: 0.2, event: 'Character introduction' },
        { position: 0.3, tension: 0.4, event: 'First conflict' },
        // more points
      ]
    }
  };
}

export async function enhanceMetaphorsImagery({ content, theme = '', tone = 'neutral' }) {
  // This would involve sophisticated LLM prompting to generate metaphors
  // that align with the existing content and specified theme/tone
  
  const contentAnalysis = {
    // Analysis of existing imagery and metaphors
    existingMetaphors: [
      { text: '...', strength: 'weak', theme: '...' },
      // more metaphors
    ],
    imageryDensity: 'low',
    // more analysis
  };
  
  const suggestions = [
    {
      originalText: 'The market crashed suddenly',
      enhancedText: 'The market collapsed like a house of cards in a sudden gust',
      type: 'metaphor',
      explanation: 'This metaphor adds visual impact and conveys the fragility of the market'
    },
    // more suggestions
  ];
  
  return {
    analysis: contentAnalysis,
    suggestions,
    thematicElements: {
      // Related imagery that could be incorporated
      relatedSymbols: [],
      contrastingImagery: [],
      // more elements
    }
  };
}

export async function generateKnowledgeGraph({ documentId, focusAreas = [], depth = 3 }) {
  // Get document content
  const { documents } = useDocumentStore.getState();
  const document = documents.find(doc => doc.id === documentId);
  
  if (!document) {
    throw new Error(`Document with ID ${documentId} not found`);
  }
  
  // Extract content
  const { content } = extractFrontmatter(document.content);
  
  // Generate knowledge graph
  // This would involve NLP and LLM analysis to extract entities and relationships
  
  const entities = [
    { id: 'e1', name: 'Climate Change', type: 'concept', mentions: 12 },
    { id: 'e2', name: 'Carbon Emissions', type: 'concept', mentions: 8 },
    // more entities
  ];
  
  const relationships = [
    { source: 'e1', target: 'e2', type: 'causes', strength: 0.9 },
    { source: 'e2', target: 'e3', type: 'impacts', strength: 0.7 },
    // more relationships
  ];
  
  return {
    title: document.name,
    entities,
    relationships,
    clusters: [
      { name: 'Environmental Factors', entities: ['e1', 'e2', 'e5'] },
      // more clusters
    ],
    visualization: {
      // D3-compatible graph data
      nodes: entities.map(e => ({ id: e.id, label: e.name, group: e.type })),
      links: relationships.map(r => ({ source: r.source, target: r.target, value: r.strength }))
    }
  };
}

### 2.3 LLM Calling Patterns

```typescript
// src/lib/agents/llm-patterns.ts
import { OpenAI } from 'langchain/llms/openai';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { AgentExecutor, createOpenAIFunctionsAgent } from 'langchain/agents';
import { MCPClient } from '@vercel/mcp';

// 1. Direct LLM Call with Tool Pattern
export async function analyzeWritingStyle({ content, style = 'general' }) {
  const llm = new ChatOpenAI({
    modelName: 'gpt-4-turbo-preview',
    temperature: 0.7,
  });

  const prompt = `Analyze the following text and provide feedback on its writing style.
  Focus on: clarity, conciseness, tone, and engagement.
  
  Text: ${content}
  Style: ${style}
  
  Provide your analysis in JSON format with the following structure:
  {
    "clarity": { "score": number, "feedback": string },
    "conciseness": { "score": number, "feedback": string },
    "tone": { "score": number, "feedback": string },
    "engagement": { "score": number, "feedback": string },
    "overall": { "score": number, "summary": string }
  }`;

  const response = await llm.invoke(prompt);
  return JSON.parse(response.content);
}

// 2. MCP Pattern for Complex Operations
export async function generateSmartTemplate({ userId, templateType, customInstructions = '' }) {
  const mcp = new MCPClient({
    apiKey: process.env.MCP_API_KEY,
    projectId: process.env.MCP_PROJECT_ID,
  });

  // Define the operation steps
  const steps = [
    {
      name: 'analyze_user_style',
      prompt: `Analyze the writing style of the following documents and extract key patterns.
      Focus on: vocabulary, sentence structure, and rhetorical devices.
      
      Documents: ${JSON.stringify(userDocuments)}
      
      Provide analysis in JSON format.`,
      model: 'gpt-4-turbo-preview',
      temperature: 0.3,
    },
    {
      name: 'generate_template',
      prompt: `Based on the style analysis, generate a template for ${templateType}.
      Include section structure, style guidelines, and example content.
      
      Style Analysis: ${steps[0].result}
      Custom Instructions: ${customInstructions}
      
      Provide template in JSON format.`,
      model: 'gpt-4-turbo-preview',
      temperature: 0.7,
    },
    {
      name: 'validate_template',
      prompt: `Validate the generated template against best practices for ${templateType}.
      Check for completeness, clarity, and effectiveness.
      
      Template: ${steps[1].result}
      
      Provide validation results in JSON format.`,
      model: 'gpt-4-turbo-preview',
      temperature: 0.3,
    }
  ];

  // Execute the operation
  const result = await mcp.executeOperation({
    name: 'generate_smart_template',
    steps,
    metadata: {
      userId,
      templateType,
      timestamp: new Date().toISOString(),
    }
  });

  return result;
}

// 3. Hybrid Pattern: Agent with MCP
export async function analyzeNarrativeStructure({ documentId, structureType = 'any' }) {
  const llm = new ChatOpenAI({
    modelName: 'gpt-4-turbo-preview',
    temperature: 0.7,
  });

  const mcp = new MCPClient({
    apiKey: process.env.MCP_API_KEY,
    projectId: process.env.MCP_PROJECT_ID,
  });

  // First, use MCP for deep analysis
  const analysisResult = await mcp.executeOperation({
    name: 'narrative_analysis',
    steps: [
      {
        name: 'extract_structure',
        prompt: `Analyze the narrative structure of the following text.
        Identify key plot points, character arcs, and thematic elements.
        
        Text: ${document.content}
        Structure Type: ${structureType}
        
        Provide analysis in JSON format.`,
        model: 'gpt-4-turbo-preview',
        temperature: 0.3,
      }
    ]
  });

  // Then, use agent for improvement suggestions
  const tools = [
    {
      name: 'suggest_improvements',
      description: 'Suggests specific improvements to narrative structure',
      func: async ({ analysis }) => {
        const prompt = `Based on the following narrative analysis, suggest specific improvements.
        
        Analysis: ${JSON.stringify(analysis)}
        
        Provide suggestions in JSON format with the following structure:
        {
          "plot_points": [{ "issue": string, "suggestion": string }],
          "character_arcs": [{ "issue": string, "suggestion": string }],
          "thematic_elements": [{ "issue": string, "suggestion": string }]
        }`;

        const response = await llm.invoke(prompt);
        return JSON.parse(response.content);
      }
    }
  ];

  const agent = await createOpenAIFunctionsAgent({
    llm,
    tools,
    verbose: true
  });

  const executor = AgentExecutor.fromAgentAndTools({
    agent,
    tools,
    verbose: true
  });

  const suggestions = await executor.run({
    analysis: analysisResult
  });

  return {
    analysis: analysisResult,
    suggestions
  };
}
```

These examples demonstrate three different patterns for working with LLMs:

1. **Direct LLM Call with Tool Pattern**
   - Simple, direct interaction with the LLM
   - Best for straightforward tasks with clear input/output
   - Easy to implement and debug
   - Good for single-step operations

2. **MCP Pattern**
   - Complex, multi-step operations
   - Built-in error handling and retries
   - State management between steps
   - Good for operations requiring multiple LLM calls
   - Better for production reliability

3. **Hybrid Pattern (Agent with MCP)**
   - Combines MCP's reliability with agent's flexibility
   - Good for complex operations requiring both structured steps and dynamic decision-making
   - Leverages both tools and MCP capabilities
   - Best for sophisticated use cases

Each pattern has its use case:
- Use the direct pattern for simple operations
- Use MCP for complex, multi-step operations
- Use the hybrid pattern when you need both structured steps and dynamic decision-making

## 3. Inngest Functions for Asynchronous LLM Processing

### 3.1 Define Event Types

```typescript
// src/lib/inngest/events.ts
export type DocumentAnalysisRequestedEvent = {
  name: 'document.analysis.requested';
  data: {
    documentId: string;
    userId: string;
    focusAreas?: string[];
  };
};

export type WritingImprovementRequestedEvent = {
  name: 'writing.improvement.requested';
  data: {
    content: string;
    documentId?: string;
    style?: string;
    userId: string;
  };
};

export type AgentToolInvokedEvent = {
  name: 'agent.tool.invoked';
  data: {
    toolName: string;
    params: Record<string, any>;
    userId: string;
    requestId: string;
  };
};

// New event types
export type SmartTemplateGenerationRequestedEvent = {
  name: 'template.generation.requested';
  data: {
    userId: string;
    templateType: string;
    customInstructions?: string;
  };
};

export type NarrativeStructureAnalysisRequestedEvent = {
  name: 'narrative.analysis.requested';
  data: {
    documentId: string;
    userId: string;
    structureType?: 'three-act' | 'hero-journey' | 'save-the-cat' | 'any';
  };
};

export type MetaphorEnhancementRequestedEvent = {
  name: 'metaphor.enhancement.requested';
  data: {
    content: string;
    documentId?: string;
    theme?: string;
    tone?: string;
    userId: string;
  };
};

export type KnowledgeGraphGenerationRequestedEvent = {
  name: 'knowledge.graph.requested';
  data: {
    documentId: string;
    userId: string;
    focusAreas?: string[];
    depth?: number;
  };
};
```

### 3.2 Create Inngest Functions

```typescript
// src/lib/inngest/functions.ts
import { inngest } from './client';
import { writingAgent } from '../agents/config';
import * as tools from '../agents/tools';
import { kv } from '@vercel/kv';

// Handle document analysis
export const analyzeDocumentFunction = inngest.createFunction(
  { name: 'Analyze Document' },
  { event: 'document.analysis.requested' },
  async ({ event, step }) => {
    const { documentId, userId, focusAreas } = event.data;
    
    // Store request status
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

// Similar functions for other tools

// New Inngest functions
export const generateSmartTemplateFunction = inngest.createFunction(
  { name: 'Generate Smart Template' },
  { event: 'template.generation.requested' },
  async ({ event, step }) => {
    const { userId, templateType, customInstructions } = event.data;
    
    // Store request status
    await kv.set(`template:${userId}:${templateType}:status`, 'processing');
    
    try {
      // Execute template generation
      const result = await step.run('Generate template', async () => {
        return await tools.generateSmartTemplate({ 
          userId, 
          templateType, 
          customInstructions 
        });
      });
      
      // Store results
      await kv.set(`template:${userId}:${templateType}:result`, result);
      await kv.set(`template:${userId}:${templateType}:status`, 'completed');
      
      return { success: true, userId, templateType, result };
    } catch (error) {
      await kv.set(`template:${userId}:${templateType}:status`, 'failed');
      await kv.set(`template:${userId}:${templateType}:error`, error.message);
      return { success: false, error: error.message };
    }
  }
);

export const analyzeNarrativeStructureFunction = inngest.createFunction(
  { name: 'Analyze Narrative Structure' },
  { event: 'narrative.analysis.requested' },
  async ({ event, step }) => {
    const { documentId, userId, structureType } = event.data;
    
    // Store request status
    await kv.set(`narrative:${documentId}:status`, 'processing');
    
    try {
      // Execute narrative analysis
      const result = await step.run('Analyze narrative', async () => {
        return await tools.analyzeNarrativeStructure({ 
          documentId, 
          structureType 
        });
      });
      
      // Store results
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

export const enhanceMetaphorsImageryFunction = inngest.createFunction(
  { name: 'Enhance Metaphors and Imagery' },
  { event: 'metaphor.enhancement.requested' },
  async ({ event, step }) => {
    const { content, documentId, theme, tone, userId } = event.data;
    const requestId = documentId || `metaphor-${Date.now()}`;
    
    // Store request status
    await kv.set(`metaphor:${requestId}:status`, 'processing');
    
    try {
      // Execute metaphor enhancement
      const result = await step.run('Enhance metaphors', async () => {
        return await tools.enhanceMetaphorsImagery({ 
          content, 
          theme, 
          tone 
        });
      });
      
      // Store results
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
  { event: 'knowledge.graph.requested' },
  async ({ event, step }) => {
    const { documentId, userId, focusAreas, depth } = event.data;
    
    // Store request status
    await kv.set(`graph:${documentId}:status`, 'processing');
    
    try {
      // Execute knowledge graph generation
      const result = await step.run('Generate knowledge graph', async () => {
        return await tools.generateKnowledgeGraph({ 
          documentId, 
          focusAreas, 
          depth 
        });
      });
      
      // Store results
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
```

## 4. API Routes for Client Interaction

### 4.1 Create Inngest Event Handler

```typescript
// src/app/api/inngest/route.ts
import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import { 
  analyzeDocumentFunction, 
  improveWritingFunction,
  agentToolInvokerFunction,
  // New functions
  generateSmartTemplateFunction,
  analyzeNarrativeStructureFunction,
  enhanceMetaphorsImageryFunction,
  generateKnowledgeGraphFunction
} from '@/lib/inngest/functions';

export const { GET, POST } = serve({
  client: inngest,
  functions: [
    analyzeDocumentFunction,
    improveWritingFunction,
    agentToolInvokerFunction,
    // New functions
    generateSmartTemplateFunction,
    analyzeNarrativeStructureFunction,
    enhanceMetaphorsImageryFunction,
    generateKnowledgeGraphFunction
  ]
});
```

### 4.2 Create API Endpoints for New Tools

```typescript
// src/app/api/ai/smart-template/route.ts
import { inngest } from '@/lib/inngest/client';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { templateType, customInstructions } = await req.json();
  
  if (!templateType) {
    return NextResponse.json({ error: 'Template type is required' }, { status: 400 });
  }
  
  // Trigger inngest event
  const eventId = await inngest.send({
    name: 'template.generation.requested',
    data: {
      userId: session.user.id,
      templateType,
      customInstructions
    }
  });
  
  return NextResponse.json({ 
    success: true,
    message: 'Template generation started',
    requestId: eventId
  });
}

// Similar routes for other new tools...
```

## 5. React Server Components for AI SDK Integration

### 5.1 Update AI SDK Client with New Actions

```typescript
// src/lib/ai-sdk/client.ts
import { createAI, createStreamableUI, getMutableAIState } from 'ai-sdk-rsc';
import { writingAgent } from '../agents/config';
import { kv } from '@vercel/kv';

export const AI = createAI({
  actions: {
    // Existing actions...
    
    // New actions
    generateSmartTemplate: async (templateType, customInstructions = '') => {
      const aiState = getMutableAIState();
      
      // Generate unique request ID
      const requestId = `template-${templateType}-${Date.now()}`;
      
      // Show streaming UI for template generation
      const ui = createStreamableUI();
      ui.update(<div className="animate-pulse">Generating smart template...</div>);
      
      // Trigger background template generation job
      await fetch('/api/ai/smart-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateType, customInstructions, requestId })
      });
      
      // Poll for completion
      // Similar implementation as existing actions...
      
      return null;
    },
    
    analyzeNarrativeStructure: async (documentId, structureType = 'any') => {
      // Implementation similar to existing actions...
    },
    
    enhanceMetaphorsImagery: async (content, theme = '', tone = 'neutral') => {
      // Implementation similar to existing actions...
    },
    
    generateKnowledgeGraph: async (documentId, focusAreas = [], depth = 3) => {
      // Implementation similar to existing actions...
    }
  },
  initialAIState: {
    analysis: null,
    improvements: null,
    insights: null,
    // New state for advanced tools
    templates: [],
    narrativeAnalysis: null,
    metaphorSuggestions: [],
    knowledgeGraph: null
  }
});
```

## 8. New UI Components for Advanced Tools

### 8.1 Create Smart Template Generator Component

```tsx
// src/components/ai/smart-template-generator.tsx
'use client';

import { useState } from 'react';
import { useAI } from 'ai-sdk-rsc/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FileTemplate, Wand } from 'lucide-react';

export function SmartTemplateGenerator() {
  const [templateType, setTemplateType] = useState('blog');
  const [customInstructions, setCustomInstructions] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const { generateSmartTemplate } = useAI();
  
  const handleGenerateTemplate = async () => {
    setIsGenerating(true);
    try {
      await generateSmartTemplate(templateType, customInstructions);
    } catch (error) {
      console.error('Template generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <FileTemplate className="h-5 w-5 mr-2" />
          Smart Template Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Template Type</label>
          <Select value={templateType} onValueChange={setTemplateType}>
            <SelectTrigger>
              <SelectValue placeholder="Select template type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="blog">Blog Post</SelectItem>
              <SelectItem value="academic">Academic Paper</SelectItem>
              <SelectItem value="fiction">Fiction Story</SelectItem>
              <SelectItem value="business">Business Report</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Custom Instructions (Optional)</label>
          <Textarea
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            placeholder="Specific requirements or preferences for your template..."
            rows={3}
          />
        </div>
        
        <Button 
          onClick={handleGenerateTemplate} 
          disabled={isGenerating}
          className="w-full"
        >
          {isGenerating ? (
            <>Generating Template...</>
          ) : (
            <>
              <Wand className="h-4 w-4 mr-2" />
              Generate Smart Template
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
```

### 8.2 Create Knowledge Graph Visualizer Component

```tsx
// src/components/ai/knowledge-graph-visualizer.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useAI } from 'ai-sdk-rsc/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDocumentStore } from '@/lib/store';
import { Network, Share2 } from 'lucide-react';
import * as d3 from 'd3';

export function KnowledgeGraphVisualizer() {
  const svgRef = useRef(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { selectedDocumentId, documents } = useDocumentStore();
  const selectedDocument = documents.find(doc => doc.id === selectedDocumentId);
  
  const { generateKnowledgeGraph } = useAI();
  
  const handleGenerateGraph = async () => {
    if (!selectedDocumentId) return;
    
    setIsGenerating(true);
    try {
      await generateKnowledgeGraph(selectedDocumentId);
    } catch (error) {
      console.error('Knowledge graph generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };
  
  // D3 visualization rendering logic would go here
  useEffect(() => {
    // This would render the D3 force-directed graph when data is available
  }, [selectedDocumentId]);
  
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <Network className="h-5 w-5 mr-2" />
          Semantic Knowledge Graph
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {selectedDocument ? (
          <>
            <div className="text-sm">
              Document: <span className="font-medium">{selectedDocument.name}</span>
            </div>
            
            <div className="aspect-square bg-muted/20 rounded-md border overflow-hidden">
              <svg ref={svgRef} width="100%" height="100%" />
            </div>
            
            <Button 
              onClick={handleGenerateGraph} 
              disabled={isGenerating || !selectedDocumentId}
              className="w-full"
            >
              {isGenerating ? (
                <>Generating Knowledge Graph...</>
              ) : (
                <>
                  <Share2 className="h-4 w-4 mr-2" />
                  Generate Knowledge Graph
                </>
              )}
            </Button>
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Select a document to generate a knowledge graph
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### 8.3 Advanced Tools Panel Component

```tsx
// src/components/ai/advanced-tools-panel.tsx
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SmartTemplateGenerator } from './smart-template-generator';
import { NarrativeStructureAnalyzer } from './narrative-structure-analyzer';
import { MetaphorImageryEnhancer } from './metaphor-imagery-enhancer';
import { KnowledgeGraphVisualizer } from './knowledge-graph-visualizer';

export function AdvancedToolsPanel() {
  return (
    <Tabs defaultValue="templates" className="w-full">
      <TabsList className="grid grid-cols-4 mb-4">
        <TabsTrigger value="templates">Templates</TabsTrigger>
        <TabsTrigger value="narrative">Narrative</TabsTrigger>
        <TabsTrigger value="metaphors">Metaphors</TabsTrigger>
        <TabsTrigger value="knowledge">Knowledge Graph</TabsTrigger>
      </TabsList>
      
      <TabsContent value="templates" className="p-0">
        <SmartTemplateGenerator />
      </TabsContent>
      
      <TabsContent value="narrative" className="p-0">
        <NarrativeStructureAnalyzer />
      </TabsContent>
      
      <TabsContent value="metaphors" className="p-0">
        <MetaphorImageryEnhancer />
      </TabsContent>
      
      <TabsContent value="knowledge" className="p-0">
        <KnowledgeGraphVisualizer />
      </TabsContent>
    </Tabs>
  );
}
```

## 9. Implementation Timeline

1. **Week 1-2: Core Infrastructure and Basic Tools**
   - Set up Inngest client and functions
   - Implement AgentKit configuration
   - Configure Vercel KV for state management
   - Implement document analysis tool

2. **Week 3-4: Advanced Tools - First Wave**
   - Implement Smart Templates Generator
   - Implement Narrative Structure Analyzer
   - Create UI components for these tools

3. **Week 5-6: Advanced Tools - Second Wave**
   - Implement Metaphor & Imagery Enhancer
   - Implement Semantic Knowledge Graph
   - Create D3-based visualization components

4. **Week 7-8: Integration and Testing**
   - Integrate all components into the main application
   - Optimize LLM prompts for better tool performance
   - Comprehensive testing and performance optimization

## 10. Benefits and Outcomes

- **Enhanced Creativity Support**: Tools like the Metaphor Enhancer and Smart Templates Generator help writers overcome creative blocks
- **Deeper Content Analysis**: Narrative Structure Analysis and Knowledge Graphs provide insights not visible at surface level
- **Advanced Visualization**: Knowledge graphs help writers visualize complex relationships between concepts
- **Personalized Writing Support**: Templates generated based on the writer's own style provide more relevant assistance 