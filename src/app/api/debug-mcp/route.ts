import { NextResponse } from 'next/server';
import { 
  debugMCPServersFile, 
  loadMCPServersFromFile 
} from '@/lib/mcp-server-files';
import { getInstalledServers } from '@/lib/smithery-service';

export async function GET() {
  try {
    // Debug the MCP servers file
    await debugMCPServersFile();
    
    // Test loading servers from file
    const fileServers = await loadMCPServersFromFile();
    
    // Test getting installed servers
    const installedServers = await getInstalledServers();
    
    return NextResponse.json({
      success: true,
      fileServers,
      installedServers
    });
  } catch (error) {
    console.error('Error in debug MCP endpoint:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 