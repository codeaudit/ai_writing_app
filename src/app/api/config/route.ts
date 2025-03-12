import { NextResponse } from 'next/server';
import { 
  DEFAULT_LLM_PROVIDER, 
  DEFAULT_LLM_MODEL, 
  LLM_PROVIDERS, 
  LLM_MODELS 
} from '@/lib/config';

export async function GET() {
  return NextResponse.json({
    defaultProvider: DEFAULT_LLM_PROVIDER,
    defaultModel: DEFAULT_LLM_MODEL,
    providers: LLM_PROVIDERS,
    models: LLM_MODELS,
  });
} 