'use server'

import { generateChatResponse, ChatMessage } from "@/lib/llm-service";

/**
 * Interface for template data
 */
export interface PromptTemplate {
  id: string;
  name: string;
  content: string;
  category: string;
  createdAt: Date;
  updatedAt: Date;
}

// Define window.electron for TypeScript
declare global {
  interface Window {
    electron?: {
      saveTemplate: (template: { name: string; content: string; category: string }) => Promise<void>;
      getTemplates: () => Promise<Array<{
        name: string;
        path?: string;
        category?: string;
        createdAt?: string;
        updatedAt?: string;
      }>>;
      processTemplate?: (params: { path: string; variables: Record<string, string> }) => Promise<string>;
      getTemplateContent?: (path: string) => Promise<string>;
    };
  }
}

/**
 * Simple check if we're in an Electron environment
 */
function isElectron(): boolean {
  return typeof window !== 'undefined' && 
         !!window.electron;
}

/**
 * Function to enhance a prompt using the LLM
 * @param prompt The original prompt to enhance
 * @param activeThreadMessages Optional array of previous messages for context
 * @returns The enhanced prompt
 */
export async function enhancePrompt(
  prompt: string, 
  activeThreadMessages: ChatMessage[] = []
): Promise<string> {
  try {
    // Create system message with clear instructions
    const systemMessage: ChatMessage = {
      role: 'system',
      content: `You are an expert at improving and enhancing writing prompts. 
      Your task is to take a user's prompt and make it more effective, clear, and likely to produce better results.
      
      Analyze the prompt for clarity, specificity, and structure.
      Improve the prompt by:
      1. Adding more specific details and parameters
      2. Clarifying any ambiguous instructions
      3. Structuring the prompt for better organization
      4. Adding relevant context if missing
      
      IMPORTANT FORMATTING INSTRUCTIONS:
      - Output ONLY the improved prompt text
      - Do not include explanations, reasoning, or introductions
      - Do not use phrases like "Here's an enhanced prompt:" or "Improved prompt:"
      - Do not include any text before or after the prompt
      - Your entire response should be the enhanced prompt itself and nothing else`
    };
    
    // Create the messages array with the system message first
    const messages: ChatMessage[] = [systemMessage];
    
    // Add the active thread messages for context if provided
    // Filter out system messages to avoid conflicting instructions
    if (activeThreadMessages.length > 0) {
      const contextMessages = activeThreadMessages.filter(msg => msg.role !== 'system');
      messages.push(...contextMessages);
    }
    
    // Add the user message with the prompt to enhance
    messages.push({
      role: 'user',
      content: `Enhance this prompt: ${prompt}`
    });

    // Call the LLM service to generate the enhanced prompt
    const response = await generateChatResponse({
      messages,
      stream: false
    });

    if (response && response.message) {
      const enhancedContent = response.message.content.trim();
      
      // Additional clean-up to remove any potential explanatory text
      // Look for patterns like "Enhanced prompt:" or "Here's the improved prompt:"
      const cleanedContent = enhancedContent
        .replace(/^(here'?s?|enhanced|improved|better|the|your|modified|updated|revised|rewritten|new|suggested)[\s\w]*prompt[:\-]*\s*/i, '')
        .replace(/^\s*["'](.+)["']\s*$/g, '$1') // Remove surrounding quotes if present
        .trim();
      
      return cleanedContent;
    } else {
      throw new Error("Failed to generate enhanced prompt");
    }
  } catch (error) {
    console.error("Error enhancing prompt:", error);
    throw new Error(`Failed to enhance prompt: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Function to save a template to the templates directory
 * @param name The name of the template
 * @param content The content of the template
 * @param category The category of the template
 */
export async function savePromptTemplate(name: string, content: string, category: string = "General"): Promise<void> {
  try {
    // Use the appropriate method depending on environment
    if (isElectron()) {
      // Format the content with frontmatter to include category metadata
      const timestamp = new Date().toISOString();
      const templateContent = `---
name: ${name}
category: ${category}
createdAt: ${timestamp}
updatedAt: ${timestamp}
---

${content}`;

      // Save template using Electron's file system API
      await window.electron!.saveTemplate({
        name,
        content: templateContent,
        category
      });
    } else {
      // In non-Electron environments, use the API service
      // Make a POST request to the API endpoint to save the template
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          content,
          category
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save template: ${response.statusText}`);
      }
    }
    
    // Return success
    return;
  } catch (error) {
    console.error("Error saving template:", error);
    throw new Error(`Failed to save template: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Function to get all templates
 * @returns An array of template objects
 */
export async function getPromptTemplates(): Promise<PromptTemplate[]> {
  try {
    // Use the appropriate method depending on environment
    if (isElectron()) {
      // Get templates using Electron's file system API
      const templates = await window.electron!.getTemplates();
      return templates.map(template => ({
        id: template.name,
        name: template.name,
        content: '',  // Content is loaded separately when needed
        category: template.category || 'General',
        createdAt: new Date(template.createdAt || Date.now()),
        updatedAt: new Date(template.updatedAt || Date.now())
      }));
    } else {
      // In non-Electron environments, use the API service
      const response = await fetch('/api/templates');
      
      if (!response.ok) {
        throw new Error(`Failed to get templates: ${response.statusText}`);
      }
      
      const templates = await response.json();
      return templates.map((template: {
        name: string;
        category?: string;
        createdAt?: string;
        updatedAt?: string;
      }) => ({
        id: template.name,
        name: template.name,
        content: '',  // Content is loaded separately when needed
        category: template.category || 'General',
        createdAt: new Date(template.createdAt || Date.now()),
        updatedAt: new Date(template.updatedAt || Date.now())
      }));
    }
  } catch (error) {
    console.error("Error getting templates:", error);
    return [];
  }
} 