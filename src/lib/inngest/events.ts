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
    style?: string;
  };
};

export type SmartTemplateGenerationRequestedEvent = {
  name: 'template.generation.requested';
  data: {
    userId: string;
    templateType: string;
    customInstructions?: string;
  };
};

export type NarrativeAnalysisRequestedEvent = {
  name: 'narrative.analysis.requested';
  data: {
    documentId: string;
    structureType?: 'three-act' | 'hero-journey' | 'save-the-cat' | 'any';
  };
};

export type MetaphorEnhancementRequestedEvent = {
  name: 'metaphor.enhancement.requested';
  data: {
    content: string;
    theme?: string;
    tone?: string;
  };
};

export type KnowledgeGraphGenerationRequestedEvent = {
  name: 'knowledge.graph.generation.requested';
  data: {
    documentId: string;
    focusAreas?: string[];
    depth?: number;
  };
}; 