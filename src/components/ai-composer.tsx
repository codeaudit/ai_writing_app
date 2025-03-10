"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { SendHorizontal, Settings, Sparkles, RefreshCw, Copy, Check, Wand2 } from "lucide-react";
import { useDocumentStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AIComposerProps {}

export default function AIComposer({}: AIComposerProps) {
  const router = useRouter();
  const { documents, selectedDocumentId, updateDocument } = useDocumentStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: "welcome",
      role: "assistant", 
      content: "Hello! I'm your AI writing assistant. How can I help you with your document today?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState<string | null>(null);

  // Get the selected document
  const selectedDocument = documents.find(doc => doc.id === selectedDocumentId);

  // Scroll to bottom of messages when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const generateId = () => `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  const handleSendMessage = async () => {
    if (!input.trim() || !selectedDocumentId) return;
    
    // Add user message to chat
    const userMessageId = generateId();
    const userMessage: Message = { 
      id: userMessageId,
      role: "user", 
      content: input,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    
    // Simulate AI response with a delay
    setTimeout(() => {
      generateAIResponse(userMessage.content);
    }, 1000);
  };

  const generateAIResponse = (userMessage: string) => {
    // Simple response generation based on user input
    let responseContent = "";
    
    if (userMessage.toLowerCase().includes("help") || userMessage.toLowerCase().includes("how")) {
      responseContent = "I can help you with writing, editing, and brainstorming. Try asking me to:\n\n- Summarize your document\n- Generate ideas for your topic\n- Improve your writing style\n- Fix grammar and spelling\n- Suggest a better title";
    } 
    else if (userMessage.toLowerCase().includes("summarize")) {
      responseContent = selectedDocument 
        ? `Here's a summary of "${selectedDocument.name}":\n\n${generateSummary(selectedDocument.content)}`
        : "I'd be happy to summarize your document, but I need to see its content first.";
    }
    else if (userMessage.toLowerCase().includes("improve") || userMessage.toLowerCase().includes("edit")) {
      responseContent = selectedDocument 
        ? `Here are some suggestions to improve your writing:\n\n${generateImprovements(selectedDocument.content)}`
        : "I'd be happy to suggest improvements, but I need to see your document first.";
    }
    else if (userMessage.toLowerCase().includes("idea") || userMessage.toLowerCase().includes("brainstorm")) {
      responseContent = `Here are some ideas to consider:\n\n${generateIdeas(selectedDocument?.content || "")}`;
    }
    else {
      responseContent = `I've analyzed your document${selectedDocument ? ` "${selectedDocument.name}"` : ""}. What specific aspect would you like help with? I can assist with summarizing, improving style, generating ideas, or fixing grammar.`;
    }
    
    const aiMessage: Message = { 
      id: generateId(),
      role: "assistant", 
      content: responseContent,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, aiMessage]);
    setIsLoading(false);
  };

  const generateSummary = (content: string) => {
    // Simple summary generation
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const shortSummary = sentences.slice(0, Math.min(3, sentences.length)).join(". ");
    return shortSummary || "This document appears to be empty or contains content I can't summarize effectively.";
  };

  const generateImprovements = (content: string) => {
    // Simple improvement suggestions
    const improvements = [
      "Consider using more active voice in your writing",
      "Try varying your sentence structure for better flow",
      "Add more specific examples to support your points",
      "Consider breaking longer paragraphs into smaller ones for readability",
      "Add transitional phrases between paragraphs to improve flow"
    ];
    
    return improvements.slice(0, 3).map(imp => `- ${imp}`).join("\n");
  };

  const generateIdeas = (content: string) => {
    // Simple idea generation
    const ideas = [
      "Explore the historical context of your topic",
      "Consider adding a section on practical applications",
      "Include a comparison with alternative approaches",
      "Add a personal anecdote to make your writing more relatable",
      "Incorporate relevant statistics or research findings",
      "Address potential counterarguments to strengthen your position"
    ];
    
    return ideas.slice(0, 4).map((idea, i) => `${i+1}. ${idea}`).join("\n");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleApplyToDocument = (content: string) => {
    if (selectedDocumentId && selectedDocument) {
      updateDocument(selectedDocumentId, {
        content: selectedDocument.content + "\n\n" + content
      }, true, "Applied AI suggestion");
      
      toast({
        title: "Applied to document",
        description: "The AI suggestion has been added to your document.",
      });
    }
  };

  const handleCopyToClipboard = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setIsCopied(id);
    
    toast({
      title: "Copied to clipboard",
      description: "The content has been copied to your clipboard.",
    });
    
    setTimeout(() => {
      setIsCopied(null);
    }, 2000);
  };

  const handleQuickAction = (action: string) => {
    setInput(action);
  };

  if (!selectedDocumentId || !selectedDocument) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card className="p-6 max-w-md text-center">
          <h2 className="text-xl font-semibold mb-2">AI Composer</h2>
          <p className="text-muted-foreground mb-4">Select a document to start using the AI assistant.</p>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => router.push("/settings")}
          >
            <Settings className="h-4 w-4 mr-2" />
            Configure AI Settings
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">AI Composer</h2>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => router.push("/settings")}
          title="Configure AI settings"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </div>
      
      <div className="flex-1 overflow-auto mb-4 space-y-4 pr-1">
        {messages.map((message) => (
          <div 
            key={message.id} 
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div 
              className={`max-w-[90%] rounded-lg p-3 group ${
                message.role === "user" 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted"
              }`}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>
              
              {message.role === "assistant" && message.id !== "welcome" && (
                <div className="mt-2 pt-2 border-t border-border/30 flex justify-between items-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 text-xs hover:bg-transparent"
                    onClick={() => handleApplyToDocument(message.content)}
                    title="Apply this suggestion to your document"
                  >
                    <Wand2 className="h-3 w-3 mr-1" />
                    Apply to document
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-transparent"
                    onClick={() => handleCopyToClipboard(message.content, message.id)}
                    title="Copy to clipboard"
                  >
                    {isCopied === message.id ? (
                      <Check className="h-3 w-3 mr-1" />
                    ) : (
                      <Copy className="h-3 w-3 mr-1" />
                    )}
                    {isCopied === message.id ? "Copied" : "Copy"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg p-3 bg-muted flex items-center">
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              Thinking...
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {messages.length === 1 && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          <Button 
            variant="outline" 
            className="text-xs justify-start h-auto py-2 px-3"
            onClick={() => handleQuickAction("Help me brainstorm ideas for this document")}
            title="Get brainstorming help"
          >
            <Sparkles className="h-3 w-3 mr-2" />
            Brainstorm ideas
          </Button>
          <Button 
            variant="outline" 
            className="text-xs justify-start h-auto py-2 px-3"
            onClick={() => handleQuickAction("Suggest improvements for my writing")}
            title="Get writing improvement suggestions"
          >
            <Sparkles className="h-3 w-3 mr-2" />
            Improve writing
          </Button>
          <Button 
            variant="outline" 
            className="text-xs justify-start h-auto py-2 px-3"
            onClick={() => handleQuickAction("Summarize this document")}
            title="Get a summary of your document"
          >
            <Sparkles className="h-3 w-3 mr-2" />
            Summarize
          </Button>
          <Button 
            variant="outline" 
            className="text-xs justify-start h-auto py-2 px-3"
            onClick={() => handleQuickAction("Fix grammar and spelling errors")}
            title="Get grammar and spelling corrections"
          >
            <Sparkles className="h-3 w-3 mr-2" />
            Fix grammar
          </Button>
        </div>
      )}
      
      <div className="flex gap-2 mt-auto">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask the AI assistant..."
          className="resize-none min-h-[80px]"
          disabled={isLoading}
        />
        <Button 
          className="self-end" 
          size="icon" 
          onClick={handleSendMessage}
          disabled={!input.trim() || isLoading}
          title="Send message"
        >
          <SendHorizontal className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
} 