import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@/lib/kv-provider';
import { generateText, streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { wrapLanguageModel } from 'ai';
import { useLLMStore } from '@/lib/store';
import { createCacheMiddleware } from '@/lib/ai-middleware';
import { formatDebugPrompt, logAIDebug } from '@/lib/ai-debug';
import { getAIRoleSystemPrompt } from '@/lib/ai-roles';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// Set the runtime to Node.js to ensure compatibility with all features
export const runtime = 'nodejs';

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
    const enableCache = llmConfig.enableCache;
    const temperature = llmConfig.temperature;
    const maxTokens = llmConfig.maxTokens;
    const aiRole = llmConfig.aiRole || 'assistant';
    const apiKey = useLLMStore.getState().getApiKey();

    if (!apiKey) {
      return NextResponse.json(
        { error: 'No API key found. Please set an API key in the settings.' },
        { status: 401 }
      );
    }

    // Get the system message for the selected AI role from the new API
    let systemMessage = await getAIRoleSystemPrompt(aiRole);
    
    if (context) {
      systemMessage += ` Use the following context to inform your responses: ${context}`;
    }
    
    // Safely handle contextDocuments
    const safeContextDocuments = Array.isArray(contextDocuments) ? contextDocuments : [];
    
    if (safeContextDocuments.length > 0) {
      systemMessage += ' Use the following additional context documents to inform your responses:\n\n';
      safeContextDocuments.forEach((doc: { title: string; content: string }) => {
        if (doc && doc.title && doc.content) {
          systemMessage += `Document: ${doc.title}\n${doc.content}\n\n`;
        }
      });
    }

    // Get the last user message
    const lastMessage = messages[messages.length - 1];
    const userPrompt = lastMessage.content;
    
    // Only check cache if caching is enabled
    let cached = null;
    if (enableCache) {
      // Create a cache key based on the request
      const cacheKey = `ai-response:${JSON.stringify({ 
        provider: selectedProvider, 
        model: selectedModel, 
        prompt: userPrompt,
        system: systemMessage 
      })}`;
      
      // Check if we have a cached response
      cached = await kv.get(cacheKey);
    }
    
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

    // Clear all API keys from environment to prevent using the wrong provider
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    
    // Set up provider-specific model
    let baseModel;
    
    console.log(`Using provider: ${selectedProvider}, model: ${selectedModel}`);
    
    try {
      switch (selectedProvider) {
        case 'anthropic':
          // Set the Anthropic API key in the environment
          process.env.ANTHROPIC_API_KEY = apiKey;
          
          // Log the model name for debugging (without showing the full API key)
          console.log(`Anthropic model name: ${selectedModel}`);
          console.log(`API key format check: ${apiKey ? `${apiKey.substring(0, 10)}...` : 'No API key'}`);
          
          // Try to initialize with a more standard model name if needed
          try {
            // First try with the exact model name
            baseModel = anthropic(selectedModel as any);
            console.log('Successfully initialized Anthropic model with exact model name');
          } catch (anthropicError) {
            console.error('Error initializing Anthropic with exact model name:', anthropicError);
            
            // If that fails, try with a simplified model name (without the version suffix)
            const simplifiedModel = selectedModel.split('@')[0];
            if (simplifiedModel !== selectedModel) {
              console.log(`Trying with simplified model name: ${simplifiedModel}`);
              try {
                baseModel = anthropic(simplifiedModel as any);
                console.log('Successfully initialized Anthropic model with simplified model name');
              } catch (simplifiedError) {
                console.error('Error initializing Anthropic with simplified model name:', simplifiedError);
                throw new Error(`Failed to initialize Anthropic model: ${simplifiedError instanceof Error ? simplifiedError.message : String(simplifiedError)}`);
              }
            } else {
              throw anthropicError;
            }
          }
          break;
        case 'gemini':
          // Explicitly set the API key for Google Gemini
          process.env.GOOGLE_GENERATIVE_AI_API_KEY = apiKey;
          baseModel = google(selectedModel as any);
          console.log('Initialized Google model with API key');
          break;
        case 'openai':
        default:
          // Set the OpenAI API key in the environment
          process.env.OPENAI_API_KEY = apiKey;
          baseModel = openai(selectedModel as any);
          console.log('Initialized OpenAI model with API key');
          break;
      }
    } catch (modelError) {
      console.error(`Error initializing model for provider ${selectedProvider}:`, modelError);
      throw new Error(`Failed to initialize ${selectedProvider} model: ${modelError instanceof Error ? modelError.message : String(modelError)}`);
    }
    
    // Apply middleware conditionally based on enableCache setting
    const model = enableCache 
      ? wrapLanguageModel({
          model: baseModel,
          middleware: createCacheMiddleware(true)
        })
      : baseModel;
    
    // Stream the response
    const result = await streamText({
      model,
      system: systemMessage,
      prompt: userPrompt,
      temperature: temperature,
      maxTokens: maxTokens,
      async onFinish({ text }) {
        // Only cache if caching is enabled
        if (enableCache) {
          // Create a cache key based on the request
          const cacheKey = `ai-response:${JSON.stringify({ 
            provider: selectedProvider, 
            model: selectedModel, 
            prompt: userPrompt,
            system: systemMessage 
          })}`;
          
          // Cache the response for 1 hour
          await kv.set(cacheKey, text, { ex: 60 * 60 });
        }
        
        // Update session in KV database
        const sessionKey = `ai-session:${sessionId}`;
        const sessionData = await kv.get(sessionKey) as AISession | null;
        
        // Initialize session if it doesn't exist
        const session: AISession = sessionData || {
          messages: [],
          contextDocuments: [],
          createdAt: new Date().toISOString()
        };
        
        // Ensure messages array exists
        if (!session.messages) {
          session.messages = [];
        }
        
        // Add the new messages to the session
        session.messages.push(
          { role: 'user', content: userPrompt },
          { role: 'assistant', content: text }
        );
        
        // Update context documents if provided
        if (safeContextDocuments.length > 0) {
          session.contextDocuments = safeContextDocuments;
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
          contextDocumentsCount: safeContextDocuments.length,
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
    
    // Log more detailed error information
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      // Check for specific error types
      if (error.message.includes('authentication')) {
        return NextResponse.json(
          { error: 'Authentication error. Please check your API key in the settings.' },
          { status: 401 }
        );
      } else if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      } else if (error.message.includes('model')) {
        return NextResponse.json(
          { error: 'Model error. The selected model may not be available or supported.' },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { error: `An error occurred while processing your request: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}