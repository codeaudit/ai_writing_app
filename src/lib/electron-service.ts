/**
 * Electron Integration Service
 * 
 * This service handles communication with Electron and provides
 * utilities for file operations in the Electron environment.
 */

import { toast } from "@/components/ui/use-toast";

/**
 * Check if the app is running in Electron
 */
export const isElectron = (): boolean => {
  return typeof window !== 'undefined' && window.electron !== undefined;
};

/**
 * Open a file using Electron's file dialog
 */
export const openFile = async (): Promise<FileData | null> => {
  if (!isElectron()) {
    toast({
      title: "Not supported",
      description: "File system operations are only available in the desktop app.",
      variant: "destructive"
    });
    return null;
  }

  try {
    return await window.electron.openFile();
  } catch (error) {
    console.error('Error opening file:', error);
    toast({
      title: "Error",
      description: "Failed to open file.",
      variant: "destructive"
    });
    return null;
  }
};

/**
 * Open a folder and read all markdown files
 */
export const openFolder = async (): Promise<FolderData | null> => {
  if (!isElectron()) {
    toast({
      title: "Not supported",
      description: "File system operations are only available in the desktop app.",
      variant: "destructive"
    });
    return null;
  }

  try {
    return await window.electron.openFolder();
  } catch (error) {
    console.error('Error opening folder:', error);
    toast({
      title: "Error",
      description: "Failed to open folder.",
      variant: "destructive"
    });
    return null;
  }
};

/**
 * Save a file using Electron's file dialog
 */
export const saveFile = async (
  content: string, 
  defaultPath?: string, 
  name?: string
): Promise<{ path: string; name: string } | null> => {
  if (!isElectron()) {
    toast({
      title: "Not supported",
      description: "File system operations are only available in the desktop app.",
      variant: "destructive"
    });
    return null;
  }

  try {
    return await window.electron.saveFile({ content, defaultPath, name });
  } catch (error) {
    console.error('Error saving file:', error);
    toast({
      title: "Error",
      description: "Failed to save file.",
      variant: "destructive"
    });
    return null;
  }
};

/**
 * Export a document to PDF or HTML
 */
export const exportDocument = async (
  content: string,
  format: 'pdf' | 'html',
  name?: string
): Promise<{ path: string; name: string } | null> => {
  if (!isElectron()) {
    toast({
      title: "Not supported",
      description: "Export operations are only available in the desktop app.",
      variant: "destructive"
    });
    return null;
  }

  try {
    return await window.electron.exportDocument({ content, format, name });
  } catch (error) {
    console.error(`Error exporting as ${format}:`, error);
    toast({
      title: "Error",
      description: `Failed to export as ${format.toUpperCase()}.`,
      variant: "destructive"
    });
    return null;
  }
};

/**
 * Set up menu event listeners
 */
export const setupMenuListeners = (
  handlers: Record<string, () => void>
): (() => void) => {
  if (!isElectron()) {
    return () => {};
  }

  const cleanupFunctions: Array<() => void> = [];

  // Register all handlers
  Object.entries(handlers).forEach(([channel, handler]) => {
    const cleanup = window.electron.onMenuAction(channel, handler);
    if (cleanup) {
      cleanupFunctions.push(cleanup);
    }
  });

  // Return a function to clean up all listeners
  return () => {
    cleanupFunctions.forEach(cleanup => cleanup());
  };
};

/**
 * Get all available templates
 */
export const getElectronTemplates = async (): Promise<TemplateData[]> => {
  if (!isElectron()) {
    return [];
  }

  try {
    return await window.electron.getTemplates();
  } catch (error) {
    console.error('Error getting templates from Electron:', error);
    return [];
  }
};

/**
 * Get the content of a template
 */
export const getElectronTemplateContent = async (templateName: string): Promise<string> => {
  if (!isElectron()) {
    return '';
  }

  try {
    const response = await window.electron.getTemplateContent(templateName);
    if (response.error) {
      throw new Error(response.error);
    }
    return response.content;
  } catch (error) {
    console.error(`Error getting template content from Electron for ${templateName}:`, error);
    return '';
  }
};

/**
 * Process a template with variables
 */
export const processElectronTemplate = async (
  templateName: string,
  variables: Record<string, string>
): Promise<string> => {
  if (!isElectron()) {
    return '';
  }

  try {
    const response = await window.electron.processTemplate(templateName, variables);
    if (response.error) {
      throw new Error(response.error);
    }
    return response.content;
  } catch (error) {
    console.error(`Error processing template in Electron for ${templateName}:`, error);
    return '';
  }
}; 