import { create } from 'zustand';
import { trpc } from '@/utils/trpc';

// This is an example of how to migrate an existing store to use tRPC
// It shows the pattern for converting fetch/API calls to tRPC calls

// Define the store state
interface LLMStore {
  // State
  isGenerating: boolean;
  selectedModel: string;
  availableModels: Array<{ id: string; name: string; provider: string }>;
  
  // Actions
  setSelectedModel: (model: string) => void;
  generateText: (prompt: string, aiRole?: string) => Promise<string>;
  loadModels: () => Promise<void>;
}

// Create the store with tRPC integration
export const useLLMStore = create<LLMStore>((set) => ({
  // Initial state
  isGenerating: false,
  selectedModel: 'gpt-4',
  availableModels: [],
  
  // Actions
  setSelectedModel: (model) => set({ selectedModel: model }),
  
  generateText: async (prompt, aiRole) => {
    set({ isGenerating: true });
    
    try {
      // Use the tRPC client directly in the store
      // This simplifies the implementation and provides type safety
      const utils = trpc.useUtils?.() || null;
      
      // If utils is available (in a React component context), use the mutation
      if (utils) {
        const result = await utils.client.llm.generateText.mutate({
          prompt,
          aiRole,
        });
        
        set({ isGenerating: false });
        return result.text;
      } 
      // Fallback for non-component context (can happen in some cases)
      else {
        // This is a temporary fallback using fetch during migration
        // Eventually all API calls should use tRPC
        const response = await fetch('/api/trpc/llm.generateText', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            json: { prompt, aiRole }
          }),
        });
        
        const data = await response.json();
        set({ isGenerating: false });
        return data.result.data.text;
      }
    } catch (error) {
      console.error('Error generating text:', error);
      set({ isGenerating: false });
      throw error;
    }
  },
  
  loadModels: async () => {
    try {
      const utils = trpc.useUtils?.() || null;
      
      if (utils) {
        const models = await utils.client.llm.getModels.query();
        set({ availableModels: models });
      } else {
        // Fallback using fetch during migration
        const response = await fetch('/api/trpc/llm.getModels');
        const data = await response.json();
        set({ availableModels: data.result.data });
      }
    } catch (error) {
      console.error('Error loading models:', error);
      // Set a default if load fails
      set({ 
        availableModels: [
          { id: 'gpt-4', name: 'GPT-4', provider: 'openai' },
          { id: 'claude-3', name: 'Claude 3', provider: 'anthropic' }
        ] 
      });
    }
  },
})); 