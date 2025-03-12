import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@/lib/kv-provider';
import { generateText, streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { wrapLanguageModel } from 'ai';
import { useLLMStore } from '@/lib/store';
import { cacheMiddleware } from '@/lib/ai-middleware';
import { formatDebugPrompt, logAIDebug } from '@/lib/ai-debug';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// Define session types
interface AISessionMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ContextDocument {
  title: string;
  content: string;
}

interface AISession {
  messages: AISessionMessage[];
  contextDocuments: ContextDocument[];
  createdAt: string;
}

export async function POST(req: NextRequest) {
  try {
    const { messages, context, contextDocuments } = await req.json();
    
    // Get session ID from middleware
    const sessionId = req.headers.get('x-ai-session-id');
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'No session ID found. Please refresh the page and try again.' },
        { status: 401 }
      );
    }
    
    // Get LLM configuration from store
    const llmConfig = useLLMStore.getState().config;
    const selectedProvider = llmConfig.provider || 'openai';
    const selectedModel = llmConfig.model || 'gpt-4o';
    const apiKey = useLLMStore.getState().getApiKey();

    if (!apiKey) {
      return NextResponse.json(
        { error: 'No API key found. Please set an API key in the settings.' },
        { status: 401 }
      );
    }

    // Create a system message with context if provided
    let systemMessage = 'You are a helpful writing assistant.';
    
    if (context) {
      systemMessage += ` Use the following context to inform your responses: ${context}`;
    }
    
    if (contextDocuments && contextDocuments.length > 0) {
      systemMessage += ' Use the following additional context documents to inform your responses:\n\n';
      contextDocuments.forEach((doc: { title: string; content: string }) => {
        systemMessage += `Document: ${doc.title}\n${doc.content}\n\n`;
      });
    }

    // Get the last user message
    const lastMessage = messages[messages.length - 1];
    const userPrompt = lastMessage.content;
    
    // Create a cache key based on the request
    const cacheKey = `ai-response:${JSON.stringify({ 
      provider: selectedProvider, 
      model: selectedModel, 
      prompt: userPrompt,
      system: systemMessage 
    })}`;
    
    // Check if we have a cached response
    const cached = await kv.get(cacheKey);
    
    if (cached) {
      return NextResponse.json({
        choices: [
          {
            message: {
              role: 'assistant',
              content: cached,
            },
            finish_reason: 'stop',
          },
        ],
      });
    }

    // Set up provider-specific model
    let baseModel;
    
    switch (selectedProvider) {
      case 'anthropic':
        baseModel = anthropic(selectedModel as any);
        break;
      case 'gemini':
        // Explicitly set the API key for Google Gemini
        process.env.GOOGLE_GENERATIVE_AI_API_KEY = apiKey;
        baseModel = google(selectedModel as any);
        break;
      case 'openai':
      default:
        baseModel = openai(selectedModel as any);
        break;
    }
    
    // Apply middleware
    const model = wrapLanguageModel({
      model: baseModel,
      middleware: cacheMiddleware
    });
    
    // Stream the response
    const result = await streamText({
      model,
      system: systemMessage,
      prompt: userPrompt,
      temperature: 0.7,
      maxTokens: 1000,
      async onFinish({ text }) {
        // Cache the response for 1 hour
        await kv.set(cacheKey, text, { ex: 60 * 60 });
        
        // Update session in KV database
        const sessionKey = `ai-session:${sessionId}`;
        const sessionData = await kv.get(sessionKey) as AISession | null;
        
        // Initialize session if it doesn't exist
        const session: AISession = sessionData || {
          messages: [],
          contextDocuments: [],
          createdAt: new Date().toISOString()
        };
        
        // Add the new messages to the session
        session.messages.push(
          { role: 'user', content: userPrompt },
          { role: 'assistant', content: text }
        );
        
        // Update context documents if provided
        if (contextDocuments) {
          session.contextDocuments = contextDocuments;
        }
        
        // Save the updated session
        await kv.set(sessionKey, session);
        
        // Log debug information
        await logAIDebug(sessionId, {
          provider: selectedProvider,
          model: selectedModel,
          systemMessage,
          userPrompt,
          responseLength: text.length,
          responsePreview: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
          contextDocumentsCount: contextDocuments?.length || 0,
        });
      }
    });

    // Add debug headers to the response
    const response = result.toDataStreamResponse();
    response.headers.set('x-ai-provider', selectedProvider);
    response.headers.set('x-ai-model', selectedModel);
    
    // Return the streaming response
    return response;
    
  } catch (error) {
    console.error('Error in AI route:', error);
    return NextResponse.json(
      { error: 'An error occurred while processing your request' },
      { status: 500 }
    );
  }
} 