import { NextRequest, NextResponse } from 'next/server';
import { moveFolder } from '@/lib/fs-service';

// POST /api/folders/move - Move a folder to a different parent folder
export async function POST(request: NextRequest) {
  try {
    const { id, targetParentId } = await request.json();
    
    if (!id) {
      return NextResponse.json({ error: 'Folder ID is required' }, { status: 400 });
    }
    
    // targetParentId can be null (to move to root)
    const folder = moveFolder(id, targetParentId);
    
    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }
    
    return NextResponse.json(folder);
  } catch (error) {
    console.error('Error moving folder:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to move folder' 
    }, { status: 500 });
  }
} 