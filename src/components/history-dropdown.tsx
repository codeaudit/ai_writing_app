'use client';

import { useState, useEffect } from 'react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { History, MessageSquare, RefreshCw, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';

interface HistoryMessage {
  timestamp: string;
  message: string;
}

interface HistoryDropdownProps {
  children?: React.ReactNode;
}

export default function HistoryDropdown({ children }: HistoryDropdownProps) {
  const [messages, setMessages] = useState<HistoryMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Load user messages from history
  const loadMessages = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/history?format=messages');
      if (!response.ok) {
        throw new Error('Failed to load messages');
      }
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error("Failed to load message history.");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Load messages on initial render
  useEffect(() => {
    loadMessages();
  }, []);
  
  // Function to insert text into the currently focused input element
  const insertTextIntoFocusedElement = (text: string) => {
    // Always copy to clipboard first
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
    
    // Get the currently focused element
    const activeElement = document.activeElement as HTMLInputElement | HTMLTextAreaElement;
    
    // Check if it's an input or textarea element
    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
      // Get the current cursor position
      const start = activeElement.selectionStart || 0;
      const end = activeElement.selectionEnd || 0;
      
      // Get the current value of the input field
      const currentValue = activeElement.value;
      
      // Insert the text at the cursor position
      const newValue = currentValue.substring(0, start) + text + currentValue.substring(end);
      
      // Update the value of the input field
      activeElement.value = newValue;
      
      // Set the cursor position after the inserted text
      const newCursorPos = start + text.length;
      activeElement.setSelectionRange(newCursorPos, newCursorPos);
      
      // Trigger an input event to update any React state
      const event = new Event('input', { bubbles: true });
      activeElement.dispatchEvent(event);
      
      // Focus the element
      activeElement.focus();
      
      toast.success("Message also inserted at cursor position");
    }
  };
  
  // Get all unique messages across all dates
  const uniqueMessages = (() => {
    const seen = new Set<string>();
    return messages.filter(msg => {
      const isDuplicate = seen.has(msg.message);
      seen.add(msg.message);
      return !isDuplicate;
    });
  })();
  
  // Render a preview of the message (truncated if too long)
  const getMessagePreview = (message: string, maxLength = 30) => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {children || (
          <Button 
            variant="ghost" 
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground"
            title="Message History"
          >
            <History className="h-3.5 w-3.5" />
          </Button>
        )}
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="flex justify-between items-center">
          <span>Message History</span>
          <Button
            variant="ghost" 
            size="sm"
            className="h-5 w-5 p-0"
            onClick={(e) => {
              e.stopPropagation();
              loadMessages();
            }}
            disabled={isLoading}
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        {messages.length === 0 ? (
          <DropdownMenuItem disabled className="text-center py-2">
            {isLoading ? 'Loading messages...' : 'No messages found'}
          </DropdownMenuItem>
        ) : (
          <ScrollArea className="h-[400px]">
            {uniqueMessages.map((msg, index) => (
              <DropdownMenuItem 
                key={`${msg.timestamp}-${index}`}
                className="flex items-start gap-2 cursor-pointer"
                onClick={() => insertTextIntoFocusedElement(msg.message)}
              >
                <MessageSquare className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <span className="text-xs flex-1 whitespace-normal">
                  {getMessagePreview(msg.message)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 p-0 ml-auto flex-shrink-0 opacity-50 hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(msg.message);
                    toast.success("Copied to clipboard");
                  }}
                  title="Copy to clipboard"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </DropdownMenuItem>
            ))}
          </ScrollArea>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 