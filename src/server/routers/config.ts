import { z } from 'zod';
import { router, publicProcedure } from '../trpc';

// Define the config schema
const configSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'gemini']).default('openai'),
  model: z.string().default('gpt-4'),
  enableCache: z.boolean().default(false),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().min(1).max(32000).default(1000),
  aiRole: z.string().default('assistant'),
});

export type AppConfig = z.infer<typeof configSchema>;

export const configRouter = router({
  getConfig: publicProcedure
    .query(async () => {
      // Implementation will get config from environment variables or database
      // This is a placeholder
      return {
        provider: process.env.DEFAULT_LLM_PROVIDER || 'openai',
        model: process.env.DEFAULT_LLM_MODEL || 'gpt-4',
        enableCache: process.env.ENABLE_AI_CACHE === 'true',
        temperature: parseFloat(process.env.DEFAULT_TEMPERATURE || '0.7'),
        maxTokens: parseInt(process.env.DEFAULT_MAX_TOKENS || '1000', 10),
        aiRole: 'assistant',
      };
    }),
  
  saveConfig: publicProcedure
    .input(configSchema)
    .mutation(async ({ input }) => {
      // Implementation will save config to database or env variables
      // This is a placeholder
      console.log('Saving config:', input);
      return {
        success: true,
        config: input
      };
    }),
    
  resetConfig: publicProcedure
    .mutation(async () => {
      // Implementation will reset config to defaults
      // This is a placeholder
      return {
        success: true,
        config: {
          provider: 'openai',
          model: 'gpt-4',
          enableCache: false,
          temperature: 0.7,
          maxTokens: 1000,
          aiRole: 'assistant',
        }
      };
    }),
    
  getAvailableModels: publicProcedure
    .input(z.object({
      provider: z.enum(['openai', 'anthropic', 'gemini']).optional(),
    }))
    .query(async ({ input }) => {
      // Implementation will get available models based on provider
      // This is a placeholder
      
      const openaiModels = [
        { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', context: 128000, provider: 'openai' },
        { id: 'gpt-4', name: 'GPT-4', context: 8192, provider: 'openai' },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', context: 16385, provider: 'openai' }
      ];
      
      const anthropicModels = [
        { id: 'claude-3-opus', name: 'Claude 3 Opus', context: 200000, provider: 'anthropic' },
        { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', context: 200000, provider: 'anthropic' },
        { id: 'claude-3-haiku', name: 'Claude 3 Haiku', context: 200000, provider: 'anthropic' }
      ];
      
      const geminiModels = [
        { id: 'gemini-pro', name: 'Gemini Pro', context: 32768, provider: 'gemini' },
        { id: 'gemini-flash', name: 'Gemini Flash', context: 32768, provider: 'gemini' }
      ];
      
      // If provider is specified, return only models for that provider
      if (input.provider) {
        switch (input.provider) {
          case 'openai':
            return openaiModels;
          case 'anthropic':
            return anthropicModels;
          case 'gemini':
            return geminiModels;
        }
      }
      
      // Otherwise return all models
      return [
        ...openaiModels,
        ...anthropicModels,
        ...geminiModels
      ];
    })
}); 