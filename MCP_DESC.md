# How LLM Calls Use Tools and MCP Servers in this Writing App

## LLM Service Architecture

The application features a sophisticated `llm-service.ts` that provides three primary patterns for using LLMs:

### 1. Direct LLM Calls with Tools

The app supports function calling through OpenAI-compatible tools:

```typescript
// This is how a tool is defined
export interface Tool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}
```

Example usage is demonstrated in the `analyzeWritingStyle` function:

```typescript
export async function analyzeWritingStyle({ content, style = 'general' }) {
  const chatRequest: ChatRequestWithTools = {
    messages: [
      {
        role: 'user',
        content: `Analyze the following text...`,
      }
    ],
    tools: [
      {
        type: 'function',
        function: {
          name: 'provideStyleAnalysis',
          description: 'Provide detailed analysis of writing style',
          parameters: { /* schema definition */ }
        }
      }
    ],
    tool_choice: { type: 'function', function: { name: 'provideStyleAnalysis' } }
  };

  const response = await generateChatResponse(chatRequest);
  
  // Process tool call response
  if (response.message.tool_calls && response.message.tool_calls.length > 0) {
    const toolCall = response.message.tool_calls[0];
    if (toolCall.function.name === 'provideStyleAnalysis') {
      return JSON.parse(toolCall.function.arguments);
    }
  }
}
```

The app also has a helper function to execute tool calls from the AI:

```typescript
export async function executeToolCall(toolCall: ToolCall, availableTools: Record<string, Function>) {
  // Extract function name and arguments
  const { function: { name, arguments: argsString } } = toolCall;
  
  // Call the function
  const result = await availableTools[name](args);
  
  // Return result
}
```

### 2. MCP (Model Context Protocol) Server Integration

The app integrates MCP servers via the Vercel AI SDK:

```typescript
// MCP client initialization
let mcpClient: MCPClient | null = null;

if (MCP_API_KEY && MCP_PROJECT_ID) {
  experimental_createMCPClient({
    transport: {
      type: 'sse',
      url: `https://api.mcp.vercel.ai/api/v1/projects/${MCP_PROJECT_ID}/sse`,
      headers: { 'Authorization': `Bearer ${MCP_API_KEY}` }
    },
  }).then(client => {
    mcpClient = client;
  });
}
```

MCP operations are structured with steps:

```typescript
export interface MCPOperation {
  name: string;
  steps: MCPStep[];
  metadata?: Record<string, unknown>;
}

export async function executeMCPOperation(operation: MCPOperation) {
  // Get available tools from MCP client
  const tools = await mcpClient.tools();
  
  // Execute the operation with multiple steps
  const result = await mcpClient.executeOperation(operation);
  
  return result;
}
```

### 3. User Interface for Managing Tools and MCP Servers

The application has dedicated settings interfaces for both:

1. **MCP Settings Component (`mcp-settings.tsx`)**:
   - Lists available MCP servers like Brave Search, Sequential Thinking, GitHub
   - Allows installation/uninstallation of MCP servers
   - Configures API keys for each server
   - Provides links to documentation
   - Uses the format `https://smithery.ai/server/${server.provider}` for documentation links

2. **Tool Settings Component (`tool-settings.tsx`)**:
   - Manages AI tools like Smart Templates Generator, Narrative Structure Analyzer
   - Allows enabling/disabling of tools
   - Groups tools by categories (writing, analysis, enhancement)

## How It All Works Together

1. **Core LLM Functionality**:
   - The `generateChatResponse` function supports both regular chat and tool-enabled chat via the `ChatRequestWithTools` interface
   - It handles streaming/non-streaming responses from various providers (OpenAI, Anthropic, Gemini)

2. **Tool Execution Flow**:
   - Define tools with function schemas
   - Pass tools to LLM with requests
   - Process tool calls in responses
   - Execute functions with the provided arguments
   - Return results to the application

3. **MCP Server Integration**:
   - Install servers via the UI
   - Configure with API keys
   - Create multi-step operations
   - Execute operations via the MCP client

This architecture enables sophisticated AI features like writing style analysis, narrative structure analysis, and custom template generation, all managed through a clean UI that allows users to control which tools and servers are enabled.
