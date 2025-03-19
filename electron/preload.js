const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // File operations
  openFile: () => ipcRenderer.invoke('open-file-dialog'),
  openFolder: () => ipcRenderer.invoke('open-folder-dialog'),
  saveFile: (data) => ipcRenderer.invoke('save-file-dialog', data),
  exportDocument: (data) => ipcRenderer.invoke('export-document', data),
  
  // Template operations
  getTemplates: () => ipcRenderer.invoke('get-templates'),
  getTemplateContent: (name) => ipcRenderer.invoke('get-template-content', name),
  processTemplate: (name, variables) => ipcRenderer.invoke('process-template', { name, variables }),
  
  // App version
  getVersion: () => process.versions,
  
  // Event listeners for menu events
  onMenuAction: (channel, callback) => {
    // List of valid channels to listen to
    const validChannels = [
      'menu-new-document',
      'menu-open-file',
      'menu-open-folder',
      'menu-save-document',
      'menu-save-as-document',
      'menu-export-pdf',
      'menu-export-html',
      'menu-find',
      'menu-replace',
      'menu-preferences',
      'menu-toggle-left-panel',
      'menu-toggle-right-panel',
      'menu-toggle-dark-mode',
      'file-opened'
    ];
    
    if (validChannels.includes(channel)) {
      const subscription = (event, ...args) => callback(...args);
      ipcRenderer.on(channel, subscription);
      
      // Return a function to clean up the event listener
      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    }
    
    return null;
  }
}); 