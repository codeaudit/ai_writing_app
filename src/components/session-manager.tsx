'use client';

import { useState, useEffect } from 'react';
import { useDocumentStore } from '@/lib/store';
import { useSessionStore, DocumentSession } from '@/lib/session-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { PlusCircle, X, BookOpen, Bookmark, FileText, Clock, Settings, RefreshCw, AlertOctagon } from 'lucide-react';
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
    lastSyncTime
  } = useSessionStore();
  
  // Add navigation history
  const navigationHistory = useNavigationHistory();
  
  const [showNewSessionDialog, setShowNewSessionDialog] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [sessionDescription, setSessionDescription] = useState('');
  const [sessionColor, setSessionColor] = useState('#627BFF');
  
  // Load the sessions when the component mounts
  useEffect(() => {
    loadSessions().catch(error => {
      console.error('Error loading sessions:', error);
    });
  }, [loadSessions]);
  
  // Periodically check if sessions are in sync
  useEffect(() => {
    // Check sync status initially
    checkSync().catch(console.error);
    
    // Check every 30 seconds if sessions need to be synced
    const interval = setInterval(() => {
      checkSync().catch(console.error);
    }, 30000);
    
    return () => clearInterval(interval);
  }, [checkSync]);
  
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
      await refreshSessions();
      toast({
        title: "Sessions refreshed",
        description: "Sessions have been refreshed from the server."
      });
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
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <BookOpen size={18} />
          <span>Sessions</span>
          {lastSyncTime && (
            <span className="text-xs text-muted-foreground ml-2">
              Last synced: {format(new Date(lastSyncTime), 'HH:mm:ss')}
            </span>
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
                    className="text-yellow-500"
                    disabled={isLoading}
                  >
                    <AlertOctagon size={16} />
                  </Button>
                </TooltipTrigger>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {/* Refresh button */}
          <TooltipProvider>
            <Tooltip content="Refresh sessions from server">
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleRefreshSessions}
                  disabled={isLoading}
                  className={isLoading ? "animate-spin" : ""}
                >
                  <RefreshCw size={16} />
                </Button>
              </TooltipTrigger>
            </Tooltip>
          </TooltipProvider>
          
          {activeSessionId && selectedDocumentId && (
            <TooltipProvider>
              <Tooltip content="Add current document to this session">
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleAddCurrentDocument}
                    aria-label="Add current document to session"
                    disabled={!selectedDocumentId || !activeSessionId || 
                      (activeSession?.documentIds.includes(selectedDocumentId) ?? false) || 
                      isLoading}
                  >
                    <PlusCircle size={16} />
                  </Button>
                </TooltipTrigger>
              </Tooltip>
            </TooltipProvider>
          )}
          
          <TooltipProvider>
            <Tooltip content="Create new session">
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowNewSessionDialog(true)}
                  aria-label="Create new session"
                  disabled={isLoading}
                >
                  <Settings size={16} />
                </Button>
              </TooltipTrigger>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-500/10 text-red-500 p-2 text-xs">
          Error: {error}
          <Button 
            variant="link" 
            size="sm" 
            className="ml-2 p-0 h-auto text-xs text-red-500 hover:text-red-400"
            onClick={handleRepairSessions}
          >
            Try to repair
          </Button>
        </div>
      )}
      
      <Tabs defaultValue="active" className="flex-1 flex flex-col">
        <TabsList className="px-2 pt-2 pb-0 bg-transparent justify-start">
          <TabsTrigger value="active" className="data-[state=active]:bg-muted">Active</TabsTrigger>
          <TabsTrigger value="all" className="data-[state=active]:bg-muted">All Sessions</TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="flex-1 p-2">
          {activeSession ? (
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: activeSession.color || '#627BFF' }}
                    />
                    <CardTitle className="text-lg">{activeSession.name}</CardTitle>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setActiveSession(null)}
                    aria-label="Close session"
                  >
                    <X size={14} />
                  </Button>
                </div>
                {activeSession.description && (
                  <CardDescription>{activeSession.description}</CardDescription>
                )}
              </CardHeader>
              
              <CardContent className="flex-1 overflow-hidden">
                <ScrollArea className="h-full pr-4">
                  <h3 className="text-sm font-medium mb-2">Documents ({sessionDocuments.length})</h3>
                  
                  {sessionDocuments.length > 0 ? (
                    <ul className="space-y-2">
                      {sessionDocuments.map(doc => (
                        <li key={doc.id} className="flex items-center justify-between text-sm p-2 rounded bg-muted/50">
                          <span className="truncate flex-1">{doc.name}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveDocument(doc.id, activeSession.id)}
                            aria-label={`Remove ${doc.name} from session`}
                          >
                            <X size={14} />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No documents in this session yet.</p>
                  )}
                </ScrollArea>
              </CardContent>
              
              <CardFooter className="pt-2 text-xs text-muted-foreground flex justify-between">
                <span>Created {format(new Date(activeSession.created), 'MMM d, yyyy')}</span>
                <span>Last used {format(new Date(activeSession.lastAccessed), 'MMM d, yyyy')}</span>
              </CardFooter>
            </Card>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4 p-4 text-center">
              <BookOpen size={48} className="text-muted-foreground" />
              <div>
                <h3 className="font-medium">No Active Session</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  Select a session or create a new one to start collecting related documents.
                </p>
                <Button onClick={() => setShowNewSessionDialog(true)}>
                  <PlusCircle size={16} className="mr-2" />
                  New Session
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="all" className="flex-1 p-2">
          <ScrollArea className="h-full">
            {sessions.length > 0 ? (
              <div className="space-y-3">
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
              <div className="flex flex-col items-center justify-center h-full gap-4 p-4 text-center">
                <Bookmark size={48} className="text-muted-foreground" />
                <div>
                  <h3 className="font-medium">No Sessions Yet</h3>
                  <p className="text-sm text-muted-foreground mt-1 mb-4">
                    Create your first session to start organizing your documents.
                  </p>
                  <Button onClick={() => setShowNewSessionDialog(true)}>
                    <PlusCircle size={16} className="mr-2" />
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
    <Card className={`${isActive ? 'border-primary' : ''}`}>
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: session.color || '#627BFF' }}
            />
            <CardTitle className="text-sm font-medium truncate">{session.name}</CardTitle>
          </div>
          <div className="flex gap-1">
            {!isActive ? (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onActivate}
                aria-label="Activate session"
              >
                <Clock size={14} />
              </Button>
            ) : null}
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onDelete}
              aria-label="Delete session"
            >
              <X size={14} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 py-2">
        {session.description ? (
          <p className="text-xs text-muted-foreground mb-1 truncate">{session.description}</p>
        ) : null}
        <div className="flex items-center text-xs gap-2">
          <div className="flex items-center">
            <FileText size={12} className="mr-1 text-muted-foreground" />
            <span>{documentCount} document{documentCount !== 1 ? 's' : ''}</span>
          </div>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground">
            Last used {format(new Date(session.lastAccessed), 'MMM d')}
          </span>
        </div>
      </CardContent>
      <CardFooter className="p-3 pt-0">
        <Button 
          variant={isActive ? "secondary" : "default"} 
          size="sm" 
          className="w-full"
          onClick={onActivate}
        >
          {isActive ? "Active" : "Activate"}
        </Button>
      </CardFooter>
    </Card>
  );
} 