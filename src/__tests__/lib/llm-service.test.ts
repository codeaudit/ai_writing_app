import { generateTextServerAction, generateChatResponse } from '../../lib/llm-service';
import { useLLMStore } from '../../lib/store';
import * as ai from 'ai';
import { logAIDebug } from '../../lib/ai-debug';

// Mock dependencies
jest.mock('ai', () => ({
  generateText: jest.fn(),
  streamText: jest.fn(),
  wrapLanguageModel: jest.fn()
}));

jest.mock('@ai-sdk/openai', () => ({
  openai: jest.fn()
}));

jest.mock('@ai-sdk/anthropic', () => ({
  anthropic: jest.fn()
}));

jest.mock('@ai-sdk/google', () => ({
  google: jest.fn()
}));

jest.mock('@vercel/kv', () => ({
  kv: {
    get: jest.fn(),
    set: jest.fn()
  }
}));

jest.mock('next/headers', () => ({
  cookies: () => ({
    get: jest.fn().mockImplementation((name) => {
      if (name === 'llm-config') {
        return { value: JSON.stringify({ provider: 'openai', model: 'gpt-3.5-turbo' }) };
      }
      return null;
    })
  })
}));

jest.mock('../../lib/ai-debug', () => ({
  formatDebugPrompt: jest.fn().mockReturnValue('Debug prompt'),
  logAIDebug: jest.fn()
}));

jest.mock('../../lib/ai-middleware', () => ({
  createCacheMiddleware: jest.fn().mockReturnValue((model: any) => model)
}));

describe('llm-service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock process.env
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-google-key';
  });

  describe('generateTextServerAction', () => {
    it('should generate text with OpenAI', async () => {
      // Mock AI SDK response
      (ai.generateText as jest.Mock).mockResolvedValueOnce({
        text: 'Generated text from OpenAI',
        model: 'gpt-3.5-turbo'
      });
      
      const result = await generateTextServerAction({
        prompt: 'Test prompt',
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 500
      });
      
      expect(result.text).toBe('Generated text from OpenAI');
      expect(result.model).toBe('gpt-3.5-turbo');
      expect(result.provider).toBe('openai');
      expect(ai.generateText).toHaveBeenCalled();
      expect(logAIDebug).toHaveBeenCalled();
    });

    it('should handle errors during text generation', async () => {
      // Mock error in AI SDK
      (ai.generateText as jest.Mock).mockRejectedValueOnce(new Error('API error'));
      
      await expect(generateTextServerAction({
        prompt: 'Test prompt'
      })).rejects.toThrow('API error');
    });
  });

  describe('generateChatResponse', () => {
    it('should generate chat response with context documents', async () => {
      // Mock AI SDK response
      (ai.generateText as jest.Mock).mockResolvedValueOnce({
        text: 'Chat response with context',
        model: 'gpt-3.5-turbo'
      });
      
      const result = await generateChatResponse({
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
          { role: 'user', content: 'Tell me about these documents' }
        ],
        contextDocuments: [
          { title: 'Document 1', content: 'Content of document 1' },
          { title: 'Document 2', content: 'Content of document 2' }
        ]
      });
      
      expect(result.message.content).toBe('Chat response with context');
      expect(result.model).toBe('gpt-3.5-turbo');
      expect(result.provider).toBe('openai');
      expect(ai.generateText).toHaveBeenCalled();
      
      // Verify that the prompt includes context documents
      const generateTextCall = (ai.generateText as jest.Mock).mock.calls[0][0];
      expect(generateTextCall.prompt).toContain('Document 1');
      expect(generateTextCall.prompt).toContain('Document 2');
    });

    it('should handle streaming chat responses', async () => {
      // Mock streaming response
      (ai.streamText as jest.Mock).mockResolvedValueOnce({
        text: 'Streamed response',
        model: 'gpt-3.5-turbo'
      });
      
      const result = await generateChatResponse({
        messages: [
          { role: 'user', content: 'Hello' }
        ],
        stream: true
      });
      
      expect(result.message.content).toBe('Streamed response');
      expect(ai.streamText).toHaveBeenCalled();
    });

    it('should include debug prompt when in development environment', async () => {
      // Use a different approach to test development environment
      const testEnv = {
        ...process.env,
        NODE_ENV: 'development' as 'development'
      };
      
      // Mock process.env
      jest.replaceProperty(process, 'env', testEnv);
      
      // Mock AI SDK response
      (ai.generateText as jest.Mock).mockResolvedValueOnce({
        text: 'Response with debug',
        model: 'gpt-3.5-turbo'
      });
      
      const result = await generateChatResponse({
        messages: [
          { role: 'user', content: 'Hello' }
        ],
        // Use a proper type for the request
        stream: false
      });
      
      expect(result.debugPrompt).toBeDefined();
    });
  });
});
