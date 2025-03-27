import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { trpc } from '@/utils/trpc';

// Types from ai-roles.ts
export type AIRole = string;

export interface AIRoleInfo {
  role: AIRole;
  prompt: string;
}

// Interface for role response from the API
interface RoleResponse {
  role: string;
  name?: string;
  description?: string;
}

// Default values as fallback
export const DEFAULT_PROMPTS: Record<string, string> = {
  'assistant': 'You are a helpful writing assistant. I will provide suggestions only when asked.',
  'co-creator': 'You are an active writing partner. I will collaborate with you, suggesting ideas and content as we work together.',
  'validator': 'You are a critical reviewer. I will analyze your writing for issues with structure, clarity, and style.',
  'autopilot': 'I will take the lead on generating complete content based on your parameters.'
};

export const DEFAULT_ROLES: AIRole[] = ['assistant', 'co-creator', 'validator', 'autopilot'];

// Define the store state
interface AIRolesStore {
  availableRoles: AIRole[];
  allRoles: AIRoleInfo[];
  selectedRole: AIRole;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadAvailableRoles: () => Promise<AIRole[]>;
  loadAllRoles: () => Promise<AIRoleInfo[]>;
  getRoleSystemPrompt: (role: AIRole) => Promise<string>;
  selectRole: (role: AIRole) => void;
}

// Create the store with tRPC integration
export const useTrpcAIRolesStore = create<AIRolesStore>()(
  persist(
    (set) => ({
      availableRoles: DEFAULT_ROLES,
      allRoles: DEFAULT_ROLES.map(role => ({
        role,
        prompt: DEFAULT_PROMPTS[role]
      })),
      selectedRole: 'assistant',
      isLoading: false,
      error: null,
      
      // Load available roles from the API
      loadAvailableRoles: async () => {
        set({ isLoading: true, error: null });
        
        try {
          const utils = trpc.useUtils?.() || null;
          
          if (utils) {
            // Use tRPC query to get available roles
            const roles = await utils.client.aiRoles.getAvailableRoles.query();
            const roleValues = roles.map(r => r.role); // Extract role values
            
            set({ 
              availableRoles: roleValues,
              isLoading: false 
            });
            
            return roleValues;
          } else {
            // Fallback using fetch for non-component context
            const response = await fetch('/api/trpc/aiRoles.getAvailableRoles');
            const data = await response.json();
            
            if (data.result.data) {
              const roleValues = data.result.data.map((r: RoleResponse) => r.role);
              
              set({ 
                availableRoles: roleValues,
                isLoading: false 
              });
              
              return roleValues;
            }
            
            return DEFAULT_ROLES;
          }
        } catch (error) {
          console.error('Error loading available AI roles:', error);
          set({ 
            isLoading: false,
            error: 'Failed to load available AI roles. Using defaults instead.',
            availableRoles: DEFAULT_ROLES
          });
          
          return DEFAULT_ROLES;
        }
      },
      
      // Load all roles with their prompts
      loadAllRoles: async () => {
        set({ isLoading: true, error: null });
        
        try {
          const utils = trpc.useUtils?.() || null;
          
          if (utils) {
            // Use tRPC query to get all roles
            const roles = await utils.client.aiRoles.getAllRoles.query();
            
            set({ 
              allRoles: roles,
              isLoading: false 
            });
            
            return roles;
          } else {
            // Fallback using fetch for non-component context
            const response = await fetch('/api/trpc/aiRoles.getAllRoles');
            const data = await response.json();
            
            if (data.result.data) {
              set({ 
                allRoles: data.result.data,
                isLoading: false 
              });
              
              return data.result.data;
            }
            
            // If fetch fails, return defaults
            const defaultRoles = DEFAULT_ROLES.map(role => ({
              role,
              prompt: DEFAULT_PROMPTS[role]
            }));
            
            set({
              allRoles: defaultRoles,
              isLoading: false
            });
            
            return defaultRoles;
          }
        } catch (error) {
          console.error('Error loading all AI roles:', error);
          
          // Return defaults if API call fails
          const defaultRoles = DEFAULT_ROLES.map(role => ({
            role,
            prompt: DEFAULT_PROMPTS[role]
          }));
          
          set({ 
            isLoading: false,
            error: 'Failed to load AI roles and prompts. Using defaults instead.',
            allRoles: defaultRoles
          });
          
          return defaultRoles;
        }
      },
      
      // Get system prompt for a specific role
      getRoleSystemPrompt: async (role: AIRole = 'assistant') => {
        set({ isLoading: true, error: null });
        
        try {
          const utils = trpc.useUtils?.() || null;
          
          if (utils) {
            // Use tRPC query to get role system prompt
            const result = await utils.client.aiRoles.getRoleSystemPrompt.query({
              role
            });
            
            set({ isLoading: false });
            return result.systemPrompt;
          } else {
            // Fallback using fetch for non-component context
            const response = await fetch(`/api/trpc/aiRoles.getRoleSystemPrompt?input=${encodeURIComponent(JSON.stringify({ role }))}`);
            const data = await response.json();
            
            set({ isLoading: false });
            
            if (data.result.data) {
              return data.result.data.systemPrompt;
            }
            
            // Return default if fetch fails
            return DEFAULT_PROMPTS[role] || DEFAULT_PROMPTS.assistant;
          }
        } catch (error) {
          console.error(`Error getting system prompt for role "${role}":`, error);
          set({ 
            isLoading: false,
            error: `Failed to get system prompt for role "${role}". Using default instead.`
          });
          
          // Return default if API call fails
          return DEFAULT_PROMPTS[role] || DEFAULT_PROMPTS.assistant;
        }
      },
      
      // Set the selected role
      selectRole: (role: AIRole) => {
        set({ selectedRole: role });
      }
    }),
    {
      name: 'trpc-ai-roles-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        selectedRole: state.selectedRole
      })
    }
  )
); 