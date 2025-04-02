'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, Book, Copy, MessageSquare, Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

// Create a simple skeleton component
const SkeletonComponent = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-muted ${className}`} />
);

export default function HistoryViewer() {
  const [historyContent, setHistoryContent] = useState<string>('');
  const [messages, setMessages] = useState<Array<{timestamp: string, message: string}>>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  // Load history content
  const loadHistory = async () => {
    setIsLoading(true);
    try {
      // Get the formatted markdown
      const mdResponse = await fetch('/api/history');
      if (!mdResponse.ok) {
        throw new Error('Failed to load history markdown');
      }
      const mdData = await mdResponse.json();
      setHistoryContent(mdData.content);
      
      // Get the structured messages
      const msgResponse = await fetch('/api/history?format=messages');
      if (!msgResponse.ok) {
        throw new Error('Failed to load structured messages');
      }
      const msgData = await msgResponse.json();
      setMessages(msgData.messages || []);
    } catch (error) {
      console.error('Error loading history:', error);
      toast.error("Failed to load chat history.");
    } finally {
      setIsLoading(false);
    }
  };

  // Load history on component mount
  useEffect(() => {
    loadHistory();
  }, []);
  
  // Group messages by date
  const messagesByDate = messages.reduce((acc, message) => {
    const date = message.timestamp.split(' ')[0];
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(message);
    return acc;
  }, {} as Record<string, Array<{timestamp: string, message: string}>>);
  
  // Function to copy a message to clipboard
  const copyToClipboard = (message: string) => {
    navigator.clipboard.writeText(message);
    toast.success("Message copied to clipboard");
  };
  
  // Function to navigate to chat with a message
  const navigateToChat = (message: string) => {
    // Set the message in local storage to be retrieved by the chat page
    localStorage.setItem('pendingChatMessage', message);
    
    // Navigate to the chat page
    router.push('/chat');
    
    toast.success("Message ready for chat");
  };
  
  // Fixed function to handle message selection for chat
  const handleUseInChat = (message: string) => {
    navigateToChat(message);
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <div>
          <CardTitle className="text-lg font-bold">Chat History</CardTitle>
          <CardDescription>
            A record of all user messages from the AI chat interface
          </CardDescription>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={loadHistory}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left side: Message list with actions */}
          <div className="border rounded-md">
            <div className="p-3 border-b">
              <h3 className="font-medium">Recent Messages</h3>
              <p className="text-sm text-muted-foreground">Select a message to use in chat</p>
            </div>
            
            <ScrollArea className="h-[450px]">
              {isLoading ? (
                <div className="p-4 space-y-4">
                  <SkeletonComponent className="h-4 w-full" />
                  <SkeletonComponent className="h-4 w-full" />
                  <SkeletonComponent className="h-4 w-3/4" />
                </div>
              ) : messages.length > 0 ? (
                <div className="divide-y">
                  {Object.entries(messagesByDate).map(([date, dateMessages]) => (
                    <div key={date} className="py-2">
                      <div className="px-3 py-1 text-xs font-medium text-muted-foreground bg-muted/50">
                        {date}
                      </div>
                      {dateMessages.map((msg, idx) => (
                        <div key={`${date}-${idx}`} className="px-3 py-2 hover:bg-muted/30 group">
                          <div className="text-sm mb-1 break-words">{msg.message}</div>
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 rounded-full"
                              onClick={() => copyToClipboard(msg.message)}
                              title="Copy message"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 rounded-full"
                              onClick={() => handleUseInChat(msg.message)}
                              title="Use in chat"
                            >
                              <Send className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[400px] text-center text-muted-foreground p-4">
                  <MessageSquare className="h-10 w-10 mb-4 opacity-20" />
                  <p>No messages found.</p>
                </div>
              )}
            </ScrollArea>
          </div>
          
          {/* Right side: Full markdown view */}
          <div className="border rounded-md">
            <div className="p-3 border-b">
              <h3 className="font-medium">Full History</h3>
              <p className="text-sm text-muted-foreground">Complete chat history log</p>
            </div>
            
            <ScrollArea className="h-[450px]">
              {isLoading ? (
                <div className="p-4 space-y-4">
                  <SkeletonComponent className="h-4 w-full" />
                  <SkeletonComponent className="h-4 w-full" />
                  <SkeletonComponent className="h-4 w-3/4" />
                  <SkeletonComponent className="h-20 w-full" />
                </div>
              ) : historyContent ? (
                <div className="prose prose-sm max-w-none dark:prose-invert p-4">
                  <ReactMarkdown>{historyContent}</ReactMarkdown>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[400px] text-center text-muted-foreground">
                  <Book className="h-10 w-10 mb-4 opacity-20" />
                  <p>No chat history found.</p>
                  <p className="text-sm">User messages will be recorded here as you chat with AI.</p>
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 