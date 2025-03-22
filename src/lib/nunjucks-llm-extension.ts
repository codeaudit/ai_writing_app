'use server';

import nunjucks from 'nunjucks';
import {
  generateChatResponse,
  generateTextServerAction,
  ChatMessage,
  ChatContextDocument
} from './llm-service';

/**
 * LLMExtension for Nunjucks
 * 
 * This extension adds an {% llm %} tag to Nunjucks templates that allows
 * generating content from LLMs directly within templates.
 */
interface LLMTagOptions {
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  contextDocuments?: ChatContextDocument[];
  aiRole?: string;
  systemPrompt?: string;
  chat?: boolean;
  messages?: ChatMessage[];
}

interface ParserInterface {
  nextToken: () => { value: string };
  parseSignature: (triggerChar: string | null, isBlock: boolean) => any;
  advanceAfterBlockEnd: (name: string) => void;
}

interface NodesInterface {
  CallExtensionAsync: new (
    extension: any, 
    prop: string, 
    args: any, 
    contentArgs?: any[]
  ) => any;
}

class LLMExtension implements nunjucks.Extension {
  tags = ['llm'];
  
  /**
   * Parse the tag and extract all parameters
   */
  parse(parser: ParserInterface, nodes: NodesInterface) {
    const token = parser.nextToken();
    console.log('LLM Extension: Parsing tag with token:', token.value);
    
    const args = parser.parseSignature(null, true);
    console.log('LLM Extension: Parsed arguments:', JSON.stringify(args));
    
    parser.advanceAfterBlockEnd(token.value);
    
    return new nodes.CallExtensionAsync(this, 'runLLM', args);
  }
  
  /**
   * Execute the LLM call and return the generated content
   */
  async runLLM(context: Record<string, any>, prompt: string, options: LLMTagOptions = {}, callback: (err: Error | null, result?: string) => void) {
    console.log('LLM Extension: runLLM called with prompt:', prompt);
    console.log('LLM Extension: options:', JSON.stringify(options));
    
    try {
      // Extract options from the function parameters or context
      const model = options.model || context.ctx?.llmModel;
      const temperature = options.temperature !== undefined 
        ? options.temperature 
        : (context.ctx?.llmTemperature !== undefined ? context.ctx?.llmTemperature : 0.7);
      const maxTokens = options.maxTokens !== undefined 
        ? options.maxTokens 
        : (context.ctx?.llmMaxTokens !== undefined ? context.ctx?.llmMaxTokens : 1000);
      const contextDocuments = options.contextDocuments || context.ctx?.contextDocuments;
      const aiRole = options.aiRole || context.ctx?.aiRole;
      const systemPrompt = options.systemPrompt || 
        (aiRole === 'creative' ? 'You are a creative writer with a poetic style.' :
         aiRole === 'technical' ? 'You are a technical expert who explains complex concepts clearly.' :
         aiRole === 'academic' ? 'You are an academic writer with a formal tone.' :
         context.ctx?.systemPrompt);
      const chat = options.chat || false;
      const messages = options.messages || [];

      console.log('LLM Extension: Using model:', model);
      console.log('LLM Extension: Using aiRole:', aiRole);
      console.log('LLM Extension: Chat mode:', chat);
      
      let result = '';
      
      if (chat) {
        // Handle chat mode
        const chatMessages: ChatMessage[] = [...messages];
        chatMessages.push({ role: 'user', content: prompt });
        
        if (systemPrompt) {
          // Prepend system message if provided
          // Using 'user' role since ChatMessage doesn't support 'system'
          chatMessages.unshift({ role: 'user', content: `SYSTEM: ${systemPrompt}` });
        }
        
        console.log('LLM Extension: Chat messages:', JSON.stringify(chatMessages));
        
        const response = await generateChatResponse({
          messages: chatMessages,
          contextDocuments
        });
        
        result = response.message?.content || 'No response generated';
      } else {
        // Handle text completion mode
        console.log('LLM Extension: Calling generateTextServerAction with prompt:', prompt);
        
        const response = await generateTextServerAction({
          prompt,
          temperature,
          maxTokens,
          model,
          aiRole: aiRole || 'assistant'
        });
        
        result = response.text || 'No response generated';
        console.log('LLM Extension: Got response text:', result.substring(0, 100) + (result.length > 100 ? '...' : ''));
      }
      
      console.log('LLM Extension: Returning result via callback');
      callback(null, result);
    } catch (error) {
      console.error('LLM Extension error:', error);
      callback(error as Error, 'Error generating content');
    }
  }
}

/**
 * Function to register the LLM extension with a Nunjucks environment
 */
export async function registerLLMExtension(env: nunjucks.Environment): Promise<void> {
  console.log('Registering LLM extension with Nunjucks environment');
  env.addExtension('LLMExtension', new LLMExtension());
} 