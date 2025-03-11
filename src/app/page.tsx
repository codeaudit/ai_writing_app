"use client";

import { useState, useEffect, useRef } from "react";
import DocumentNavigation from "@/components/document-navigation";
import PatternNavigation from "@/components/pattern-navigation";
import MarkdownEditor from "@/components/markdown-editor";
import AIComposer from "@/components/ai-composer";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { PanelLeft, PanelRight, Maximize2, Minimize2, GripVertical, Settings, FileText, Palette, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { useRouter } from "next/navigation";
import { useDocumentStore } from "@/lib/store";
import { usePatternStore } from "@/lib/pattern-store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AboutSplash } from "@/components/about-splash";

export default function Home() {
  const [leftPanelVisible, setLeftPanelVisible] = useState(true);
  const [rightPanelVisible, setRightPanelVisible] = useState(true);
  const [rightPanelSize, setRightPanelSize] = useState(25); // Default 25% width
  const [activeTab, setActiveTab] = useState("documents");
  const [showAboutSplash, setShowAboutSplash] = useState(true); // Default to true to show on startup
  const [isMounted, setIsMounted] = useState(false);
  const editorRef = useRef<{ compareDocuments: (doc1Id: string, doc2Id: string) => void } | null>(null);
  const router = useRouter();
  const { loadData: loadDocuments } = useDocumentStore();
  const { loadData: loadPatterns } = usePatternStore();

  // Handle client-side mounting
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load data from server when the app starts
  useEffect(() => {
    loadDocuments();
    loadPatterns();
  }, [loadDocuments, loadPatterns]);

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

  const toggleLeftPanel = () => {
    setLeftPanelVisible(!leftPanelVisible);
  };

  const toggleRightPanel = () => {
    setRightPanelVisible(!rightPanelVisible);
  };

  const toggleFullscreen = () => {
    if (!leftPanelVisible && !rightPanelVisible) {
      // If already in fullscreen, show both panels
      setLeftPanelVisible(true);
      setRightPanelVisible(true);
    } else {
      // Otherwise, hide both panels
      setLeftPanelVisible(false);
      setRightPanelVisible(false);
    }
  };

  const handleCompareDocuments = (doc1Id: string, doc2Id: string) => {
    if (editorRef.current) {
      editorRef.current.compareDocuments(doc1Id, doc2Id);
    }
  };

  const handleComparePatterns = (pattern1Id: string, pattern2Id: string) => {
    if (editorRef.current) {
      editorRef.current.compareDocuments(pattern1Id, pattern2Id);
    }
  };

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
        setLeftPanelVisible(true);
        setRightPanelVisible(true);
      }
      // Alt+F to toggle fullscreen mode
      if (e.altKey && e.key === 'f') {
        toggleFullscreen();
      }
      // Alt+D to switch to Documents tab
      if (e.altKey && e.key === 'd') {
        setActiveTab("documents");
      }
      // Alt+P to switch to Patterns tab
      if (e.altKey && e.key === 'p') {
        setActiveTab("patterns");
      }
    };

    if (isMounted) {
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [leftPanelVisible, rightPanelVisible, isMounted]);

  const isFullscreen = !leftPanelVisible && !rightPanelVisible;

  return (
    <main className="flex flex-col h-screen overflow-hidden">
      {isMounted && <AboutSplash isOpen={showAboutSplash} onClose={() => setShowAboutSplash(false)} />}
      <header className="border-b p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleLeftPanel}
            title={leftPanelVisible ? "Hide navigation (Alt+1)" : "Show navigation (Alt+1)"}
          >
            <PanelLeft className={cn("h-5 w-5", !leftPanelVisible && "text-muted-foreground")} />
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
            title={rightPanelVisible ? "Hide AI composer (Alt+2)" : "Show AI composer (Alt+2)"}
          >
            <PanelRight className={cn("h-5 w-5", !rightPanelVisible && "text-muted-foreground")} />
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
        {/* Left Panel - Navigation (Fixed Width) */}
        {leftPanelVisible && (
          <div className="w-64 border-r h-full">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="documents" title="Documents (Alt+D)">
                  <FileText className="h-4 w-4 mr-2" />
                  Docs
                </TabsTrigger>
                <TabsTrigger value="patterns" title="Patterns (Alt+P)">
                  <Palette className="h-4 w-4 mr-2" />
                  Patterns
                </TabsTrigger>
              </TabsList>
              <TabsContent value="documents" className="p-0 h-[calc(100%-40px)]">
                <div className="p-4 h-full flex flex-col overflow-auto">
                  <DocumentNavigation onCompareDocuments={handleCompareDocuments} />
                </div>
              </TabsContent>
              <TabsContent value="patterns" className="p-0 h-[calc(100%-40px)]">
                <div className="p-4 h-full flex flex-col overflow-auto">
                  <PatternNavigation onComparePatterns={handleComparePatterns} />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
        
        {/* Main Content Area with Resizable Panels */}
        <div className="flex-1 h-full">
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {/* Middle Panel - Markdown Editor */}
            <ResizablePanel 
              defaultSize={rightPanelVisible ? 100 - rightPanelSize : 100}
            >
              <div className={cn(
                "p-4 h-full overflow-auto",
                isFullscreen && "px-8"
              )}>
                <MarkdownEditor ref={editorRef} />
              </div>
            </ResizablePanel>
            
            {/* Right Panel - AI Composer */}
            {rightPanelVisible && (
              <>
                <ResizableHandle />
                <ResizablePanel 
                  defaultSize={rightPanelSize} 
                  minSize={20} 
                  maxSize={40}
                  onResize={setRightPanelSize}
                  className="border-l"
                >
                  <div className="p-4 h-full flex flex-col overflow-auto">
                    <AIComposer />
                  </div>
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        </div>
      </div>
    </main>
  );
}
