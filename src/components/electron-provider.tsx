'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { setupMenuListeners, isElectron, openFile, saveFile } from '@/lib/electron-service';
import { useDocumentStore } from '@/lib/store';
import { toast } from '@/components/ui/use-toast';

export default function ElectronProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { 
    documents, 
    selectedDocumentId, 
    addDocument,
    updateDocument,
    selectDocument,
    loadData 
  } = useDocumentStore();

  // Set up Electron menu event listeners
  useEffect(() => {
    if (!isElectron()) return;

    const cleanup = setupMenuListeners({
      // Handle New Document
      'menu-new-document': () => {
        try {
          const timestamp = new Date();
          const newDocId = `doc-${timestamp.getTime()}`;
          const newDoc = {
            id: newDocId,
            name: `New Document ${documents.length + 1}`,
            content: `# New Document ${documents.length + 1}\n\nStart writing here...`,
            createdAt: timestamp,
            updatedAt: timestamp,
            versions: [],
            folderId: null,
            annotations: []
          };

          addDocument(
            newDoc.name, 
            newDoc.content, 
            newDoc.folderId
          );

          router.push(`/documents/${newDocId}`);
          
          toast({
            title: "Document created",
            description: `New document "${newDoc.name}" created.`
          });
        } catch (error) {
          console.error('Error creating new document:', error);
          toast({
            title: "Error",
            description: "Failed to create new document.",
            variant: "destructive"
          });
        }
      },
      
      // Handle Open File
      'menu-open-file': async () => {
        try {
          const fileData = await openFile();
          if (fileData) {
            const timestamp = new Date();
            const newDocId = `doc-${timestamp.getTime()}`;
            
            // Create a new document from the file
            addDocument(
              fileData.name, 
              fileData.content,
              null, // No folder ID for imported files initially
              newDocId // Use the new document ID
            );
            
            // Select the new document
            selectDocument(newDocId);
            router.push(`/documents/${newDocId}`);
            
            toast({
              title: "File opened",
              description: `"${fileData.name}" has been opened successfully.`
            });
          }
        } catch (error) {
          console.error('Error opening file:', error);
          toast({
            title: "Error",
            description: "Failed to open file.",
            variant: "destructive"
          });
        }
      },
      
      // Handle Open Folder - implementation depends on your app structure
      'menu-open-folder': async () => {
        try {
          // This is a placeholder for the open folder functionality
          // You'll need to adapt this to your application's folder structure
          toast({
            title: "Open Folder",
            description: "This feature is not yet implemented."
          });
        } catch (error) {
          console.error('Error opening folder:', error);
          toast({
            title: "Error",
            description: "Failed to open folder.",
            variant: "destructive"
          });
        }
      },
      
      // Handle Save Document
      'menu-save-document': async () => {
        try {
          if (selectedDocumentId) {
            const doc = documents.find(d => d.id === selectedDocumentId);
            if (doc) {
              // Save the document to a file
              const result = await saveFile(doc.content, undefined, doc.name);
              if (result) {
                toast({
                  title: "Document saved",
                  description: `"${doc.name}" has been saved to ${result.path}`
                });
              }
            } else {
              toast({
                title: "No document selected",
                description: "Please select a document to save.",
                variant: "destructive"
              });
            }
          } else {
            toast({
              title: "No document selected",
              description: "Please select a document to save.",
              variant: "destructive"
            });
          }
        } catch (error) {
          console.error('Error saving document:', error);
          toast({
            title: "Error",
            description: "Failed to save document.",
            variant: "destructive"
          });
        }
      },
      
      // Handle Save As Document
      'menu-save-as-document': async () => {
        try {
          if (selectedDocumentId) {
            const doc = documents.find(d => d.id === selectedDocumentId);
            if (doc) {
              // Save the document to a new file
              const result = await saveFile(doc.content, undefined, doc.name);
              if (result) {
                toast({
                  title: "Document saved",
                  description: `"${doc.name}" has been saved to ${result.path}`
                });
              }
            } else {
              toast({
                title: "No document selected",
                description: "Please select a document to save.",
                variant: "destructive"
              });
            }
          } else {
            toast({
              title: "No document selected",
              description: "Please select a document to save.",
              variant: "destructive"
            });
          }
        } catch (error) {
          console.error('Error saving document:', error);
          toast({
            title: "Error",
            description: "Failed to save document.",
            variant: "destructive"
          });
        }
      },
      
      // Handle Toggle Left Panel (assuming you have this function in your layout)
      'menu-toggle-left-panel': () => {
        // Dispatch a custom event that your layout component can listen for
        window.dispatchEvent(new CustomEvent('toggle-left-panel'));
      },
      
      // Handle Toggle Right Panel
      'menu-toggle-right-panel': () => {
        // Dispatch a custom event that your layout component can listen for
        window.dispatchEvent(new CustomEvent('toggle-right-panel'));
      },
      
      // Handle Toggle Dark Mode
      'menu-toggle-dark-mode': () => {
        // Dispatch a custom event that your theme provider can listen for
        window.dispatchEvent(new CustomEvent('toggle-dark-mode'));
      },
      
      // Handle file opened from OS (like double-clicking a file)
      'file-opened': (fileData) => {
        if (fileData) {
          try {
            const timestamp = new Date();
            const newDocId = `doc-${timestamp.getTime()}`;
            
            // Create a new document from the file
            addDocument(
              fileData.name, 
              fileData.content,
              null, // No folder ID for imported files initially
              newDocId // Use the new document ID
            );
            
            // Select the new document
            selectDocument(newDocId);
            router.push(`/documents/${newDocId}`);
            
            toast({
              title: "File opened",
              description: `"${fileData.name}" has been opened successfully.`
            });
          } catch (error) {
            console.error('Error processing opened file:', error);
            toast({
              title: "Error",
              description: "Failed to process opened file.",
              variant: "destructive"
            });
          }
        }
      }
    });
    
    // Clean up event listeners when component unmounts
    return cleanup;
  }, [
    documents,
    selectedDocumentId,
    addDocument,
    updateDocument,
    selectDocument,
    router
  ]);

  return <>{children}</>;
} 