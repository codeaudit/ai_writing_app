import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Helper function to generate a unique ID
export function generateId(prefix: string = ''): string {
  return `${prefix}${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Helper function to create a message node for chat
export function createMessageNode(content: string, role: 'user' | 'assistant' = 'user') {
  const id = generateId('msg-');
  
  return {
    id,
    parentId: null, 
    childrenIds: [],
    isActive: true,
    threadPosition: 0,
    ...(role === 'user' 
      ? { userContent: content } 
      : { assistantContent: content })
  };
}
