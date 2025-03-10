"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { SendHorizontal, Settings, Sparkles, RefreshCw } from "lucide-react";
import { useDocumentStore } from "@/lib/store";
import { useLLMStore } from "@/lib/store";
import { useRouter } from "next/navigation";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AIComposerProps {}

export default function AIComposer({}: AIComposerProps) {
  const router = useRouter();
  const { documents, selectedDocumentId, updateDocument } = useDocumentStore();
  const { config } = useLLMStore();
  
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hello! I'm your AI writing assistant. How can I help you with your document today?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Get the selected document
  const selectedDocument = documents.find(doc => doc.id === selectedDocumentId);

  const handleSendMessage = async () => {
    if (!input.trim() || !selectedDocumentId) return;
    
    // Add user message to chat
    const userMessage: Message = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    
    // Simulate AI response (in a real app, this would call an API)
    setTimeout(() => {
      const aiResponse: Message = { 
        role: "assistant", 
        content: `I've analyzed your document "${selectedDocument?.name}". In a real application, this would be processed by ${config.provider} using the ${config.model} model.` 
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1000);
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
      });
    }
  };

  const suggestedPrompts = [
    "Help me brainstorm ideas for this document",
    "Suggest improvements for my writing",
    "Summarize this document",
    "Fix grammar and spelling errors"
  ];

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
        >
          <Settings className="h-5 w-5" />
        </Button>
      </div>
      
      <div className="flex-1 overflow-auto mb-4 space-y-4">
        {messages.map((message, index) => (
          <div 
            key={index} 
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div 
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === "user" 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted"
              }`}
            >
              {message.content}
              {message.role === "assistant" && message.content !== messages[0].content && (
                <Button
                  variant="link"
                  size="sm"
                  className="mt-2 h-auto p-0 text-xs"
                  onClick={() => handleApplyToDocument(message.content)}
                >
                  Apply to document
                </Button>
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
      </div>
      
      {messages.length === 1 && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          {suggestedPrompts.map((prompt, index) => (
            <Button 
              key={index} 
              variant="outline" 
              className="text-xs justify-start h-auto py-2 px-3"
              onClick={() => {
                setInput(prompt);
              }}
            >
              <Sparkles className="h-3 w-3 mr-2" />
              {prompt}
            </Button>
          ))}
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
        >
          <SendHorizontal className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
} 