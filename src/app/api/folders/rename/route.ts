import { NextRequest, NextResponse } from 'next/server';
import { renameFolder } from '@/lib/fs-service';

// POST /api/folders/rename - Rename a folder
export async function POST(request: NextRequest) {
  try {
    const { id, newName } = await request.json();
    
    if (!id || !newName) {
      return NextResponse.json({ error: 'Folder ID and new name are required' }, { status: 400 });
    }
    
    const folder = renameFolder(id, newName);
    
    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }
    
    return NextResponse.json(folder);
  } catch (error) {
    console.error('Error renaming folder:', error);
    return NextResponse.json({ error: 'Failed to rename folder' }, { status: 500 });
  }
} 