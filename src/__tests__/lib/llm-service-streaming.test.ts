// @ts-nocheck
import { generateChatResponse } from '../../lib/llm-service';
import { streamText } from 'ai';

// Mock the AI SDK
jest.mock('ai', () => ({
  streamText: jest.fn().mockImplementation(() => Promise.resolve({
    text: 'Hello world',
    model: 'gpt-3.5-turbo',
    provider: 'openai'
  })),
  generateText: jest.fn(),
  wrapLanguageModel: jest.fn()
}));

// Mock the environment variables
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-google-key';

// Mock the language models
jest.mock('@ai-sdk/openai', () => ({
  openai: jest.fn()
}));

jest.mock('@ai-sdk/anthropic', () => ({
  anthropic: jest.fn()
}));

jest.mock('@ai-sdk/google', () => ({
  google: jest.fn()
}));

// Mock the KV store
jest.mock('@vercel/kv', () => ({
  kv: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(null)
  }
}));

// Mock the cookies
jest.mock('next/headers', () => ({
  cookies: () => ({
    get: jest.fn().mockReturnValue({ value: JSON.stringify({ provider: 'openai', model: 'gpt-3.5-turbo' }) })
  })
}));

// Mock the AI debug functions
jest.mock('../../lib/ai-debug', () => ({
  formatDebugPrompt: jest.fn().mockReturnValue('debug prompt'),
  logAIDebug: jest.fn()
}));

describe('LLM Service - Streaming', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set environment variables for testing
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-google-key';
  });
  
  it('should handle streaming responses', async () => {
    // Mock the streamText function to return a readable stream
    const { streamText } = require('ai');
    
    // Call the function with streaming enabled
    const response = await generateChatResponse({
      messages: [{ role: 'user', content: 'Hello' }],
      stream: true
    });
    
    // Verify the streamText function was called
    expect(streamText).toHaveBeenCalled();
    
    // Verify the response contains the expected properties
    expect(response).toHaveProperty('message');
    expect(response).toHaveProperty('model');
    expect(response).toHaveProperty('provider');
  });
  
  it('should include context documents in the prompt when provided', async () => {
    // Mock the streamText function
    const { streamText } = require('ai');
    streamText.mockResolvedValue({
      text: 'Response with context',
      model: 'gpt-3.5-turbo',
      provider: 'openai'
    });
    
    // Call the function with context documents
    await generateChatResponse({
      messages: [{ role: 'user', content: 'Summarize the document' }],
      contextDocuments: [
        { title: 'Test Document', content: 'This is a test document content.' }
      ]
    });
    
    // Verify that the context was included in the prompt
    const callArgs = streamText.mock.calls[0][0];
    expect(callArgs.messages.some(msg => 
      msg.content && msg.content.includes('Test Document') && 
      msg.content.includes('This is a test document content.')
    )).toBe(true);
  });
  
  it('should use the specified model and provider', async () => {
    // Mock the cookies to return a different provider
    require('next/headers').cookies = () => ({
      get: jest.fn().mockReturnValue({ 
        value: JSON.stringify({ 
          provider: 'anthropic', 
          model: 'claude-2' 
        }) 
      })
    });
    
    // Mock the streamText function
    const { streamText } = require('ai');
    streamText.mockResolvedValue({
      text: 'Response from Anthropic',
      model: 'claude-2',
      provider: 'anthropic'
    });
    
    // Call the function
    const response = await generateChatResponse({
      messages: [{ role: 'user', content: 'Hello' }]
    });
    
    // Verify the correct model and provider were used
    expect(response.provider).toBe('anthropic');
    expect(response.model).toBe('claude-2');
  });
  
  it('should handle errors gracefully', async () => {
    // Mock the streamText function to throw an error
    const { streamText } = require('ai');
    streamText.mockRejectedValue(new Error('API Error'));
    
    // Call the function and expect it to throw
    await expect(generateChatResponse({
      messages: [{ role: 'user', content: 'Hello' }]
    })).rejects.toThrow();
  });
  
  it('should include debug information when enabled', async () => {
    // Mock the streamText function
    const { streamText } = require('ai');
    streamText.mockResolvedValue({
      text: 'Response with debug',
      model: 'gpt-3.5-turbo',
      provider: 'openai'
    });
    
    // Enable debug mode through environment
    process.env.AI_DEBUG = 'true';
    
    // Call the function
    const response = await generateChatResponse({
      messages: [{ role: 'user', content: 'Hello' }]
    });
    
    // Verify debug information was included
    expect(response.debugPrompt).toBeDefined();
    
    // Reset debug mode
    delete process.env.AI_DEBUG;
  });
});
