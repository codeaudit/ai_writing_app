"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import DocumentNavigation from "@/components/document-navigation";
import AnnotationsNavigator from "@/components/annotations-navigator";
import MarkdownEditor from "@/components/markdown-editor";
import AIComposer from "@/components/ai-composer";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { PanelLeft, PanelRight, Maximize2, Minimize2, GripVertical, Settings, FileText, Palette, Info, ChevronRight, ChevronLeft, Sparkles, BookmarkIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { useRouter } from "next/navigation";
import { useDocumentStore, Annotation } from "@/lib/store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AboutSplash } from "@/components/about-splash";
import { useMediaQuery } from "@/hooks/use-media-query";

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

export default function Home() {
  // State for layout configuration
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>(defaultLayoutConfig);
  const [activeTab, setActiveTab] = useState("documents");
  const [showAboutSplash, setShowAboutSplash] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const editorRef = useRef<{ 
    compareDocuments: (doc1Id: string, doc2Id: string) => void;
    scrollToAnnotation?: (annotation: Annotation) => void;
  } | null>(null);
  const router = useRouter();
  const { loadData: loadDocuments, selectDocument } = useDocumentStore();
  
  // Media queries for responsive layout
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const isTablet = useMediaQuery("(min-width: 768px) and (max-width: 1023px)");
  const isMobile = useMediaQuery("(max-width: 767px)");

  // Handle client-side mounting
  useEffect(() => {
    setIsMounted(true);
  }, []);

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
    loadDocuments();
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

  return (
    <main className="flex flex-col h-screen overflow-hidden">
      {isMounted && <AboutSplash isOpen={showAboutSplash} onClose={() => setShowAboutSplash(false)} />}
      <header className="border-b p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleLeftPanel}
            title={layoutConfig.leftPanelVisible ? "Hide navigation (Alt+1)" : "Show navigation (Alt+1)"}
          >
            <PanelLeft className={cn("h-5 w-5", !layoutConfig.leftPanelVisible && "text-muted-foreground")} />
          </Button>
          <h1 className="text-2xl font-bold">A Pattern Language Editor</h1>
          {isFullscreen && (
            <span className="ml-2 text-sm text-muted-foreground bg-muted px-2 py-1 rounded-md">
              Fullscreen Mode
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/settings")}
            title="Configure AI settings"
          >
            <Settings className="h-5 w-5" />
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
                    </div>
                  ) : (
                    // Expanded view - show full navigation
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
                      <div className="flex items-center justify-between px-2">
                        <TabsList className="grid grid-cols-2 w-full">
                          <TabsTrigger value="documents" title="Documents (Alt+D)">
                            <FileText className="h-4 w-4 mr-2" />
                            Docs
                          </TabsTrigger>
                          <TabsTrigger value="annotations" title="Annotations (Alt+A)">
                            <BookmarkIcon className="h-4 w-4 mr-2" />
                            Notes
                          </TabsTrigger>
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
                          <DocumentNavigation onCompareDocuments={handleCompareDocuments} />
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
                    </Tabs>
                  )}
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle />
            </>
          )}
          
          {/* Middle Panel - Markdown Editor */}
          <ResizablePanel defaultSize={100 - (layoutConfig.leftPanelVisible ? effectiveLeftPanelSize : 0) - (layoutConfig.rightPanelVisible ? effectiveRightPanelSize : 0)}>
            <div className={cn(
              "p-4 h-full overflow-auto",
              isFullscreen && "px-8"
            )}>
              <MarkdownEditor ref={editorRef} />
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
                        title="AI Composer"
                      >
                        <Sparkles className="h-5 w-5" />
                      </Button>
                    </div>
                  ) : (
                    // Expanded view - show full AI composer
                    <div className="flex flex-col h-full">
                      <div className="flex items-center justify-between p-2 border-b">
                        <h3 className="font-medium">AI Composer</h3>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={toggleRightPanelCollapse}
                          title="Collapse panel"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="p-4 flex-1 overflow-auto">
                        <AIComposer />
                      </div>
                    </div>
                  )}
                </div>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
    </main>
  );
}
