import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { openaiKey, googleKey, anthropicKey } = await req.json();
    
    // Create response object
    const response = NextResponse.json({ success: true });
    
    // Set cookies with HTTP-only flag for security
    if (openaiKey) {
      response.cookies.set('openai-api-key', openaiKey, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: '/',
      });
    }
    
    if (googleKey) {
      response.cookies.set('google-api-key', googleKey, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: '/',
      });
    }
    
    if (anthropicKey) {
      response.cookies.set('anthropic-api-key', anthropicKey, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: '/',
      });
    }
    
    return response;
  } catch (error) {
    console.error('Error setting API key cookies:', error);
    return NextResponse.json(
      { error: 'Failed to set API key cookies' },
      { status: 500 }
    );
  }
} 