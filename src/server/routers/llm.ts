import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { observable } from '@trpc/server/observable';

export const llmRouter = router({
  generateText: publicProcedure
    .input(z.object({
      prompt: z.string(),
      stream: z.boolean().optional(),
      aiRole: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      // Implementation will connect to the existing LLM service
      // This is a placeholder
      return {
        text: `Response to: ${input.prompt}`,
        model: 'gpt-4',
        usage: {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30
        }
      };
    }),
  
  getModels: publicProcedure
    .query(async () => {
      // Implementation will return available models
      // This is a placeholder
      return [
        { id: 'gpt-4', name: 'GPT-4', provider: 'openai' },
        { id: 'claude-3', name: 'Claude 3', provider: 'anthropic' },
        { id: 'gemini-pro', name: 'Gemini Pro', provider: 'google' }
      ];
    }),
    
  generateTextStream: publicProcedure
    .input(z.object({
      prompt: z.string(),
      aiRole: z.string().optional(),
    }))
    .subscription(async ({ input }) => {
      // Return an observable that emits chunks of the response
      return observable<string>((emit) => {
        // Implementation of streaming
        // This is a placeholder that emits a few chunks
        const words = input.prompt.split(' ');
        
        let i = 0;
        const interval = setInterval(() => {
          if (i < words.length) {
            emit.next(words[i]);
            i++;
          } else {
            clearInterval(interval);
            emit.complete();
          }
        }, 100);
        
        // Function to clean up when subscription is cancelled
        return () => {
          clearInterval(interval);
        };
      });
    }),
}); 