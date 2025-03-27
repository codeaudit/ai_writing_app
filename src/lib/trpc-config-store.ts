import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { trpc } from '@/utils/trpc';
import type { AppConfig } from '@/server/routers/config';

// LLM Provider type
export type LLMProvider = 'openai' | 'anthropic' | 'gemini';

// Model interface
export interface LLMModel {
  id: string;
  name: string;
  context: number;
  provider: string;
}

// Define the store state
interface ConfigStore {
  config: AppConfig;
  availableModels: LLMModel[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadConfig: () => Promise<void>;
  saveConfig: (config: Partial<AppConfig>) => Promise<void>;
  resetConfig: () => Promise<void>;
  loadAvailableModels: (provider?: LLMProvider) => Promise<LLMModel[]>;
  getApiKey: () => string;
  saveToCookies: () => void;
}

// Create the store with tRPC integration
export const useTrpcConfigStore = create<ConfigStore>()(
  persist(
    (set, get) => ({
      // Default config - will be overridden by loadConfig
      config: {
        provider: 'openai' as LLMProvider,
        model: 'gpt-4',
        enableCache: false,
        temperature: 0.7,
        maxTokens: 1000,
        aiRole: 'assistant',
      },
      availableModels: [],
      isLoading: false,
      error: null,
      
      // Load config from server
      loadConfig: async () => {
        set({ isLoading: true, error: null });
        
        try {
          const utils = trpc.useUtils?.() || null;
          
          if (utils) {
            // Use tRPC query to get config
            const config = await utils.client.config.getConfig.query();
            
            // Ensure provider is correctly typed
            set({ 
              config: {
                ...config,
                provider: config.provider as LLMProvider
              },
              isLoading: false 
            });
          } else {
            // Fallback using fetch for non-component context
            const response = await fetch('/api/trpc/config.getConfig');
            const data = await response.json();
            
            if (data.result?.data) {
              // Ensure provider is correctly typed
              const config = data.result.data;
              
              set({ 
                config: {
                  ...config,
                  provider: config.provider as LLMProvider
                },
                isLoading: false 
              });
            }
          }
        } catch (error) {
          console.error('Error loading config:', error);
          set({ 
            isLoading: false,
            error: 'Failed to load configuration. Using defaults instead.' 
          });
        }
      },
      
      // Save config to server
      saveConfig: async (configUpdates: Partial<AppConfig>) => {
        set({ isLoading: true, error: null });
        
        try {
          // Update local state immediately for better UX
          set(state => ({
            config: { ...state.config, ...configUpdates }
          }));
          
          // Also update cookies
          get().saveToCookies();
          
          const utils = trpc.useUtils?.() || null;
          const updatedConfig = { ...get().config, ...configUpdates };
          
          if (utils) {
            // Use tRPC mutation to save config
            await utils.client.config.saveConfig.mutate(updatedConfig);
            
            // Set successful state
            set({ isLoading: false });
          } else {
            // Fallback using fetch for non-component context
            await fetch('/api/trpc/config.saveConfig', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                json: updatedConfig
              }),
            });
            
            // Set successful state
            set({ isLoading: false });
          }
        } catch (error) {
          console.error('Error saving config:', error);
          set({ 
            isLoading: false,
            error: 'Failed to save configuration. Please try again.' 
          });
        }
      },
      
      // Reset config to defaults
      resetConfig: async () => {
        set({ isLoading: true, error: null });
        
        try {
          const utils = trpc.useUtils?.() || null;
          
          if (utils) {
            // Use tRPC mutation to reset config
            const result = await utils.client.config.resetConfig.mutate();
            
            // Update local state with reset config
            set({ 
              config: {
                ...result.config,
                provider: result.config.provider as LLMProvider
              },
              isLoading: false 
            });
            
            // Also update cookies
            get().saveToCookies();
          } else {
            // Fallback using fetch for non-component context
            const response = await fetch('/api/trpc/config.resetConfig', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ json: {} }),
            });
            
            const data = await response.json();
            
            if (data.result?.data) {
              // Ensure provider is correctly typed
              const config = data.result.data.config;
              
              set({ 
                config: {
                  ...config,
                  provider: config.provider as LLMProvider
                },
                isLoading: false 
              });
              
              // Also update cookies
              get().saveToCookies();
            }
          }
        } catch (error) {
          console.error('Error resetting config:', error);
          set({ 
            isLoading: false,
            error: 'Failed to reset configuration. Please try again.' 
          });
        }
      },
      
      // Load available models
      loadAvailableModels: async (provider?: LLMProvider) => {
        set({ isLoading: true, error: null });
        
        try {
          const utils = trpc.useUtils?.() || null;
          
          if (utils) {
            // Use tRPC query to get available models
            const models = await utils.client.config.getAvailableModels.query({
              provider
            });
            
            set({ 
              availableModels: models,
              isLoading: false 
            });
            
            return models;
          } else {
            // Fallback using fetch for non-component context
            const queryString = provider ? 
              `?input=${encodeURIComponent(JSON.stringify({ provider }))}` : '';
              
            const response = await fetch(`/api/trpc/config.getAvailableModels${queryString}`);
            const data = await response.json();
            
            if (data.result?.data) {
              const models = data.result.data;
              
              set({ 
                availableModels: models,
                isLoading: false 
              });
              
              return models;
            }
            
            return [];
          }
        } catch (error) {
          console.error('Error loading available models:', error);
          set({ 
            isLoading: false,
            error: 'Failed to load available models. Please try again.' 
          });
          
          return [];
        }
      },
      
      // Get the appropriate API key for the current provider
      getApiKey: () => {
        const state = get();
        const provider = state.config.provider;
        
        // In a real implementation, this would get the API key from a secure store
        // For demo purposes, we're just returning a placeholder
        switch (provider) {
          case 'openai':
            return 'openai-api-key';
          case 'gemini':
            return 'gemini-api-key';
          case 'anthropic':
            return 'anthropic-api-key';
          default:
            return '';
        }
      },
      
      // Save config to cookies for server-side access
      saveToCookies: () => {
        const state = get();
        const cookieConfig = {
          provider: state.config.provider,
          model: state.config.model,
          enableCache: state.config.enableCache,
          temperature: state.config.temperature,
          maxTokens: state.config.maxTokens,
          aiRole: state.config.aiRole,
        };
        
        // Set cookie if in browser environment
        if (typeof document !== 'undefined') {
          document.cookie = `llm-config=${JSON.stringify(cookieConfig)};path=/;max-age=2592000;SameSite=Lax`;
        }
      }
    }),
    {
      name: 'trpc-config-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        config: {
          provider: state.config.provider,
          model: state.config.model,
          enableCache: state.config.enableCache,
          temperature: state.config.temperature,
          maxTokens: state.config.maxTokens,
          aiRole: state.config.aiRole,
        }
      }),
    }
  )
); 