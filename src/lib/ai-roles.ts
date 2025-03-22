// Define the types for AI roles
export type AIRole = string; // Updated to support any role name as a string

export interface AIRoleInfo {
  role: AIRole;
  prompt: string;
}

// Default prompts as fallback
export const DEFAULT_PROMPTS: Record<string, string> = {
  'assistant': 'You are a helpful writing assistant. I will provide suggestions only when asked.',
  'co-creator': 'You are an active writing partner. I will collaborate with you, suggesting ideas and content as we work together.',
  'validator': 'You are a critical reviewer. I will analyze your writing for issues with structure, clarity, and style.',
  'autopilot': 'I will take the lead on generating complete content based on your parameters.'
};

export const DEFAULT_ROLES: AIRole[] = ['assistant', 'co-creator', 'validator', 'autopilot'];

// Helper function to get base URL
function getBaseUrl() {
  if (typeof window !== 'undefined') {
    // Client-side: use window.location
    return window.location.origin;
  } else {
    // Server-side: use environment variable or default to localhost
    return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  }
}

/**
 * Get available AI roles from the API
 * @returns Array of available AI roles
 */
export async function getAvailableAIRoles(): Promise<AIRole[]> {
  try {
    // Use full URL with base URL
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/api/ai-roles/available`);
    
    if (!response.ok) {
      console.warn('Failed to fetch available AI roles, using defaults');
      return DEFAULT_ROLES;
    }
    
    const data = await response.json();
    return data.roles as AIRole[];
  } catch (error) {
    console.error('Error fetching available AI roles:', error);
    return DEFAULT_ROLES;
  }
}

/**
 * Get system prompt for a specific AI role from the API
 * @param role The AI role to get prompt for
 * @returns The system prompt for the specified role
 */
export async function getAIRoleSystemPrompt(role: string = 'assistant'): Promise<string> {
  try {
    // Use full URL with base URL
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/api/ai-roles/prompt?role=${encodeURIComponent(role)}`);
    
    if (!response.ok) {
      console.warn(`Failed to fetch prompt for role "${role}", using default`);
      return DEFAULT_PROMPTS[role] || DEFAULT_PROMPTS.assistant;
    }
    
    const data = await response.json();
    return data.prompt;
  } catch (error) {
    console.error(`Error fetching prompt for role "${role}":`, error);
    return DEFAULT_PROMPTS[role] || DEFAULT_PROMPTS.assistant;
  }
}

/**
 * Get all AI roles with their prompts
 * @returns Array of AI roles with their prompts
 */
export async function getAllAIRoles(): Promise<AIRoleInfo[]> {
  try {
    // Use full URL with base URL
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/api/ai-roles/all`);
    
    if (!response.ok) {
      console.warn('Failed to fetch all AI roles and prompts, building from defaults');
      return DEFAULT_ROLES.map(role => ({
        role,
        prompt: DEFAULT_PROMPTS[role]
      }));
    }
    
    const data = await response.json();
    return data.roles as AIRoleInfo[];
  } catch (error) {
    console.error('Error fetching all AI roles:', error);
    // Return defaults if API call fails
    return DEFAULT_ROLES.map(role => ({
      role,
      prompt: DEFAULT_PROMPTS[role]
    }));
  }
} 