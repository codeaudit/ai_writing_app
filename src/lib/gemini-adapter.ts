import { MultiClient } from "@smithery/sdk/index.js";
import { logger } from './logger';

/**
 * Type definition for function call arguments (matches Gemini API)
 * Follows Gemini's function calling schema where each call has:
 * - name: The name of the function to call
 * - args: An object containing the parameters to pass to the function
 */
interface FunctionCall {
  name: string;
  args: Record<string, unknown>;
}

/**
 * Response with function calls similar to what Gemini returns
 * Supports multiple possible response formats from Gemini API:
 * 1. Direct functionCalls at the top level
 * 2. FunctionCalls nested within candidates[].content
 * 3. Text responses without function calls
 */
interface GeminiStyleResponseWithFunctionCalls {
  functionCalls?: FunctionCall[];
  text?: string;
  candidates?: Array<{
    content: {
      parts: Array<{text: string}>;
      functionCalls?: FunctionCall[];
    }
  }>;
}

/**
 * MCP client types
 * Defines the structure for the Model Context Protocol client
 * which allows communication with external tools
 */
interface MCPClient {
  clients: {
    mcp: {
      // Define the request method with proper typing
      request: (params: { method: string; params: Record<string, unknown> }) => Promise<Record<string, unknown>>;
    };
  };
}

/**
 * A chat adapter for Gemini AI that can be used with the Smithery SDK
 * 
 * This adapter implements the function calling conventions specified by Google's Gemini API:
 * - Supports tool declarations through the MCP protocol
 * - Extracts function calls from Gemini's response format
 * - Executes functions and formats results for further interaction
 * - Maintains compatibility with both Gemini-native and OpenAI-style function call formats
 */
export class GeminiAIChatAdapter {
  private client: MultiClient;

  /**
   * Creates a new instance of the GeminiAIChatAdapter
   * @param client - The MultiClient instance to use for making requests
   */
  constructor(client: MultiClient) {
    this.client = client;
    logger.debug('GeminiAIChatAdapter initialized');
  }

  /**
   * List tools available from the MCP client
   * 
   * This method retrieves the available tools that can be called by Gemini
   * and formats them in a way the model can understand what functions are available
   * 
   * @returns Array of available tools with their schemas
   */
  async listTools() {
    try {
      // This uses the MCP client to list available tools
      const typedClient = this.client as unknown as MCPClient;
      const response = await typedClient.clients.mcp.request({
        method: 'listTools',
        params: {}
      });
      
      return response?.tools || [];
    } catch (error) {
      logger.error('Error listing tools in GeminiAIChatAdapter:', error);
      return [];
    }
  }
  
  /**
   * Execute a tool call using the MCP client
   * 
   * This method handles:
   * 1. Extracting function calls from Gemini's response in multiple possible formats
   * 2. Processing the function calls through the MCP client
   * 3. Formatting the results for subsequent interactions
   * 4. Error handling for failed function calls
   * 
   * @param response - The response from Gemini containing function calls
   * @returns Array of formatted tool results for the next iteration
   */
  async callTool(response: GeminiStyleResponseWithFunctionCalls) {
    try {
      // Extract function calls from a Gemini-style response
      const functionCalls: FunctionCall[] = [];
      
      // Try to get function calls from different possible response formats
      if (response.functionCalls) {
        // Format 1: Direct functionCalls array at the top level (primary Gemini format)
        functionCalls.push(...response.functionCalls);
      } else if (response.candidates && response.candidates[0]?.content?.functionCalls) {
        // Format 2: FunctionCalls nested within candidates[].content (alternate Gemini format)
        functionCalls.push(...response.candidates[0].content.functionCalls);
      } else {
        // Format 3: Check for OpenAI-style response format (needed for compatibility)
        // OpenAI uses a different structure with tool_calls instead of functionCalls
        const openAIStyleResponse = response as unknown as {
          choices?: Array<{
            message: {
              tool_calls?: Array<{
                id: string;
                function: {
                  name: string;
                  arguments: string;
                }
              }>
            }
          }>;
        };
        
        if (openAIStyleResponse.choices?.[0]?.message?.tool_calls) {
          // Convert from OpenAI format to Gemini format
          // OpenAI provides arguments as a JSON string, while Gemini uses a direct object
          const toolCalls = openAIStyleResponse.choices[0].message.tool_calls;
          functionCalls.push(...toolCalls.map(tc => ({
            name: tc.function.name,
            args: JSON.parse(tc.function.arguments)
          })));
        }
      }
      
      if (functionCalls.length === 0) {
        logger.warn('No function calls found in Gemini response');
        return [];
      }
      
      // Process all function calls and get the results
      logger.debug(`Processing ${functionCalls.length} function calls from Gemini`);
      const typedClient = this.client as unknown as MCPClient;
      
      // Execute each function call in parallel using Promise.all
      // This supports Gemini's parallel function calling feature
      const toolResults = await Promise.all(
        functionCalls.map(async (funcCall, index) => {
          try {
            // Call the MCP client with the function name and arguments
            // This executes the actual function through the MCP protocol
            const result = await typedClient.clients.mcp.request({
              method: funcCall.name,
              params: funcCall.args
            });
            
            // Format the tool response for the next iteration
            // This follows the format expected by both Gemini and OpenAI
            const toolCallId = `call-${Date.now()}-${index}`;
            return {
              role: 'function',
              content: JSON.stringify(result),
              name: funcCall.name,
              id: toolCallId,
              // Include tool_call_id for OpenAI compatibility mode
              tool_call_id: toolCallId
            };
          } catch (error) {
            // Handle errors during function execution
            // We return a formatted error response rather than throwing
            logger.error(`Error executing ${funcCall.name}:`, error);
            return {
              role: 'function',
              content: JSON.stringify({ error: `Failed to execute function ${funcCall.name}: ${error}` }),
              name: funcCall.name,
              id: `error-${Date.now()}-${index}`,
              // Include tool_call_id for OpenAI compatibility mode
              tool_call_id: `error-${Date.now()}-${index}`
            };
          }
        })
      );
      
      logger.debug(`Successfully processed ${toolResults.length} function calls`);
      return toolResults;
    } catch (error) {
      // Handle errors in the overall function call processing
      logger.error('Error in GeminiAIChatAdapter.callTool:', error);
      return [];
    }
  }
}

// Export as default as well
export default GeminiAIChatAdapter; 