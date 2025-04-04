import { NextRequest, NextResponse } from 'next/server';
import { copyFolder } from '@/lib/fs-service';

// POST /api/folders/copy - Copy a folder and all its contents
export async function POST(request: NextRequest) {
  try {
    const { sourceId, targetParentId, newName } = await request.json();
    
    if (!sourceId) {
      return NextResponse.json({ error: 'Source folder ID is required' }, { status: 400 });
    }
    
    // Call the fs-service copyFolder function
    const result = copyFolder(sourceId, targetParentId, newName);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    
    return NextResponse.json({ 
      success: true, 
      newFolderId: result.newFolderId 
    });
  } catch (error) {
    console.error('Error copying folder:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to copy folder' 
    }, { status: 500 });
  }
} 