"use client";

import { useState, useEffect } from 'react';
import { useDocumentStore, Composition } from '@/lib/store';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, FileText, Edit, ExternalLink, RefreshCw, SendToBack, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { formatDistanceToNow } from 'date-fns';

export default function Compositions() {
  const { compositions, loadCompositions, deleteComposition, documents, selectDocument } = useDocumentStore();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedComposition, setSelectedComposition] = useState<Composition | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);

  // Load compositions on component mount
  useEffect(() => {
    loadCompositions();
  }, [loadCompositions]);

  // Reload compositions when documents change
  useEffect(() => {
    loadCompositions();
  }, [documents, loadCompositions]);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await loadCompositions();
      toast({
        title: "Compositions refreshed",
        description: "Your compositions have been refreshed.",
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh compositions.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedComposition) return;
    
    try {
      await deleteComposition(selectedComposition.id);
      toast({
        title: "Composition deleted",
        description: `"${selectedComposition.name}" has been deleted.`,
        duration: 3000,
      });
      setSelectedComposition(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete composition.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setShowDeleteConfirmation(false);
    }
  };

  const handleOpenDocument = (composition: Composition) => {
    // Find the corresponding document
    const compositionsFolder = documents.find(doc => doc.name === 'compositions' && doc.folderId === null);
    const document = documents.find(doc => 
      doc.name === composition.name && 
      doc.folderId === compositionsFolder?.id
    );
    
    if (document) {
      selectDocument(document.id);
      toast({
        title: "Document opened",
        description: `"${composition.name}" has been opened in the editor.`,
        duration: 3000,
      });
    } else {
      toast({
        title: "Error",
        description: "Could not find the corresponding document.",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  // Add a function to handle pushing the composition to the AI Chat
  const handlePushToAI = (composition: Composition) => {
    try {
      console.log("Pushing composition to AI:", composition.name);
      
      // First, clear any existing context in localStorage
      localStorage.removeItem('aiComposerContext');
      
      // Parse the content to extract chat messages if they exist
      const chatThreadMatch = composition.content.match(/## Chat Thread\s*\n\n([\s\S]*)/);
      const messages: Array<{role: 'user' | 'assistant', content: string}> = [];
      
      if (chatThreadMatch) {
        const chatThread = chatThreadMatch[1];
        console.log("Found chat thread:", chatThread);
        
        // Extract user and AI messages using a more robust regex
        // This handles variations in formatting better
        const messageRegex = /### (User|AI)\s*\n\n([\s\S]*?)(?=\n\n### |$)/g;
        let match;
        
        while ((match = messageRegex.exec(chatThread)) !== null) {
          const role = match[1].trim() === 'User' ? 'user' : 'assistant';
          const content = match[2].trim();
          
          if (content) {
            messages.push({ role, content });
            console.log(`Added message - Role: ${role}, Content: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`);
          }
        }
      }
      
      console.log("Extracted messages:", messages);
      
      // Verify that all context documents exist in the current documents
      const validContextDocuments = composition.contextDocuments.filter(doc => {
        const exists = documents.some(d => d.id === doc.id);
        if (!exists) {
          console.warn(`Context document with ID ${doc.id} and name ${doc.name} not found in current documents`);
        }
        return exists;
      });
      
      console.log("Valid context documents:", validContextDocuments);
      
      if (validContextDocuments.length === 0 && composition.contextDocuments.length > 0) {
        console.warn("None of the context documents in the composition exist in the current documents");
        toast({
          title: "Warning",
          description: "Some context documents from this composition are no longer available.",
          variant: "destructive",
          duration: 5000,
        });
      }
      
      // Set the context documents in localStorage
      localStorage.setItem('aiComposerContext', JSON.stringify(validContextDocuments));
      
      // Only create and dispatch events if we're in a browser environment
      if (typeof window !== 'undefined') {
        // First dispatch event to switch to the AI Composer tab
        const switchTabEvent = new CustomEvent('switchToAIComposer');
        window.dispatchEvent(switchTabEvent);
        
        // Small delay to ensure tab switch happens before other events
        setTimeout(() => {
          // Then dispatch event to update context
          const contextEvent = new CustomEvent('aiContextUpdated', { 
            detail: { context: validContextDocuments }
          });
          window.dispatchEvent(contextEvent);
          console.log("Dispatched aiContextUpdated event with context:", validContextDocuments);
          
          // Small delay to ensure context is updated before messages
          setTimeout(() => {
            // Finally, if there are messages, dispatch event to load them into the AI Chat
            if (messages.length > 0) {
              console.log("Dispatching aiChatMessagesLoaded event with messages:", messages);
              const chatEvent = new CustomEvent('aiChatMessagesLoaded', { 
                detail: { messages }
              });
              window.dispatchEvent(chatEvent);
            } else {
              console.log("No messages found in the composition, not dispatching aiChatMessagesLoaded event");
            }
            
            toast({
              title: "Pushed to AI Composer",
              description: `"${composition.name}" has been loaded into the AI Composer with ${validContextDocuments.length} context document(s) and ${messages.length} message(s).`,
              duration: 3000,
            });
          }, 100);
        }, 100);
      }
    } catch (error) {
      console.error('Error pushing to AI:', error);
      toast({
        title: "Error",
        description: "Failed to push composition to AI Composer.",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base font-medium">Compositions</h2>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleRefresh}
          disabled={isLoading}
          className="h-7 w-7"
        >
          {isLoading ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
      
      <ScrollArea className="flex-1 pr-2">
        {compositions.length === 0 ? (
          <div className="border border-dashed rounded-md bg-muted/20 p-3 text-center">
            <p className="text-muted-foreground text-xs">
              No compositions yet. Save a chat conversation to create one.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {compositions.map((composition) => (
              <div 
                key={composition.id} 
                className="group border rounded-md hover:border-primary/30 hover:bg-muted/10 transition-colors"
              >
                <div className="p-2 cursor-pointer" onClick={() => {
                  setSelectedComposition(composition);
                  setShowViewDialog(true);
                }}>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-medium truncate">{composition.name}</h3>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(composition.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  
                  <div className="text-xs text-muted-foreground line-clamp-1">
                    {composition.content.substring(0, 100)}
                    {composition.content.length > 100 && '...'}
                  </div>
                  
                  {composition.contextDocuments.length > 0 && (
                    <div className="mt-1 flex items-center gap-1 flex-wrap">
                      <span className="text-[10px] text-muted-foreground">Contexts:</span>
                      {composition.contextDocuments.slice(0, 3).map((doc) => (
                        <Badge key={doc.id} variant="outline" className="text-[10px] px-1 py-0 h-4">
                          {doc.name}
                        </Badge>
                      ))}
                      {composition.contextDocuments.length > 3 && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                          +{composition.contextDocuments.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-end border-t px-1 py-0.5 gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1.5 text-xs text-primary"
                    onClick={() => handlePushToAI(composition)}
                    title="Push to AI"
                  >
                    <Send className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1.5 text-xs text-destructive"
                    onClick={() => {
                      setSelectedComposition(composition);
                      setShowDeleteConfirmation(true);
                    }}
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Composition</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Are you sure you want to delete "{selectedComposition?.name}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-8 text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="h-8 text-xs bg-destructive hover:bg-destructive/90 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* View Composition Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{selectedComposition?.name}</DialogTitle>
            <DialogDescription>
              Created {selectedComposition && formatDistanceToNow(new Date(selectedComposition.createdAt), { addSuffix: true })}
            </DialogDescription>
          </DialogHeader>
          
          {selectedComposition && (
            <ScrollArea className="mt-2 max-h-[50vh]">
              <div className="space-y-3">
                {selectedComposition.contextDocuments.length > 0 && (
                  <div className="bg-muted/20 p-2 rounded-md">
                    <h4 className="text-xs font-medium mb-1">Context Documents</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedComposition.contextDocuments.map((doc) => (
                        <Badge key={doc.id} variant="secondary" className="text-xs">
                          {doc.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="whitespace-pre-wrap text-sm">
                  {selectedComposition.content}
                </div>
              </div>
            </ScrollArea>
          )}
          
          <DialogFooter className="mt-2 space-x-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => {
                if (selectedComposition) {
                  handlePushToAI(selectedComposition);
                  setShowViewDialog(false);
                }
              }}
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              Push to AI
            </Button>
            <DialogClose asChild>
              <Button size="sm" className="h-8">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 