import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // Get environment variables
  const openaiKey = process.env.OPENAI_API_KEY || '';
  const anthropicKey = process.env.ANTHROPIC_API_KEY || '';
  const googleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';
  
  // Create a safe version of the keys (first 5 chars and last 4 chars)
  const safeOpenaiKey = openaiKey ? `${openaiKey.substring(0, 5)}...${openaiKey.substring(openaiKey.length - 4)}` : 'Not set';
  const safeAnthropicKey = anthropicKey ? `${anthropicKey.substring(0, 5)}...${anthropicKey.substring(anthropicKey.length - 4)}` : 'Not set';
  const safeGoogleKey = googleKey ? `${googleKey.substring(0, 5)}...${googleKey.substring(googleKey.length - 4)}` : 'Not set';
  
  // Return the environment variables
  return NextResponse.json({
    openaiKey: safeOpenaiKey,
    anthropicKey: safeAnthropicKey,
    googleKey: safeGoogleKey,
    defaultProvider: process.env.DEFAULT_LLM_PROVIDER,
    defaultModel: process.env.DEFAULT_LLM_MODEL,
    enableCache: process.env.ENABLE_AI_CACHE,
  });
} 