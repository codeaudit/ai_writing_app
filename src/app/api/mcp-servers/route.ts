import { NextResponse } from 'next/server';
import { getEnabledMCPServers } from '@/lib/mcp-server-manager';

export async function GET() {
  try {
    // Get the list of enabled MCP servers
    const servers = await getEnabledMCPServers();
    
    // Return the servers as JSON
    return NextResponse.json({ 
      success: true, 
      servers,
      count: servers.length
    });
  } catch (error) {
    console.error('Error fetching MCP servers:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        servers: []
      },
      { status: 500 }
    );
  }
} 