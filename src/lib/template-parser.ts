/**
 * A simple template parser for prompt templates
 */

interface TemplateContext {
  userMessage: string;
  customInstructions: string;
  contextDocuments?: Array<{ name: string; content: string }>;
  [key: string]: any;
}

// Create a safe logging function that doesn't break if console is unavailable
const safeLog = (message: string, error?: any) => {
  try {
    if (typeof console !== 'undefined' && console.error) {
      if (error) {
        console.error(message, error);
      } else {
        console.error(message);
      }
    }
  } catch (e) {
    // Silently fail if console logging isn't available
  }
};

/**
 * Parse a template string with the given context
 * 
 * Supports:
 * - {{variable}} - Variable substitution
 * - {{#if condition}}...{{/if}} - Conditional blocks
 * - {{#each array}}...{{/each}} - Iteration blocks
 * - {{@index}} - Index in an each loop
 * 
 * @param template The template string
 * @param context The context object with variables
 * @returns The parsed string
 */
export function parseTemplate(template: string, context: TemplateContext): string {
  // Check if template is undefined or null
  if (template == null) {
    safeLog("Template is null or undefined");
    return "";
  }
  
  safeLog(`Starting template parsing. Template length: ${template.length}`);
  
  let result = template;
  
  try {
    // Process conditionals
    safeLog("Processing conditionals...");
    result = processConditionals(result, context);
    safeLog(`After conditionals. Result length: ${result.length}`);
    
    // Process each loops
    safeLog("Processing each loops...");
    result = processEachLoops(result, context);
    safeLog(`After each loops. Result length: ${result.length}`);
    
    // Process variables
    safeLog("Processing variables...");
    result = processVariables(result, context);
    safeLog(`After variables. Result length: ${result.length}`);
    
    safeLog("Template parsing completed successfully");
    return result;
  } catch (error) {
    safeLog("Error parsing template:", error);
    return template; // Return original template on error
  }
}

/**
 * Process conditional blocks in the template
 */
function processConditionals(template: string, context: TemplateContext): string {
  // Check if template is undefined or null
  if (template == null) {
    return "";
  }
  
  const conditionalRegex = /{{#if\s+([^}]+)}}([\s\S]*?){{\/if}}/g;
  
  try {
    return template.replace(conditionalRegex, (match, condition, content) => {
      const conditionValue = evaluateCondition(condition, context);
      return conditionValue ? processConditionals(content, context) : '';
    });
  } catch (error) {
    safeLog("Error processing conditionals:", error);
    return template; // Return original template on error
  }
}

/**
 * Process each loops in the template
 */
function processEachLoops(template: string, context: TemplateContext): string {
  // Check if template is undefined or null
  if (template == null) {
    return "";
  }
  
  const eachRegex = /{{#each\s+([^}]+)}}([\s\S]*?){{\/each}}/g;
  
  try {
    return template.replace(eachRegex, (match, arrayName, content) => {
      const array = getNestedProperty(context, arrayName);
      
      if (!Array.isArray(array) || array.length === 0) {
        return '';
      }
      
      return array.map((item, index) => {
        // Create a new context with the item and special @index variable
        const itemContext = {
          ...context,
          [arrayName.split('.').pop() || 'item']: item,
          '@index': index
        };
        
        // Process the content with the item context
        let itemContent = content.replace(/{{@index\s*\+\s*(\d+)}}/g, (_: string, num: string) => {
          return String(index + parseInt(num, 10));
        });
        
        return processVariables(itemContent, itemContext);
      }).join('');
    });
  } catch (error) {
    safeLog("Error processing each loops:", error);
    return template; // Return original template on error
  }
}

/**
 * Process variable substitutions in the template
 */
function processVariables(template: string, context: TemplateContext): string {
  // Check if template is undefined or null
  if (template == null) {
    return "";
  }
  
  const variableRegex = /{{([^#/][^}]*?)}}/g;
  
  try {
    return template.replace(variableRegex, (match, path) => {
      const value = getNestedProperty(context, path.trim());
      return value !== undefined ? String(value) : '';
    });
  } catch (error) {
    safeLog("Error processing variables:", error);
    return template; // Return original template on error
  }
}

/**
 * Evaluate a condition expression
 */
function evaluateCondition(condition: string, context: TemplateContext): boolean {
  try {
    // Simple condition evaluation - just check if the property exists and is truthy
    const value = getNestedProperty(context, condition.trim());
    return Boolean(value && (Array.isArray(value) ? value.length > 0 : value));
  } catch (error) {
    safeLog("Error evaluating condition:", error);
    return false; // Return false on error
  }
}

/**
 * Get a nested property from an object using a path string
 * e.g., "user.profile.name" => context.user.profile.name
 */
function getNestedProperty(obj: any, path: string): any {
  if (obj == null || path == null) {
    return undefined;
  }
  
  try {
    return path.split('.').reduce((prev, curr) => {
      return prev && prev[curr] !== undefined ? prev[curr] : undefined;
    }, obj);
  } catch (error) {
    safeLog("Error getting nested property:", error);
    return undefined;
  }
}

/**
 * Create a default template if none is provided
 */
export function createDefaultTemplate(): string {
  return `{{#if contextDocuments}}
Context Documents:

{{#each contextDocuments}}
Document {{@index + 1}} Title: {{name}}
Document {{@index + 1}} Content:
{{content}}

{{/each}}
{{/if}}

User Message: {{userMessage}}

{{customInstructions}}

Please provide a helpful response based on the user request{{#if contextDocuments}} and the provided context documents{{/if}}.`;
}

/**
 * Create default custom instructions if none are provided
 */
export function createDefaultInstructions(): string {
  return `Be concise, accurate, and helpful. If you're unsure about something, acknowledge the uncertainty.`;
} 