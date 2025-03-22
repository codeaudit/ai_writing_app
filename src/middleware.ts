import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@/lib/kv-provider';
import { config } from './middleware.config';

// This middleware handles AI session management using Vercel KV
export async function middleware(req: NextRequest) {
  // Skip middleware processing for API routes that don't need session management
  const url = req.nextUrl.pathname;
  
  // For AI roles API routes, we don't need session management
  if (url.startsWith('/api/ai-roles')) {
    return NextResponse.next();
  }
  
  // Get or create session ID from cookies
  const sessionId = req.cookies.get('ai-session-id')?.value || generateSessionId();
  
  // Create response object
  const response = NextResponse.next();
  
  // Set session ID cookie if it doesn't exist
  if (!req.cookies.get('ai-session-id')) {
    response.cookies.set('ai-session-id', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    });
    
    // Initialize session state in KV database
    await kv.set(`ai-session:${sessionId}`, { 
      createdAt: new Date().toISOString(),
      messages: [],
      contextDocuments: []
    });
  }
  
  // Add session ID to request headers for use in API routes
  response.headers.set('x-ai-session-id', sessionId);
  
  return response;
}

// Generate a random session ID
function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Export the config from middleware.config.ts
export { config }; 