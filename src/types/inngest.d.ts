// Type declarations for the Inngest package
declare module 'inngest' {
  export class Inngest {
    constructor(config: { id: string; eventKey?: string });
    createFunction<TEvent, TResult>(
      config: { name: string },
      options: { event: string },
      handler: (params: { event: TEvent; step: Step }) => Promise<TResult>
    ): InngestFunction<TEvent, TResult>;
    
    send<TEvent extends { name: string; data: Record<string, unknown> }>(
      event: TEvent
    ): Promise<void>;
  }

  export interface Step {
    run<R>(
      name: string,
      fn: () => Promise<R>
    ): Promise<R>;
  }

  export interface InngestFunction<TEvent, TResult> {
    name: string;
    handler: (params: { event: TEvent; step: Step }) => Promise<TResult>;
  }
}

declare module 'inngest/next' {
  import { Inngest, InngestFunction } from 'inngest';
  
  export function serve(options: {
    client: Inngest;
    functions: Array<InngestFunction<Record<string, unknown>, unknown>>;
  }): {
    GET: () => Promise<Response>;
    POST: () => Promise<Response>;
  };
} 