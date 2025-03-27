import { z } from 'zod';
import { router, publicProcedure } from '../trpc';

export const aiRolesRouter = router({
  getAvailableRoles: publicProcedure
    .query(async () => {
      // Implementation will get available AI roles
      // This is a placeholder
      return [
        { role: 'assistant', name: 'Assistant', description: 'General assistant' },
        { role: 'co-creator', name: 'Co-creator', description: 'Creative collaborator' },
        { role: 'validator', name: 'Validator', description: 'Fact-checking assistant' },
        { role: 'autopilot', name: 'Autopilot', description: 'Autonomous assistant' }
      ];
    }),
  
  getRoleSystemPrompt: publicProcedure
    .input(z.object({
      role: z.string(),
    }))
    .query(async ({ input }) => {
      // Implementation will get the system prompt for a role
      // This is a placeholder
      const rolePrompts = {
        assistant: 'You are a helpful assistant.',
        'co-creator': 'You are a creative collaborator.',
        validator: 'You are a fact-checking assistant.',
        autopilot: 'You are an autonomous assistant.'
      };
      
      return {
        role: input.role,
        systemPrompt: rolePrompts[input.role as keyof typeof rolePrompts] || rolePrompts.assistant
      };
    }),
    
  getAllRoles: publicProcedure
    .query(async () => {
      // Implementation will get all roles with their prompts
      // This is a placeholder
      return [
        { role: 'assistant', prompt: 'You are a helpful assistant.' },
        { role: 'co-creator', prompt: 'You are a creative collaborator.' },
        { role: 'validator', prompt: 'You are a fact-checking assistant.' },
        { role: 'autopilot', prompt: 'You are an autonomous assistant.' }
      ];
    }),
}); 