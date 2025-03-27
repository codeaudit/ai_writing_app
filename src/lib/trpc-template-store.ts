import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { trpc } from '@/utils/trpc';

// Define the template interface
export interface Template {
  id: string;
  name: string;
  description: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  category?: string;
  tags?: string[];
}

// Define the store state
interface TemplateStore {
  templates: Template[];
  selectedTemplateId: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadTemplates: () => Promise<void>;
  getTemplate: (id: string) => Template | undefined;
  addTemplate: (template: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateTemplate: (id: string, data: Partial<Omit<Template, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  processTemplate: (
    templateId: string, 
    variables: Record<string, string>
  ) => Promise<string>;
  selectTemplate: (id: string | null) => void;
}

// Create the store with tRPC integration
export const useTemplateStore = create<TemplateStore>()(
  persist(
    (set, get) => ({
      templates: [],
      selectedTemplateId: null,
      isLoading: false,
      error: null,
      
      // Data loading
      loadTemplates: async () => {
        set({ isLoading: true, error: null });
        
        try {
          const utils = trpc.useUtils?.() || null;
          
          if (utils) {
            // Use tRPC query to get templates
            const templates = await utils.client.template.getTemplates.query();
            set({ templates, isLoading: false });
          } else {
            // Fallback using fetch for non-component context
            const response = await fetch('/api/trpc/template.getTemplates');
            const data = await response.json();
            
            if (data.result.data) {
              set({ 
                templates: data.result.data,
                isLoading: false 
              });
            }
          }
        } catch (error) {
          console.error('Error loading templates:', error);
          set({ 
            isLoading: false,
            error: 'Failed to load templates. Please try again.' 
          });
        }
      },
      
      // Get single template
      getTemplate: (id) => {
        return get().templates.find(template => template.id === id);
      },
      
      // Add new template
      addTemplate: async (template) => {
        set({ error: null });
        
        try {
          const utils = trpc.useUtils?.() || null;
          
          if (utils) {
            // Use tRPC mutation to create template
            const result = await utils.client.template.saveTemplate.mutate({
              name: template.name,
              content: template.content,
              description: template.description || '',
            });
            
            // Invalidate the templates query cache
            utils.template.getTemplates.invalidate();
            
            // Return the new template ID
            return result.id;
          } else {
            // Fallback using fetch for non-component context
            const response = await fetch('/api/trpc/template.saveTemplate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                json: {
                  name: template.name,
                  content: template.content,
                  description: template.description || '',
                }
              }),
            });
            
            const data = await response.json();
            const newTemplateId = data.result.data.id;
            
            // Update the local state
            await get().loadTemplates();
            
            return newTemplateId;
          }
        } catch (error) {
          console.error('Error adding template:', error);
          set({ error: 'Failed to add template. Please try again.' });
          return '';
        }
      },
      
      // Update existing template
      updateTemplate: async (id, data) => {
        set({ error: null });
        
        try {
          const utils = trpc.useUtils?.() || null;
          const currentTemplate = get().templates.find(template => template.id === id);
          
          if (!currentTemplate) {
            throw new Error('Template not found');
          }
          
          if (utils) {
            // Use tRPC mutation to update template
            await utils.client.template.saveTemplate.mutate({
              id,
              name: data.name || currentTemplate.name,
              content: data.content || currentTemplate.content,
              description: data.description || currentTemplate.description,
            });
            
            // Invalidate the templates query cache
            utils.template.getTemplates.invalidate();
          } else {
            // Fallback using fetch for non-component context
            await fetch('/api/trpc/template.saveTemplate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                json: {
                  id,
                  name: data.name || currentTemplate.name,
                  content: data.content || currentTemplate.content,
                  description: data.description || currentTemplate.description,
                }
              }),
            });
            
            // Update the local state
            set(state => ({
              templates: state.templates.map(template => 
                template.id === id 
                  ? { 
                      ...template, 
                      ...data,
                      updatedAt: new Date()
                    } 
                  : template
              )
            }));
          }
        } catch (error) {
          console.error('Error updating template:', error);
          set({ error: 'Failed to update template. Please try again.' });
        }
      },
      
      // Delete template
      deleteTemplate: async (id) => {
        set({ error: null });
        
        try {
          // Update UI state immediately for better UX
          set(state => ({
            templates: state.templates.filter(template => template.id !== id),
            selectedTemplateId: state.selectedTemplateId === id ? null : state.selectedTemplateId
          }));
          
          // Delete template using tRPC
          const utils = trpc.useUtils?.() || null;
          
          if (utils) {
            // We're using a custom mutation since we don't have a deleteTemplate in the router yet
            // This would need to be added to the template router
            utils.client.template.deleteTemplate.mutate({ id });
            
            // Invalidate the templates query cache
            utils.template.getTemplates.invalidate();
          } else {
            // Fallback using fetch for non-component context
            await fetch('/api/trpc/template.deleteTemplate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                json: { id }
              }),
            });
          }
        } catch (error) {
          console.error('Error deleting template:', error);
          set({ error: 'Failed to delete template. Please try again.' });
          
          // Reload templates to restore state if deletion failed
          await get().loadTemplates();
        }
      },
      
      // Process template with variables
      processTemplate: async (templateId, variables) => {
        set({ error: null });
        
        try {
          const utils = trpc.useUtils?.() || null;
          
          if (utils) {
            // Use tRPC mutation to process template
            const result = await utils.client.template.processTemplate.mutate({
              templateId,
              variables
            });
            
            return result.processedTemplate;
          } else {
            // Fallback using fetch for non-component context
            const response = await fetch('/api/trpc/template.processTemplate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                json: {
                  templateId,
                  variables
                }
              }),
            });
            
            const data = await response.json();
            return data.result.data.processedTemplate;
          }
        } catch (error) {
          console.error('Error processing template:', error);
          set({ error: 'Failed to process template. Please try again.' });
          return '';
        }
      },
      
      // Select template
      selectTemplate: (id) => {
        set({ selectedTemplateId: id });
      },
    }),
    {
      name: 'trpc-template-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
); 