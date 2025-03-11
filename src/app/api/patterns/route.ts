import { NextRequest, NextResponse } from 'next/server';
import { loadPatterns, savePattern, deletePattern } from '@/lib/pattern-fs-service';
import { Pattern } from '@/lib/pattern-store';

// GET /api/patterns - Get all patterns
export async function GET() {
  try {
    const patterns = loadPatterns();
    return NextResponse.json(patterns);
  } catch (error) {
    console.error('Error loading patterns:', error);
    return NextResponse.json({ error: 'Failed to load patterns' }, { status: 500 });
  }
}

// POST /api/patterns - Create or update a pattern
export async function POST(request: NextRequest) {
  try {
    const pattern = await request.json() as Pattern;
    
    if (!pattern || !pattern.id || !pattern.name) {
      return NextResponse.json({ error: 'Invalid pattern data' }, { status: 400 });
    }
    
    // Fix dates that might have been serialized as strings
    if (typeof pattern.createdAt === 'string') {
      pattern.createdAt = new Date(pattern.createdAt);
    }
    if (typeof pattern.updatedAt === 'string') {
      pattern.updatedAt = new Date(pattern.updatedAt);
    }
    if (pattern.versions) {
      pattern.versions = pattern.versions.map(ver => ({
        ...ver,
        createdAt: typeof ver.createdAt === 'string' ? new Date(ver.createdAt) : ver.createdAt
      }));
    }
    
    const savedPattern = savePattern(pattern);
    return NextResponse.json(savedPattern);
  } catch (error) {
    console.error('Error saving pattern:', error);
    return NextResponse.json({ error: 'Failed to save pattern' }, { status: 500 });
  }
}

// DELETE /api/patterns/:id - Delete a pattern
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Pattern ID is required' }, { status: 400 });
    }
    
    deletePattern(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting pattern:', error);
    return NextResponse.json({ error: 'Failed to delete pattern' }, { status: 500 });
  }
} 