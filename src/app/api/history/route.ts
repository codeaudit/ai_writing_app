import { NextResponse } from 'next/server';
import { readHistory, getUserMessages } from '@/lib/history-service';

// GET endpoint to retrieve history content
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format');
    
    if (format === 'messages') {
      // Return just the messages in a structured format
      const messages = await getUserMessages();
      return NextResponse.json({ messages });
    } else {
      // Return the full markdown content
      const content = await readHistory();
      return NextResponse.json({ content });
    }
  } catch (error) {
    console.error('Error reading history:', error);
    return NextResponse.json(
      { error: 'Failed to read history file' },
      { status: 500 }
    );
  }
} 