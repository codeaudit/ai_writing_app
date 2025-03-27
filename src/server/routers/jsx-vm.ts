import { z } from 'zod';
import { router, publicProcedure } from '../trpc';

export const jsxVmRouter = router({
  executeTemplate: publicProcedure
    .input(z.object({
      template: z.string(),
      variables: z.record(z.any()),
    }))
    .mutation(async ({ input }) => {
      // Implementation will execute the JSX template with the given variables
      // This is a placeholder
      return {
        result: `Executed template with variables: ${Object.keys(input.variables).join(', ')}`,
        success: true,
      };
    }),
    
  getExamples: publicProcedure
    .query(async () => {
      // Implementation will return example templates
      // This is a placeholder
      return [
        {
          id: 'example1',
          name: 'Simple Example',
          template: '<div>{text}</div>',
          variables: { text: 'Hello World' }
        },
        {
          id: 'example2',
          name: 'Loop Example',
          template: '<ul>{items.map(item => <li>{item}</li>)}</ul>',
          variables: { items: ['One', 'Two', 'Three'] }
        }
      ];
    }),
}); 