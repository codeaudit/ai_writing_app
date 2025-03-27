import { inferAsyncReturnType } from '@trpc/server';
import { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';

export async function createContext(opts: FetchCreateContextFnOptions) {
  // Get session from cookie
  const sessionId = opts.req.headers.get('cookie')?.split(';')
    .find(c => c.trim().startsWith('session-id='))
    ?.split('=')[1];
  
  return {
    sessionId,
    isAdmin: false, // Implement admin check logic
  };
}

export type Context = inferAsyncReturnType<typeof createContext>; 