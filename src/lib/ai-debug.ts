import { kv } from '@/lib/kv-provider';

/**
 * Formats a prompt for debugging display
 */
export function formatDebugPrompt(
  systemMessage: string,
  userPrompt: string,
  provider: string,
  model: string
): string {
  return `Provider: ${provider}
Model: ${model}

System Message:
${systemMessage}

User Prompt:
${userPrompt}`;
}

/**
 * Retrieves debug information for a session
 */
export async function getSessionDebugInfo(sessionId: string) {
  if (!sessionId) return null;
  
  // Get all debug entries for this session
  const keys = await kv.keys(`ai-debug:${sessionId}:*`);
  
  if (!keys || keys.length === 0) return null;
  
  // Sort keys by timestamp (newest first)
  keys.sort().reverse();
  
  // Get the most recent debug entry
  const latestKey = keys[0];
  const debugInfo = await kv.get(latestKey);
  
  return debugInfo;
}

/**
 * Logs debug information about an AI request
 */
export async function logAIDebug(
  sessionId: string,
  data: {
    provider: string;
    model: string;
    systemMessage: string;
    userPrompt: string;
    [key: string]: any;
  }
) {
  if (!sessionId) return;
  
  const timestamp = Date.now();
  const debugKey = `ai-debug:${sessionId}:${timestamp}`;
  
  await kv.set(debugKey, {
    timestamp: new Date().toISOString(),
    ...data
  }, { ex: 60 * 60 * 24 }); // Keep debug info for 24 hours
  
  return debugKey;
} 