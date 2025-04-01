import { NextRequest, NextResponse } from 'next/server';
import { 
  saveMCPServer, 
  loadMCPServersFromFile, 
  removeMCPServer,
  updateMCPServerEnabledStatus
} from '@/lib/mcp-server-files';
import { ServerConfig, SmitheryServerDetail } from '@/lib/smithery-service';

// GET handler - retrieve all installed servers
export async function GET() {
  try {
    const servers = await loadMCPServersFromFile();
    return NextResponse.json({ servers }, { status: 200 });
  } catch (error) {
    console.error('Error loading MCP servers:', error);
    return NextResponse.json(
      { error: 'Failed to load MCP servers' }, 
      { status: 500 }
    );
  }
}

// POST handler - install a new server
export async function POST(request: NextRequest) {
  console.log("=== API: Installing server ===");
  try {
    const body = await request.json();
    const { 
      qualifiedName, 
      config,
      enabled = true,
      name,
      url,
      serverDetails
    } = body;
    
    console.log("Request body:", JSON.stringify({
      qualifiedName,
      config,
      enabled,
      name, 
      url,
      hasServerDetails: !!serverDetails
    }));
    
    if (!qualifiedName) {
      console.error("Missing qualifiedName in request");
      return NextResponse.json(
        { error: 'Server qualifiedName is required' }, 
        { status: 400 }
      );
    }

    console.log(`Saving server ${qualifiedName} to file storage`);
    
    // Save the server
    try {
      const success = await saveMCPServer(
        qualifiedName, 
        config as ServerConfig, 
        enabled, 
        name, 
        url, 
        serverDetails as SmitheryServerDetail
      );
      
      if (success) {
        console.log(`Successfully saved server ${qualifiedName}`);
        return NextResponse.json(
          { success: true, message: `Server ${qualifiedName} installed successfully` }, 
          { status: 200 }
        );
      } else {
        console.error(`Failed to save server ${qualifiedName}`);
        return NextResponse.json(
          { error: 'Failed to install server' }, 
          { status: 500 }
        );
      }
    } catch (saveError) {
      console.error(`Error saving server ${qualifiedName}:`, saveError);
      return NextResponse.json(
        { error: `Failed to install server: ${saveError instanceof Error ? saveError.message : 'Unknown error'}` }, 
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error installing MCP server:', error);
    return NextResponse.json(
      { error: `Failed to install server: ${error instanceof Error ? error.message : 'Unknown error'}` }, 
      { status: 500 }
    );
  }
}

// DELETE handler - uninstall a server
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const qualifiedName = searchParams.get('qualifiedName');
    
    if (!qualifiedName) {
      return NextResponse.json(
        { error: 'Server qualifiedName is required' }, 
        { status: 400 }
      );
    }

    // Remove the server
    const success = await removeMCPServer(qualifiedName);
    
    if (success) {
      return NextResponse.json(
        { success: true, message: `Server ${qualifiedName} uninstalled successfully` }, 
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { error: 'Failed to uninstall server' }, 
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error uninstalling MCP server:', error);
    return NextResponse.json(
      { error: 'Failed to uninstall server' }, 
      { status: 500 }
    );
  }
}

// PATCH handler - update server enabled status
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { qualifiedName, enabled } = body;
    
    if (!qualifiedName || enabled === undefined) {
      return NextResponse.json(
        { error: 'Server qualifiedName and enabled status are required' }, 
        { status: 400 }
      );
    }

    // Update the server's enabled status
    const success = await updateMCPServerEnabledStatus(qualifiedName, enabled);
    
    if (success) {
      return NextResponse.json(
        { success: true, message: `Server ${qualifiedName} status updated successfully` }, 
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { error: 'Failed to update server status' }, 
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error updating MCP server status:', error);
    return NextResponse.json(
      { error: 'Failed to update server status' }, 
      { status: 500 }
    );
  }
} 