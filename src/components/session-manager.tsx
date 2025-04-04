'use client';

import { useState, useEffect } from 'react';
import { useDocumentStore } from '@/lib/store';
import { useSessionStore, DocumentSession } from '@/lib/session-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { PlusCircle, X, BookOpen, Bookmark, FileText, Clock, RefreshCw, AlertOctagon } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { Tooltip, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/components/ui/use-toast';
import { useNavigationHistory } from '@/lib/navigation-history';

/**
 * Component to display and manage document sessions
 */
export default function SessionManager() {
  const { documents, selectedDocumentId } = useDocumentStore();
  const { 
    sessions, 
    activeSessionId, 
    createSession, 
    deleteSession, 
    setActiveSession,
    removeDocumentFromSession,
    addDocumentToSession,
    getSessionDocuments,
    loadSessions,
    isSyncRequired,
    isLoading,
    error,
    checkSync,
    refreshSessions,
    repairSessions,
  } = useSessionStore();
  
  // Add navigation history
  const navigationHistory = useNavigationHistory();
  
  const [showNewSessionDialog, setShowNewSessionDialog] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [sessionDescription, setSessionDescription] = useState('');
  const [sessionColor, setSessionColor] = useState('#627BFF');
  
  // Load the sessions when the component mounts
  useEffect(() => {
    // Create a ref to track if sessions have been loaded
    const loadSessionsOnce = async () => {
      try {
        // Check if we already have sessions loaded to avoid unnecessary calls
        if (sessions.length === 0 && !isLoading) {
          await loadSessions();
        }
      } catch (error) {
        console.error('Error loading sessions:', error);
      }
    };
    
    loadSessionsOnce();
    // Important: Don't include loadSessions in the dependency array
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Get the currently active session
  const activeSession = sessions.find(session => session.id === activeSessionId);
  
  // Get documents for the current session
  const sessionDocuments = activeSession 
    ? getSessionDocuments(activeSession.id, documents)
    : [];
  
  // Handle creating a new session
  const handleCreateSession = async () => {
    if (!sessionName.trim()) return;
    
    try {
      await createSession(
        sessionName,
        sessionDescription,
        [],
        sessionColor
      );
      
      // Reset form and close dialog
      setSessionName('');
      setSessionDescription('');
      setSessionColor('#627BFF');
      setShowNewSessionDialog(false);
      
      toast({
        title: "Session created",
        description: `New session "${sessionName}" has been created.`
      });
    } catch (error) {
      console.error('Error creating session:', error);
      toast({
        title: "Failed to create session",
        description: "An error occurred while creating the session.",
        variant: "destructive"
      });
    }
  };
  
  // Handle refreshing sessions from server
  const handleRefreshSessions = async () => {
    try {
      // First check for sync issues
      const isSynced = await checkSync();
      
      if (!isSynced) {
        // If not in sync, refresh sessions from server
        await refreshSessions();
        toast({
          title: "Sessions refreshed",
          description: "Sessions have been refreshed from the server."
        });
      } else {
        toast({
          title: "Sessions already in sync",
          description: "No refresh needed, your sessions are up to date."
        });
      }
    } catch (error) {
      console.error('Error refreshing sessions:', error);
      toast({
        title: "Failed to refresh sessions",
        description: "An error occurred while refreshing sessions.",
        variant: "destructive"
      });
    }
  };
  
  // Handle repairing sessions
  const handleRepairSessions = async () => {
    try {
      await repairSessions();
      toast({
        title: "Sessions repaired",
        description: "Sessions have been successfully repaired."
      });
    } catch (error) {
      console.error('Error repairing sessions:', error);
      toast({
        title: "Failed to repair sessions",
        description: "An error occurred while repairing sessions.",
        variant: "destructive"
      });
    }
  };
  
  // Handle adding current document to session
  const handleAddCurrentDocument = async () => {
    if (!activeSessionId || !selectedDocumentId) return;
    
    try {
      await addDocumentToSession(activeSessionId, selectedDocumentId);
      toast({
        title: "Document added to session",
        description: "The document has been added to the active session."
      });
    } catch (error) {
      console.error('Error adding document to session:', error);
      toast({
        title: "Failed to add document",
        description: "Could not add document to session.",
        variant: "destructive"
      });
    }
  };
  
  // Handle removing document from session
  const handleRemoveDocument = async (documentId: string, sessionId: string) => {
    if (!documentId || !sessionId) return;
    
    try {
      await removeDocumentFromSession(sessionId, documentId);
      toast({
        title: "Document removed",
        description: "The document has been removed from the session."
      });
    } catch (error) {
      console.error('Error removing document from session:', error);
      toast({
        title: "Failed to remove document",
        description: "Could not remove document from session.",
        variant: "destructive"
      });
    }
  };
  
  // Handle activating a session
  const handleActivateSession = (sessionId: string) => {
    // First set the active session in the session store
    setActiveSession(sessionId);
    
    // Get the session and its documents
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;
    
    // Clear the navigation history and add the session documents
    navigationHistory.clearHistory();
    
    // Add each document from the session to the history
    session.documentIds.forEach((docId, index) => {
      const doc = documents.find(d => d.id === docId);
      if (doc) {
        // Get the document name
        const name = doc.name;
        
        // Add to history with the name
        navigationHistory.addToHistory(docId, false, name);
        
        // If this is the first document, select it
        if (index === 0) {
          useDocumentStore.getState().selectDocument(docId);
        }
      }
    });
    
    // Toast notification
    toast({
      title: "Session Activated",
      description: `Navigation history updated to session documents.`,
    });
  };
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-2 border-b">
        <h2 className="text-sm font-semibold flex items-center gap-1">
          <BookOpen size={16} />
          <span>Sessions</span>
          {isSyncRequired && (
            <span className="text-xs text-yellow-500 ml-1">(Out of sync)</span>
          )}
        </h2>
        
        <div className="flex items-center gap-1">
          {/* Sync status indicator */}
          {isSyncRequired && (
            <TooltipProvider>
              <Tooltip content="Sessions may be out of sync. Click to repair.">
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={handleRepairSessions}
                    className="text-yellow-500 h-7 w-7 p-0"
                    disabled={isLoading}
                  >
                    <AlertOctagon size={14} />
                  </Button>
                </TooltipTrigger>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {/* Manual refresh button with improved tooltip */}
          <TooltipProvider>
            <Tooltip content="Refresh sessions">
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleRefreshSessions}
                  className="h-7 w-7 p-0"
                  disabled={isLoading}
                >
                  <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
                </Button>
              </TooltipTrigger>
            </Tooltip>
          </TooltipProvider>
          
          {/* Create new session button */}
          <TooltipProvider>
            <Tooltip content="Create new session">
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowNewSessionDialog(true)}
                  className="h-7 w-7 p-0"
                  disabled={isLoading}
                >
                  <PlusCircle size={14} />
                </Button>
              </TooltipTrigger>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-500/10 text-red-500 p-1 text-xs">
          <span className="truncate block">Error: {error}</span>
          <Button 
            variant="link" 
            size="sm" 
            className="p-0 h-auto text-xs text-red-500 hover:text-red-400"
            onClick={handleRepairSessions}
          >
            Try to repair
          </Button>
        </div>
      )}
      
      <Tabs defaultValue="active" className="flex-1 flex flex-col">
        <TabsList className="px-1 pt-1 pb-0 bg-transparent justify-start h-8">
          <TabsTrigger value="active" className="data-[state=active]:bg-muted h-7 text-xs px-2">Active</TabsTrigger>
          <TabsTrigger value="all" className="data-[state=active]:bg-muted h-7 text-xs px-2">All Sessions</TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="flex-1 p-1 mt-1">
          {activeSession ? (
            <Card className="h-full flex flex-col overflow-hidden">
              <div className="p-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: activeSession.color || '#627BFF' }}
                    />
                    <h4 className="text-sm font-medium truncate">{activeSession.name}</h4>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setActiveSession(null)}
                    aria-label="Close session"
                    className="h-6 w-6 p-0"
                  >
                    <X size={12} />
                  </Button>
                </div>
                {activeSession.description && (
                  <p className="text-xs text-muted-foreground truncate">{activeSession.description}</p>
                )}
              </div>
              
              <div className="px-2 pb-1">
                {selectedDocumentId && (
                  <div className="flex items-center gap-1 mb-2">
                    <Button 
                      onClick={handleAddCurrentDocument}
                      size="sm"
                      variant="secondary"
                      className="text-xs h-7 w-full"
                      disabled={activeSession.documentIds.includes(selectedDocumentId)}
                    >
                      <PlusCircle size={12} className="mr-1" />
                      {activeSession.documentIds.includes(selectedDocumentId) 
                        ? "Document in session" 
                        : "Add current document"}
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="p-0 px-2 flex-1 overflow-hidden">
                <ScrollArea className="h-full pr-2">
                  {sessionDocuments.length > 0 ? (
                    <div className="space-y-2">
                      {sessionDocuments.map(doc => (
                        <div 
                          key={doc.id}
                          className="flex items-center justify-between group rounded-md p-1 hover:bg-muted"
                        >
                          <button 
                            className="text-xs truncate text-left flex-1"
                            onClick={() => {
                              useDocumentStore.getState().selectDocument(doc.id);
                            }}
                          >
                            <FileText size={12} className="inline mr-1 text-muted-foreground" />
                            {doc.name}
                          </button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveDocument(doc.id, activeSession.id)}
                            className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                            aria-label="Remove document"
                          >
                            <X size={12} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground text-xs">
                      No documents in this session yet
                    </div>
                  )}
                </ScrollArea>
              </div>
            </Card>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-2 p-2 text-center">
              <BookOpen size={32} className="text-muted-foreground" />
              <div>
                <h3 className="font-medium text-sm">No Active Session</h3>
                <p className="text-xs text-muted-foreground mt-1 mb-2">
                  Select a session to start collecting documents.
                </p>
                <Button 
                  onClick={() => setShowNewSessionDialog(true)} 
                  size="sm"
                  className="h-7 text-xs"
                >
                  <PlusCircle size={12} className="mr-1" />
                  New Session
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="all" className="flex-1 p-1 mt-1">
          <ScrollArea className="h-full px-0.5">
            {sessions.length > 0 ? (
              <div className="space-y-1.5">
                {sessions.map(session => (
                  <SessionCard 
                    key={session.id} 
                    session={session} 
                    isActive={session.id === activeSessionId}
                    onActivate={() => handleActivateSession(session.id)}
                    onDelete={() => deleteSession(session.id)}
                    documentCount={getSessionDocuments(session.id, documents).length}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-2 p-1 text-center">
                <Bookmark size={24} className="text-muted-foreground" />
                <div>
                  <h3 className="font-medium text-xs">No Sessions Yet</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 mb-1.5">
                    Create your first session.
                  </p>
                  <Button 
                    onClick={() => setShowNewSessionDialog(true)}
                    size="sm"
                    className="h-6 text-xs px-2"
                  >
                    <PlusCircle size={10} className="mr-1" />
                    New Session
                  </Button>
                </div>
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
      
      {/* Create New Session Dialog */}
      <Dialog open={showNewSessionDialog} onOpenChange={setShowNewSessionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Session</DialogTitle>
            <DialogDescription>
              A session helps you organize related documents for a specific project or task.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Session Name</Label>
              <Input
                id="name"
                placeholder="My Project Research"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                placeholder="Documents related to my current research"
                value={sessionDescription}
                onChange={(e) => setSessionDescription(e.target.value)}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="color">Color</Label>
              <div className="flex gap-2">
                {['#627BFF', '#FF6262', '#62FF8E', '#FFDE62', '#C262FF'].map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full ${sessionColor === color ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setSessionColor(color)}
                    aria-label={`Select color ${color}`}
                  />
                ))}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewSessionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSession}>
              Create Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Session card component for displaying individual sessions in the list
function SessionCard({ 
  session, 
  isActive, 
  onActivate, 
  onDelete,
  documentCount
}: { 
  session: DocumentSession; 
  isActive: boolean;
  onActivate: () => void;
  onDelete: () => void;
  documentCount: number;
}) {
  return (
    <Card className={`${isActive ? 'border-primary' : ''} overflow-hidden`}>
      <div className="p-1.5 pb-0.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 max-w-[70%]">
            <div 
              className="w-2 h-2 rounded-full flex-shrink-0" 
              style={{ backgroundColor: session.color || '#627BFF' }}
            />
            <h4 className="text-xs font-medium truncate">{session.name}</h4>
          </div>
          <div className="flex gap-0.5">
            {!isActive ? (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onActivate}
                aria-label="Activate session"
                className="h-5 w-5 p-0"
              >
                <Clock size={10} />
              </Button>
            ) : null}
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onDelete}
              aria-label="Delete session"
              className="h-5 w-5 p-0"
            >
              <X size={10} />
            </Button>
          </div>
        </div>
        
        {session.description ? (
          <p className="text-[10px] text-muted-foreground truncate mt-0.5">{session.description}</p>
        ) : null}
        
        <div className="flex items-center text-[10px] gap-1 flex-wrap mt-0.5">
          <div className="flex items-center">
            <FileText size={8} className="mr-0.5 text-muted-foreground" />
            <span>{documentCount}</span>
          </div>
          <span className="text-muted-foreground px-0.5">•</span>
          <span className="text-muted-foreground">
            {format(new Date(session.lastAccessed), 'MMM d')}
          </span>
        </div>
      </div>
      
      <div className="px-1.5 pb-1.5 pt-0.5">
        <Button 
          variant={isActive ? "secondary" : "default"} 
          size="sm" 
          className="w-full h-6 text-[10px] px-1"
          onClick={onActivate}
        >
          {isActive ? "Active" : "Activate"}
        </Button>
      </div>
    </Card>
  );
} 