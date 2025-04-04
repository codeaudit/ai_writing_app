"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { DocumentNavigation } from "@/components/document-navigation";
import AnnotationsNavigator from "@/components/annotations-navigator";
import MarkdownEditor from "@/components/markdown-editor";
import AIComposer from "@/components/ai-composer";
import Compositions from "@/components/compositions";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { PanelLeft, PanelRight, Maximize2, Minimize2, FileText, Info, ChevronRight, ChevronLeft, Sparkles, BookmarkIcon, BookOpen, ArrowLeft, ArrowRight, Folder, ListPlus, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { useRouter } from "next/navigation";
import { useDocumentStore, Annotation } from "@/lib/store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AboutSplash } from "@/components/about-splash";
import { useMediaQuery } from "@/hooks/use-media-query";
import { DirectoryView } from "@/components/directory-view";
import { useNavigationHistory } from "@/lib/navigation-history";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import SessionManager from "@/components/session-manager";
import { ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import { useSessionStore } from '@/lib/session-store';
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip";

// Define layout constants
const LAYOUT_STORAGE_KEY = "editor-layout-config";
const DEFAULT_LEFT_PANEL_SIZE = 20; // 20% of available width
const DEFAULT_RIGHT_PANEL_SIZE = 25; // 25% of available width
const MIN_LEFT_PANEL_SIZE = 15;
const MIN_RIGHT_PANEL_SIZE = 20;
const MAX_LEFT_PANEL_SIZE = 30;
const MAX_RIGHT_PANEL_SIZE = 40;
const COLLAPSED_PANEL_SIZE = 5; // Size when collapsed to icon-only mode

// Define layout configuration interface
interface LayoutConfig {
  leftPanelVisible: boolean;
  rightPanelVisible: boolean;
  leftPanelSize: number;
  rightPanelSize: number;
  leftPanelCollapsed: boolean;
  rightPanelCollapsed: boolean;
}

// Default layout configuration
const defaultLayoutConfig: LayoutConfig = {
  leftPanelVisible: true,
  rightPanelVisible: true,
  leftPanelSize: DEFAULT_LEFT_PANEL_SIZE,
  rightPanelSize: DEFAULT_RIGHT_PANEL_SIZE,
  leftPanelCollapsed: false,
  rightPanelCollapsed: false,
};

const Home = () => {
  // Initialize state
  const [activeTab, setActiveTab] = useState("documents");
  
  // State for layout configuration
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>(defaultLayoutConfig);
  
  const [showAboutSplash, setShowAboutSplash] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [isDirectoryView, setIsDirectoryView] = useState(false);
  const editorRef = useRef<{ 
    compareDocuments: (doc1Id: string, doc2Id: string) => void;
    scrollToAnnotation?: (annotation: Annotation) => void;
  } | null>(null);
  const router = useRouter();
  const { loadData: loadDocuments, selectDocument, documents, folders } = useDocumentStore();
  
  // Media queries for responsive layout
  const isTablet = useMediaQuery("(min-width: 768px) and (max-width: 1023px)");
  const isMobile = useMediaQuery("(max-width: 767px)");

  // Inside the Home component, add a state for the right panel
  const [rightPanelTab, setRightPanelTab] = useState("ai");
  
  // AIComposer state reference - will be preserved even when component is not visible
  const [aiComposerMounted, setAiComposerMounted] = useState(false);

  // Add navigation history hook
  const { 
    addToHistory, 
    canGoBack, 
    canGoForward, 
    goBack, 
    goForward,
    history,
    currentIndex
  } = useNavigationHistory();

  // Handle client-side mounting
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Listen for the switchToAIComposer event
  useEffect(() => {
    if (!isMounted) return;
    
    const handleSwitchToAIComposer = () => {
      // Switch to the AI tab
      setRightPanelTab("ai");
      
      // Make sure the right panel is visible
      setLayoutConfig(prev => ({
        ...prev,
        rightPanelVisible: true,
        rightPanelCollapsed: false,
      }));
    };
    
    window.addEventListener('switchToAIComposer', handleSwitchToAIComposer);
    
    return () => {
      window.removeEventListener('switchToAIComposer', handleSwitchToAIComposer);
    };
  }, [isMounted]);

  // Check URL for document ID on page load
  useEffect(() => {
    if (!isMounted) return;
    
    // Get the current path from the window location
    const path = window.location.pathname;
    const match = path.match(/\/documents\/([^\/]+)/);
    
    if (match && match[1]) {
      const documentId = match[1];
      // Check if this document exists in our store
      const documentExists = documents.some(doc => doc.id === documentId);
      
      if (documentExists) {
        // Select the document from the URL
        selectDocument(documentId);
        // Show the documents tab
        setActiveTab("documents");
      } else {
        // If document doesn't exist, redirect to home
        router.push('/');
      }
    }
  }, [isMounted, documents, selectDocument, router]);

  // Load layout configuration from localStorage
  useEffect(() => {
    if (isMounted) {
      try {
        const savedLayout = localStorage.getItem(LAYOUT_STORAGE_KEY);
        if (savedLayout) {
          const parsedLayout = JSON.parse(savedLayout) as LayoutConfig;
          setLayoutConfig(parsedLayout);
        }
      } catch (error) {
        console.error("Error loading layout configuration:", error);
      }
    }
  }, [isMounted]);

  // Save layout configuration to localStorage when it changes
  useEffect(() => {
    if (isMounted) {
      try {
        localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layoutConfig));
      } catch (error) {
        console.error("Error saving layout configuration:", error);
      }
    }
  }, [layoutConfig, isMounted]);

  // Adjust layout for different screen sizes
  useEffect(() => {
    if (!isMounted) return;

    if (isMobile) {
      // On mobile, hide both side panels by default
      setLayoutConfig(prev => ({
        ...prev,
        leftPanelVisible: false,
        rightPanelVisible: false,
      }));
    } else if (isTablet) {
      // On tablet, collapse both panels to icon mode
      setLayoutConfig(prev => ({
        ...prev,
        leftPanelVisible: true,
        rightPanelVisible: true,
        leftPanelCollapsed: true,
        rightPanelCollapsed: true,
      }));
    }
  }, [isMobile, isTablet, isMounted]);

  // Load data from server when the app starts
  useEffect(() => {
    const initializeApp = async () => {
      // Initialize the API and sessions
      try {
        console.log("Initializing application...");
        const initResponse = await fetch('/api/initialize');
        
        if (initResponse.ok) {
          const data = await initResponse.json();
          console.log("Initialization response:", data);
        } else {
          console.error("Failed to initialize application:", initResponse.statusText);
        }
      } catch (error) {
        console.error("Error during initialization:", error);
      }

      // Load documents
      await loadDocuments();
      
      // Load sessions
      try {
        await useSessionStore.getState().loadSessions();
        console.log("Sessions loaded successfully");
        
        // Schedule periodic session sync check
        setInterval(() => {
          useSessionStore.getState().checkSync().catch(err => {
            console.error("Error checking session sync:", err);
          });
        }, 60000); // Check every minute
      } catch (error) {
        console.error("Error loading sessions:", error);
      }
      
      // Check if the trash folder exists, and create it if it doesn't
      const folders = useDocumentStore.getState().folders;
      const existingTrashFolder = folders.find(folder => 
        folder.name === "Trash" && (folder.parentId === "/" || folder.parentId === null)
      );
      
      if (!existingTrashFolder) {
        console.log("Creating trash folder on app startup...");
        try {
          await useDocumentStore.getState().addFolder("Trash", null);
          console.log("Trash folder created successfully on startup");
        } catch (error) {
          console.error("Failed to create trash folder on startup:", error);
        }
      } else {
        console.log("Trash folder already exists, skipping creation");
      }
    };
    
    initializeApp();
  }, [loadDocuments]);

  // Check if user has visited before - only run on client side
  useEffect(() => {
    if (isMounted) {
      const hasVisitedBefore = localStorage.getItem('hasVisitedBefore');
      
      // If they've visited before, don't show the splash screen
      if (hasVisitedBefore === 'true') {
        setShowAboutSplash(false);
      } else {
        // If this is their first visit, show splash and set the flag
        setShowAboutSplash(true);
        localStorage.setItem('hasVisitedBefore', 'true');
      }
    }
  }, [isMounted]);

  // Watch for changes to selectedDocumentId and update URL
  const selectedDocumentId = useDocumentStore(state => state.selectedDocumentId);
  
  useEffect(() => {
    if (!isMounted || !documents.length) return;
    
    if (selectedDocumentId) {
      // Update URL to reflect the selected document without triggering a navigation
      window.history.replaceState(null, '', `/documents/${selectedDocumentId}`);
    } else {
      // If no document is selected, reset URL to home
      window.history.replaceState(null, '', '/');
    }
  }, [isMounted, documents, selectedDocumentId]);

  // Listen for session activation to update UI
  useEffect(() => {
    const unsubscribe = useSessionStore.subscribe((state) => {
      const activeSessionId = state.activeSessionId;
      if (activeSessionId) {
        // If a session is activated, we need to update our local state
        // to reflect the new navigation history
        const history = useNavigationHistory.getState().history;
        if (history.length > 0) {
          const firstItem = history[0];
          // Update selected path and view
          setSelectedPath(firstItem.path);
          setIsDirectoryView(firstItem.isDirectory);
          
          // If it's a document, select it
          if (!firstItem.isDirectory) {
            selectDocument(firstItem.path);
            // Update URL
            window.history.replaceState(null, '', `/documents/${firstItem.path}`);
          }
        }
      }
    });
    
    return () => unsubscribe();
  }, [selectDocument]);

  // Layout management functions
  const toggleLeftPanel = useCallback(() => {
    setLayoutConfig(prev => ({
      ...prev,
      leftPanelVisible: !prev.leftPanelVisible,
      // Reset collapsed state when showing the panel again
      leftPanelCollapsed: prev.leftPanelVisible ? false : prev.leftPanelCollapsed,
    }));
  }, []);

  const toggleRightPanel = useCallback(() => {
    setLayoutConfig(prev => ({
      ...prev,
      rightPanelVisible: !prev.rightPanelVisible,
      // Reset collapsed state when showing the panel again
      rightPanelCollapsed: prev.rightPanelVisible ? false : prev.rightPanelCollapsed,
    }));
  }, []);

  const toggleLeftPanelCollapse = useCallback(() => {
    setLayoutConfig(prev => ({
      ...prev,
      leftPanelCollapsed: !prev.leftPanelCollapsed,
    }));
  }, []);

  const toggleRightPanelCollapse = useCallback(() => {
    setLayoutConfig(prev => ({
      ...prev,
      rightPanelCollapsed: !prev.rightPanelCollapsed,
    }));
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!layoutConfig.leftPanelVisible && !layoutConfig.rightPanelVisible) {
      // If already in fullscreen, restore previous state
      setLayoutConfig(prev => ({
        ...prev,
        leftPanelVisible: true,
        rightPanelVisible: true,
      }));
    } else {
      // Otherwise, hide both panels
      setLayoutConfig(prev => ({
        ...prev,
        leftPanelVisible: false,
        rightPanelVisible: false,
      }));
    }
  }, [layoutConfig]);

  const handleLeftPanelResize = useCallback((size: number) => {
    setLayoutConfig(prev => ({
      ...prev,
      leftPanelSize: size,
      // If panel is resized to be very small, automatically collapse it
      leftPanelCollapsed: size < MIN_LEFT_PANEL_SIZE / 2,
    }));
  }, []);

  const handleRightPanelResize = useCallback((size: number) => {
    setLayoutConfig(prev => ({
      ...prev,
      rightPanelSize: size,
      // If panel is resized to be very small, automatically collapse it
      rightPanelCollapsed: size < MIN_RIGHT_PANEL_SIZE / 2,
    }));
  }, []);

  const handleCompareDocuments = useCallback((doc1Id: string, doc2Id: string) => {
    if (editorRef.current) {
      editorRef.current.compareDocuments(doc1Id, doc2Id);
    }
  }, []);

  // Add keyboard shortcuts for toggling panels
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt+1 to toggle left panel
      if (e.altKey && e.key === '1') {
        toggleLeftPanel();
      }
      // Alt+2 to toggle right panel
      if (e.altKey && e.key === '2') {
        toggleRightPanel();
      }
      // Alt+3 to toggle both panels
      if (e.altKey && e.key === '3') {
        toggleFullscreen();
      }
      // Alt+0 to show both panels
      if (e.altKey && e.key === '0') {
        setLayoutConfig(prev => ({
          ...prev,
          leftPanelVisible: true,
          rightPanelVisible: true,
          leftPanelCollapsed: false,
          rightPanelCollapsed: false,
        }));
      }
      // Alt+F to toggle fullscreen mode
      if (e.altKey && e.key === 'f') {
        toggleFullscreen();
      }
      // Alt+D to switch to Documents tab
      if (e.altKey && e.key === 'd') {
        setActiveTab("documents");
      }
      // Alt+A to switch to Annotations tab
      if (e.altKey && e.key === 'a') {
        setActiveTab("annotations");
      }
    };

    if (isMounted) {
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isMounted, toggleLeftPanel, toggleRightPanel, toggleFullscreen]);

  const isFullscreen = !layoutConfig.leftPanelVisible && !layoutConfig.rightPanelVisible;

  // Calculate effective panel sizes
  const effectiveLeftPanelSize = layoutConfig.leftPanelCollapsed 
    ? COLLAPSED_PANEL_SIZE 
    : layoutConfig.leftPanelSize;
  
  const effectiveRightPanelSize = layoutConfig.rightPanelCollapsed 
    ? COLLAPSED_PANEL_SIZE 
    : layoutConfig.rightPanelSize;

  // Update the file select handler to pass name to history
  const handleFileSelect = useCallback((path: string, isDirectory: boolean) => {
    setSelectedPath(path);
    setIsDirectoryView(isDirectory);
    
    // Get name for the item
    let itemName: string | undefined;
    if (isDirectory) {
      const folder = folders.find(f => f.id === path);
      itemName = folder?.name;
    } else {
      const doc = documents.find(d => d.id === path);
      itemName = doc?.name;
    }
    
    // Add to navigation history with name
    addToHistory(path, isDirectory, itemName);
  }, [addToHistory, folders, documents]);

  // Update the navigation functions to add the current item to the active session
  const handleNavigateBack = useCallback(() => {
    const prevItem = goBack();
    if (prevItem) {
      setSelectedPath(prevItem.path);
      setIsDirectoryView(prevItem.isDirectory);
      
      // If it's a document, ensure it's selected in the store and UI
      if (!prevItem.isDirectory) {
        selectDocument(prevItem.path);
        
        // Update URL without a full page refresh
        window.history.replaceState(null, '', `/documents/${prevItem.path}`);
        
        // Add this document to the active session if one exists
        const { activeSessionId, addDocumentToSession } = useSessionStore.getState();
        if (activeSessionId) {
          // Only add if it's a document (not a folder)
          addDocumentToSession(activeSessionId, prevItem.path)
            .then(() => console.log(`Added document ${prevItem.name || prevItem.path} to active session`))
            .catch(err => console.error('Failed to add document to session:', err));
        }
      } else {
        // If it's a directory, deselect any selected document
        selectDocument(null);
        
        // Update URL without a full page refresh
        window.history.replaceState(null, '', '/');
      }
    }
  }, [goBack, selectDocument]);

  const handleNavigateForward = useCallback(() => {
    const nextItem = goForward();
    if (nextItem) {
      setSelectedPath(nextItem.path);
      setIsDirectoryView(nextItem.isDirectory);
      
      // If it's a document, ensure it's selected in the store and UI
      if (!nextItem.isDirectory) {
        selectDocument(nextItem.path);
        
        // Update URL without a full page refresh
        window.history.replaceState(null, '', `/documents/${nextItem.path}`);
        
        // Add this document to the active session if one exists
        const { activeSessionId, addDocumentToSession } = useSessionStore.getState();
        if (activeSessionId) {
          // Only add if it's a document (not a folder)
          addDocumentToSession(activeSessionId, nextItem.path)
            .then(() => console.log(`Added document ${nextItem.name || nextItem.path} to active session`))
            .catch(err => console.error('Failed to add document to session:', err));
        }
      } else {
        // If it's a directory, deselect any selected document
        selectDocument(null);
        
        // Update URL without a full page refresh
        window.history.replaceState(null, '', '/');
      }
    }
  }, [goForward, selectDocument]);

  // Update the direct navigation from dropdown also
  const handleDirectNavigate = useCallback((targetIndex: number) => {
    // Update currentIndex directly
    const targetItem = history[targetIndex];
    setSelectedPath(targetItem.path);
    setIsDirectoryView(targetItem.isDirectory);
    
    // Select the document or folder
    if (!targetItem.isDirectory) {
      selectDocument(targetItem.path);
      window.history.replaceState(null, "", `/documents/${targetItem.path}`);
      
      // Add this document to the active session if one exists
      const { activeSessionId, addDocumentToSession } = useSessionStore.getState();
      if (activeSessionId) {
        // Only add if it's a document (not a folder)
        addDocumentToSession(activeSessionId, targetItem.path)
          .then(() => console.log(`Added document ${targetItem.name || targetItem.path} to active session`))
          .catch(err => console.error('Failed to add document to session:', err));
      }
    } else {
      selectDocument(null);
      window.history.replaceState(null, "", "/");
    }
    
    // Update the navigation history state
    useNavigationHistory.setState({ currentIndex: targetIndex });
  }, [history, selectDocument]);

  // Create getNameFromPath function before using it
  // Helper to get display name from path with proper types
  const getNameFromPath = useCallback((path: string, isDirectory: boolean) => {
    if (isDirectory) {
      // Find folder by id
      const folder = folders.find((f: { id: string }) => f.id === path);
      return folder ? folder.name : "Unknown folder";
    } else {
      // Find document by id
      const document = documents.find((d: { id: string }) => d.id === path);
      return document ? document.name : "Unknown document";
    }
  }, [folders, documents]);

  return (
    <div className="relative flex h-screen">
      <main className="flex flex-col h-screen overflow-hidden w-full">
        {isMounted && <AboutSplash isOpen={showAboutSplash} onClose={() => setShowAboutSplash(false)} />}
        
        {/* Always mount AIComposer but keep it hidden when not visible */}
        {isMounted && !aiComposerMounted && (
          <div className="hidden">
            <AIComposer />
          </div>
        )}
        
        <header className="border-b p-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleLeftPanel}
              title={layoutConfig.leftPanelVisible ? "Hide navigation (Alt+1)" : "Show navigation (Alt+1)"}
            >
              <PanelLeft className={cn("h-5 w-5", !layoutConfig.leftPanelVisible && "text-muted-foreground")} />
            </Button>
            <h1 className="text-lg font-semibold">The AI Whisperer&apos;s Toolbox</h1>
            {isFullscreen && (
              <span className="ml-2 text-sm text-muted-foreground bg-muted px-2 py-1 rounded-md">
                Fullscreen Mode
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleNavigateBack}
                  disabled={!canGoBack()}
                  title="Navigate back"
                >
                  <ArrowLeft className={cn("h-5 w-5", !canGoBack() && "text-muted-foreground")} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                {history.slice(0, currentIndex).reverse().map((item, index) => (
                  <DropdownMenuItem 
                    key={`back-${index}`}
                    onClick={() => handleDirectNavigate(currentIndex - index - 1)}
                    className="flex items-center gap-2"
                  >
                    {item.isDirectory ? (
                      <Folder className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <FileText className="h-4 w-4 text-blue-500" />
                    )}
                    <span className="truncate">{item.name || getNameFromPath(item.path, item.isDirectory)}</span>
                  </DropdownMenuItem>
                ))}
                {!canGoBack() && (
                  <DropdownMenuItem disabled>No previous items</DropdownMenuItem>
                )}
                {canGoBack() && (
                  <DropdownMenuItem 
                    onClick={() => {
                      // Create a new session from the navigation history
                      const { createSession } = useSessionStore.getState();
                      // Get only document items from history (not directories)
                      const docItems = history.filter(item => !item.isDirectory);
                      
                      if (docItems.length > 0) {
                        // Extract unique document IDs
                        const uniqueDocIds = Array.from(new Set(docItems.map(item => item.path)));
                        
                        // Create a session with a timestamp
                        const date = new Date();
                        const sessionName = `History Session ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
                        
                        createSession(
                          sessionName,
                          `Session created from navigation history on ${date.toLocaleString()}`,
                          uniqueDocIds,
                          "#627BFF" // Default blue color
                        )
                          .then((sessionId) => {
                            console.log(`Created new session ${sessionId} with ${uniqueDocIds.length} documents`);
                            // Switch to Sessions tab to show the new session
                            setActiveTab("sessions");
                          })
                          .catch(err => console.error('Failed to create session from history:', err));
                      }
                    }}
                    className="flex items-center gap-2 border-t mt-2 pt-2"
                  >
                    <ListPlus className="h-4 w-4 text-green-500" />
                    <span>Create session from history</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleNavigateForward}
                  disabled={!canGoForward()}
                  title="Navigate forward"
                >
                  <ArrowRight className={cn("h-5 w-5", !canGoForward() && "text-muted-foreground")} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                {history.slice(currentIndex + 1).map((item, index) => (
                  <DropdownMenuItem 
                    key={`forward-${index}`}
                    onClick={() => handleDirectNavigate(currentIndex + index + 1)}
                    className="flex items-center gap-2"
                  >
                    {item.isDirectory ? (
                      <Folder className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <FileText className="h-4 w-4 text-blue-500" />
                    )}
                    <span className="truncate">{item.name || getNameFromPath(item.path, item.isDirectory)}</span>
                  </DropdownMenuItem>
                ))}
                {!canGoForward() && (
                  <DropdownMenuItem disabled>No forward items</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowAboutSplash(true)}
              title="About"
            >
              <Info className="h-5 w-5" />
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => router.push('/settings')}
              title="Settings"
            >
              <Settings className="h-5 w-5" />
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit fullscreen mode (Alt+F)" : "Enter fullscreen mode (Alt+F)"}
            >
              {isFullscreen ? (
                <Minimize2 className="h-5 w-5" />
              ) : (
                <Maximize2 className="h-5 w-5" />
              )}
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleRightPanel}
              title={layoutConfig.rightPanelVisible ? "Hide AI composer (Alt+2)" : "Show AI composer (Alt+2)"}
            >
              <PanelRight className={cn("h-5 w-5", !layoutConfig.rightPanelVisible && "text-muted-foreground")} />
            </Button>
            
            <ThemeToggle />
          </div>
        </header>
        
        <div className="flex flex-1 h-full overflow-hidden">
          {/* Main Content Area with Resizable Panels */}
          <ResizablePanelGroup direction="horizontal" className="h-full w-full">
            {/* Left Panel - Navigation */}
            {layoutConfig.leftPanelVisible && (
              <>
                <ResizablePanel 
                  defaultSize={effectiveLeftPanelSize}
                  minSize={layoutConfig.leftPanelCollapsed ? COLLAPSED_PANEL_SIZE : MIN_LEFT_PANEL_SIZE}
                  maxSize={layoutConfig.leftPanelCollapsed ? COLLAPSED_PANEL_SIZE : MAX_LEFT_PANEL_SIZE}
                  onResize={handleLeftPanelResize}
                  className={cn(
                    "border-r transition-all duration-300 ease-in-out",
                    layoutConfig.leftPanelCollapsed && "overflow-hidden"
                  )}
                >
                  <div className={cn(
                    "h-full flex flex-col",
                    layoutConfig.leftPanelCollapsed ? "items-center py-4" : ""
                  )}>
                    {layoutConfig.leftPanelCollapsed ? (
                      // Collapsed view - show only icons
                      <div className="flex flex-col items-center gap-4">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={toggleLeftPanelCollapse}
                          title="Expand panel"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className={cn(activeTab === "documents" && "bg-secondary")}
                          onClick={() => setActiveTab("documents")}
                          title="Documents"
                        >
                          <FileText className="h-5 w-5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className={cn(activeTab === "annotations" && "bg-secondary")}
                          onClick={() => setActiveTab("annotations")}
                          title="Annotations"
                        >
                          <BookmarkIcon className="h-5 w-5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className={cn(activeTab === "sessions" && "bg-secondary")}
                          onClick={() => setActiveTab("sessions")}
                          title="Sessions"
                        >
                          <BookOpen className="h-5 w-5" />
                        </Button>
                      </div>
                    ) : (
                      // Expanded view - show full navigation
                      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
                        <div className="flex items-center justify-between px-2">
                          <TabsList className="grid grid-cols-3 w-full">
                            <TooltipProvider>
                              <Tooltip content="Documents (Alt+D)">
                                <TabsTrigger value="documents" className="flex items-center justify-center">
                                  <FileText className="h-5 w-5" />
                                </TabsTrigger>
                              </Tooltip>
                            </TooltipProvider>
                            
                            <TooltipProvider>
                              <Tooltip content="Annotations (Alt+A)">
                                <TabsTrigger value="annotations" className="flex items-center justify-center">
                                  <BookmarkIcon className="h-5 w-5" />
                                </TabsTrigger>
                              </Tooltip>
                            </TooltipProvider>
                            
                            <TooltipProvider>
                              <Tooltip content="Sessions">
                                <TabsTrigger value="sessions" className="flex items-center justify-center">
                                  <BookOpen className="h-5 w-5" />
                                </TabsTrigger>
                              </Tooltip>
                            </TooltipProvider>
                          </TabsList>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={toggleLeftPanelCollapse}
                            title="Collapse panel"
                            className="ml-2"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                        </div>
                        <TabsContent value="documents" className="p-0 h-[calc(100%-40px)]">
                          <div className="p-4 h-full flex flex-col overflow-auto">
                            <DocumentNavigation
                              onCompareDocuments={handleCompareDocuments}
                              onFileSelect={handleFileSelect}
                            />
                          </div>
                        </TabsContent>
                        <TabsContent value="annotations" className="p-0 h-[calc(100%-40px)]">
                          <div className="p-4 h-full flex flex-col overflow-auto">
                            <AnnotationsNavigator onNavigateToAnnotation={(documentId, annotation) => {
                              selectDocument(documentId);
                              // Use the scrollToAnnotation method if available
                              if (editorRef.current && editorRef.current.scrollToAnnotation) {
                                editorRef.current.scrollToAnnotation(annotation);
                              }
                            }} />
                          </div>
                        </TabsContent>
                        <TabsContent value="sessions" className="p-0 h-[calc(100%-40px)]">
                          <div className="p-4 h-full flex flex-col overflow-auto">
                            <SessionManager />
                          </div>
                        </TabsContent>
                      </Tabs>
                    )}
                  </div>
                </ResizablePanel>
                <ResizableHandle withHandle />
              </>
            )}
            
            {/* Middle Panel - Markdown Editor or Directory View */}
            <ResizablePanel defaultSize={100 - (layoutConfig.leftPanelVisible ? effectiveLeftPanelSize : 0) - (layoutConfig.rightPanelVisible ? effectiveRightPanelSize : 0)}>
              <div className={cn(
                "p-4 h-full overflow-auto",
                isFullscreen && "px-8"
              )}>
                {isDirectoryView ? (
                  <DirectoryView 
                    path={selectedPath || ''} 
                    onFileSelect={handleFileSelect}
                    onCompareDocuments={handleCompareDocuments}
                  />
                ) : (
                  <MarkdownEditor ref={editorRef} />
                )}
              </div>
            </ResizablePanel>
            
            {/* Right Panel - AI Composer */}
            {layoutConfig.rightPanelVisible && (
              <>
                <ResizableHandle withHandle />
                <ResizablePanel 
                  defaultSize={effectiveRightPanelSize}
                  minSize={layoutConfig.rightPanelCollapsed ? COLLAPSED_PANEL_SIZE : MIN_RIGHT_PANEL_SIZE}
                  maxSize={layoutConfig.rightPanelCollapsed ? COLLAPSED_PANEL_SIZE : MAX_RIGHT_PANEL_SIZE}
                  onResize={handleRightPanelResize}
                  className={cn(
                    "border-l transition-all duration-300 ease-in-out",
                    layoutConfig.rightPanelCollapsed && "overflow-hidden"
                  )}
                >
                  <div className={cn(
                    "h-full flex flex-col",
                    layoutConfig.rightPanelCollapsed ? "items-center py-4" : ""
                  )}>
                    {layoutConfig.rightPanelCollapsed ? (
                      // Collapsed view - show only icons
                      <div className="flex flex-col items-center gap-4">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={toggleRightPanelCollapse}
                          title="Expand panel"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className={cn(rightPanelTab === "ai" && "bg-secondary")}
                          onClick={() => setRightPanelTab("ai")}
                          title="AI Composer"
                        >
                          <Sparkles className="h-5 w-5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className={cn(rightPanelTab === "compositions" && "bg-secondary")}
                          onClick={() => setRightPanelTab("compositions")}
                          title="Compositions"
                        >
                          <BookOpen className="h-5 w-5" />
                        </Button>
                      </div>
                    ) : (
                      // Expanded view - show full AI composer with tabs
                      <div className="flex flex-col h-full">
                        <Tabs value={rightPanelTab} onValueChange={setRightPanelTab} className="h-full flex flex-col">
                          <div className="flex items-center justify-between p-2 border-b">
                            <TabsList className="grid grid-cols-2 w-full">
                              <TabsTrigger value="ai" title="AI Composer">
                                <Sparkles className="h-4 w-4 mr-2" />
                                AI Composer
                              </TabsTrigger>
                              <TabsTrigger value="compositions" title="Compositions">
                                <BookOpen className="h-4 w-4 mr-2" />
                                Compositions
                              </TabsTrigger>
                            </TabsList>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={toggleRightPanelCollapse}
                              title="Collapse panel"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                          <TabsContent value="ai" className="p-0 flex-1 overflow-hidden">
                            <div className="p-4 h-full overflow-auto">
                              <AIComposer key="aiComposer" onMount={() => setAiComposerMounted(true)} />
                            </div>
                          </TabsContent>
                          <TabsContent value="compositions" className="p-0 flex-1 overflow-hidden">
                            <div className="p-4 h-full overflow-auto">
                              <Compositions />
                            </div>
                          </TabsContent>
                        </Tabs>
                      </div>
                    )}
                  </div>
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        </div>
      </main>
      
      <ToastContainer 
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
    </div>
  );
};

export default Home;
