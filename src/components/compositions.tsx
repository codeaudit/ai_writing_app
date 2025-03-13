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
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Compositions</h2>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={isLoading}
        >
          {isLoading ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </div>
      
      <ScrollArea className="flex-1">
        {compositions.length === 0 ? (
          <Card className="border-dashed bg-muted/30">
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground text-sm">
                No compositions yet. Save a chat conversation to create one.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {compositions.map((composition) => (
              <Card key={composition.id} className="group">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-base truncate">{composition.name}</CardTitle>
                  <CardDescription className="text-xs">
                    Created {formatDistanceToNow(new Date(composition.createdAt), { addSuffix: true })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0 pb-2">
                  <div className="text-sm text-muted-foreground line-clamp-2">
                    {composition.content.substring(0, 150)}
                    {composition.content.length > 150 && '...'}
                  </div>
                  
                  {composition.contextDocuments.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground mb-1">Context documents:</p>
                      <div className="flex flex-wrap gap-1">
                        {composition.contextDocuments.map((doc) => (
                          <Badge key={doc.id} variant="outline" className="text-xs">
                            {doc.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
                <Separator />
                <CardFooter className="p-2 flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-primary hover:text-primary"
                    onClick={() => handlePushToAI(composition)}
                  >
                    <Send className="h-4 w-4 mr-1" />
                    Push to AI
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-destructive hover:text-destructive"
                    onClick={() => {
                      setSelectedComposition(composition);
                      setShowDeleteConfirmation(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Composition</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedComposition?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90 text-white"
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
            <ScrollArea className="mt-4 max-h-[50vh]">
              <div className="space-y-4">
                {selectedComposition.contextDocuments.length > 0 && (
                  <div className="bg-muted/30 p-3 rounded-md">
                    <h4 className="text-sm font-medium mb-2">Context Documents</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedComposition.contextDocuments.map((doc) => (
                        <Badge key={doc.id} variant="secondary" className="text-xs">
                          {doc.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="whitespace-pre-wrap">
                  {selectedComposition.content}
                </div>
              </div>
            </ScrollArea>
          )}
          
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => {
                if (selectedComposition) {
                  handleOpenDocument(selectedComposition);
                  setShowViewDialog(false);
                }
              }}
            >
              <FileText className="h-4 w-4 mr-2" />
              Open in Editor
            </Button>
            <DialogClose asChild>
              <Button>Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 