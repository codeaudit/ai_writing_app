import { Inngest } from 'inngest';

declare module 'inngest' {
  export class Inngest {
    constructor(config: { id: string; eventKey?: string });
    createFunction(config: { name: string }, options: { event: string }, handler: Function): any;
  }
}

export const inngest = new Inngest({ 
  id: 'writing-app',
  eventKey: process.env.INNGEST_EVENT_KEY 
}); 