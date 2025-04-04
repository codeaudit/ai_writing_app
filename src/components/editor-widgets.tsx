"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import type * as Monaco from 'monaco-editor';
import { editor } from 'monaco-editor';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { X, Minimize, MessageSquare, SendHorizonal } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

/**
 * Content Widget example - A widget that appears below a specific line of code
 * for contextual AI interactions.
 */
export class CodeContextWidget implements editor.IContentWidget {
  private readonly _id: string;
  private readonly _editor: editor.ICodeEditor;
  private readonly _domNode: HTMLDivElement;
  private _position: editor.IContentWidgetPosition | null = null;
  private _onMessage: (message: string) => void;
  private _onClose: () => void;
  private _lineNumber: number;
  
  constructor(
    editor: editor.ICodeEditor, 
    lineNumber: number, 
    context: string,
    onMessage: (message: string) => void,
    onClose: () => void
  ) {
    this._id = 'code.context.widget.' + lineNumber;
    this._editor = editor;
    this._lineNumber = lineNumber;
    this._onMessage = onMessage;
    this._onClose = onClose;
    
    // Create the DOM node for the widget
    this._domNode = document.createElement('div');
    this._domNode.className = 'monaco-code-context-widget';
    this._domNode.style.width = '90%';
    this._domNode.style.maxWidth = '800px';
    this._domNode.style.zIndex = '1000';
    
    // Render the React component inside the widget
    this.renderReactComponent(context);
    
    // Register the widget
    this._editor.addContentWidget(this);
    
    // Position the widget below the line
    this.updatePosition();
  }
  
  private renderReactComponent(context: string): void {
    const rootElement = document.createElement('div');
    this._domNode.appendChild(rootElement);
    
    // In a real implementation, we would use ReactDOM.createRoot
    // and render a React component here with the context
    // For this mock, we'll just simulate it with static HTML
    rootElement.innerHTML = `<div class="react-root">AI Assistant analyzing: ${context.substring(0, 50)}...</div>`;
  }
  
  public updatePosition(): void {
    // Position below the specified line
    this._position = {
      position: {
        lineNumber: this._lineNumber + 1,
        column: 1
      },
      preference: [editor.ContentWidgetPositionPreference.BELOW]
    };
    
    // Force the editor to reposition the widget
    this._editor.layoutContentWidget(this);
  }
  
  public getId(): string {
    return this._id;
  }
  
  public getDomNode(): HTMLElement {
    return this._domNode;
  }
  
  public getPosition(): editor.IContentWidgetPosition | null {
    return this._position;
  }
  
  public dispose(): void {
    this._editor.removeContentWidget(this);
    this._onClose();
  }
}

// React component for the content widget
interface CodeContextWidgetComponentProps {
  context: string;
  onSendMessage: (message: string) => void;
  onClose: () => void;
}

const CodeContextWidgetComponent = React.forwardRef<
  HTMLDivElement,
  CodeContextWidgetComponentProps
>((props, ref) => {
  const { context, onSendMessage, onClose } = props;
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState([
    { role: 'system', content: `I'm analyzing this code: ${context}` },
    { role: 'assistant', content: 'I can help you understand or improve this code. What would you like to know?' }
  ]);
  
  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    
    // Add user message to the chat
    setMessages([...messages, { role: 'user', content: inputValue }]);
    
    // Call the parent handler
    onSendMessage(inputValue);
    
    // Clear the input
    setInputValue('');
    
    // Simulate AI response (in a real app, this would come from an API)
    setTimeout(() => {
      setMessages(prev => [
        ...prev, 
        { 
          role: 'assistant', 
          content: `I've analyzed your question about the code. Here's what I found: ${inputValue.length > 20 ? 'This is a detailed response' : 'This is a short response'}` 
        }
      ]);
    }, 1000);
  };
  
  return (
    <Card 
      ref={ref} 
      className="border shadow-md p-4 bg-background"
      style={{ width: '100%' }}
    >
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center">
          <Badge variant="outline" className="mr-2">AI Code Assistant</Badge>
          <Badge variant="secondary">Line {props.context.split('\n').length}</Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <ScrollArea className="h-60 mb-4 p-2 border rounded-md">
        {messages.map((msg, i) => (
          <div 
            key={i} 
            className={`flex mb-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role !== 'user' && (
              <Avatar className="h-8 w-8 mr-2">
                <AvatarFallback>AI</AvatarFallback>
              </Avatar>
            )}
            <div 
              className={`px-3 py-2 rounded-lg max-w-[80%] ${
                msg.role === 'user' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted'
              }`}
            >
              {msg.content}
            </div>
            {msg.role === 'user' && (
              <Avatar className="h-8 w-8 ml-2">
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}
      </ScrollArea>
      
      <div className="flex items-center">
        <Textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask about this code..."
          className="min-h-0 h-10 resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
        />
        <Button 
          className="ml-2 h-10" 
          size="icon"
          onClick={handleSendMessage}
        >
          <SendHorizonal className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
});

CodeContextWidgetComponent.displayName = 'CodeContextWidgetComponent';

/**
 * Overlay Widget example - A widget that appears in the corner of the editor
 * for persistent AI chat interactions.
 */
export class EditorChatWidget implements editor.IOverlayWidget {
  private readonly _id: string;
  private readonly _editor: editor.ICodeEditor;
  private readonly _domNode: HTMLDivElement;
  private _isExpanded: boolean = false;
  private _onMessage: (message: string) => void;
  
  constructor(
    editor: editor.ICodeEditor, 
    onMessage: (message: string) => void
  ) {
    this._id = 'editor.chat.widget';
    this._editor = editor;
    this._onMessage = onMessage;
    
    // Create the DOM node for the widget
    this._domNode = document.createElement('div');
    this._domNode.className = 'monaco-editor-chat-widget';
    this._domNode.style.position = 'absolute';
    this._domNode.style.right = '20px';
    this._domNode.style.bottom = '20px';
    this._domNode.style.zIndex = '1000';
    
    // Render the React component inside the widget
    this.renderReactComponent();
    
    // Register the widget
    this._editor.addOverlayWidget(this);
  }
  
  private renderReactComponent(): void {
    const rootElement = document.createElement('div');
    this._domNode.appendChild(rootElement);
    
    // In a real implementation, we would use ReactDOM.createRoot
    // and render a React component here
    // For this mock, we'll just simulate it with static HTML
    rootElement.innerHTML = '<div class="react-root">React component would render here</div>';
  }
  
  public toggleExpand(): void {
    this._isExpanded = !this._isExpanded;
    // Update the component to reflect the expanded state
    this.renderReactComponent();
  }
  
  public getId(): string {
    return this._id;
  }
  
  public getDomNode(): HTMLElement {
    return this._domNode;
  }
  
  public getPosition(): editor.IOverlayWidgetPosition {
    return {
      preference: editor.OverlayWidgetPositionPreference.BOTTOM_RIGHT_CORNER
    };
  }
  
  public dispose(): void {
    this._editor.removeOverlayWidget(this);
  }
}

// React component for the overlay widget
interface EditorChatWidgetComponentProps {
  onSendMessage: (message: string) => void;
  onToggleExpand: () => void;
  isExpanded: boolean;
  getSelectedText: () => string;
}

const EditorChatWidgetComponent = React.forwardRef<
  HTMLDivElement,
  EditorChatWidgetComponentProps
>((props, ref) => {
  const { onSendMessage, onToggleExpand, isExpanded, getSelectedText } = props;
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'How can I help with your code today?' }
  ]);
  
  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    
    // Get selected text if any
    const selectedText = getSelectedText();
    const messageWithContext = selectedText 
      ? `${inputValue}\n\nSelected code:\n\`\`\`\n${selectedText}\n\`\`\`` 
      : inputValue;
    
    // Add user message to the chat
    setMessages([...messages, { role: 'user', content: inputValue }]);
    
    // Call the parent handler
    onSendMessage(messageWithContext);
    
    // Clear the input
    setInputValue('');
    
    // Simulate AI response (in a real app, this would come from an API)
    setTimeout(() => {
      setMessages(prev => [
        ...prev, 
        { 
          role: 'assistant', 
          content: selectedText 
            ? `I've analyzed the code you selected. Here's what I found: This appears to be ${selectedText.length > 50 ? 'a complex' : 'a simple'} piece of code.`
            : `I can help with that. What specific part of your code are you working on?`
        }
      ]);
    }, 1000);
  };
  
  // If collapsed, just show the chat button
  if (!isExpanded) {
    return (
      <Button 
        ref={ref as React.Ref<HTMLButtonElement>}
        variant="secondary"
        className="rounded-full p-3 shadow-md"
        onClick={onToggleExpand}
      >
        <MessageSquare className="h-5 w-5" />
      </Button>
    );
  }
  
  // Expanded chat view
  return (
    <Card 
      ref={ref} 
      className="border shadow-md"
      style={{ width: '350px', height: '450px' }}
    >
      <div className="flex flex-col h-full">
        <div className="flex justify-between items-center p-3 border-b">
          <h3 className="font-medium">AI Code Assistant</h3>
          <div>
            <Button variant="ghost" size="sm" onClick={onToggleExpand}>
              <Minimize className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <ScrollArea className="flex-grow p-3">
          {messages.map((msg, i) => (
            <div 
              key={i} 
              className={`flex mb-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role !== 'user' && (
                <Avatar className="h-8 w-8 mr-2">
                  <AvatarFallback>AI</AvatarFallback>
                </Avatar>
              )}
              <div 
                className={`px-3 py-2 rounded-lg max-w-[80%] ${
                  msg.role === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted'
                }`}
              >
                {msg.content}
              </div>
              {msg.role === 'user' && (
                <Avatar className="h-8 w-8 ml-2">
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
        </ScrollArea>
        
        <div className="p-3 border-t">
          <div className="flex items-center">
            <Textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask about your code..."
              className="min-h-0 h-10 resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <Button 
              className="ml-2 h-10" 
              size="icon"
              onClick={handleSendMessage}
            >
              <SendHorizonal className="h-4 w-4" />
            </Button>
          </div>
          {getSelectedText() && (
            <div className="mt-2">
              <Badge variant="outline" className="text-xs">Using selected code as context</Badge>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
});

EditorChatWidgetComponent.displayName = 'EditorChatWidgetComponent';

/**
 * Utility functions to create and manage the widgets
 */
export const createContentWidget = (
  editor: Monaco.editor.ICodeEditor,
  lineNumber: number,
  onMessage: (message: string) => void,
  onClose: () => void
): CodeContextWidget | null => {
  if (!editor) return null;
  
  // Get the text content of the current line and surrounding lines for context
  const model = editor.getModel();
  if (!model) return null;
  
  const startLine = Math.max(1, lineNumber - 2);
  const endLine = Math.min(model.getLineCount(), lineNumber + 2);
  let codeContext = '';
  
  for (let i = startLine; i <= endLine; i++) {
    codeContext += model.getLineContent(i) + '\n';
  }
  
  return new CodeContextWidget(editor, lineNumber, codeContext, onMessage, onClose);
};

export const createOverlayWidget = (
  editor: Monaco.editor.ICodeEditor,
  onMessage: (message: string) => void
): EditorChatWidget | null => {
  if (!editor) return null;
  return new EditorChatWidget(editor, onMessage);
};

/**
 * Hook to add the AI chat widgets to the Monaco editor
 */
export const useEditorWidgets = (
  editorRef: React.MutableRefObject<Monaco.editor.IStandaloneCodeEditor | null>,
  onAIMessage: (message: string, context?: string) => void
) => {
  const contentWidgetRef = useRef<CodeContextWidget | null>(null);
  const overlayWidgetRef = useRef<EditorChatWidget | null>(null);
  
  // Function to add a content widget at the current cursor position
  const addContentWidgetAtCursor = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    
    // Get the current cursor position
    const position = editor.getPosition();
    if (!position) return;
    
    // Remove any existing content widget
    if (contentWidgetRef.current) {
      contentWidgetRef.current.dispose();
      contentWidgetRef.current = null;
    }
    
    // Create a new content widget
    contentWidgetRef.current = createContentWidget(
      editor,
      position.lineNumber,
      (message) => onAIMessage(message, 'line-context'),
      () => {
        contentWidgetRef.current = null;
      }
    );
  }, [editorRef, onAIMessage]);
  
  // Function to add or toggle the overlay widget
  const toggleOverlayWidget = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    
    if (overlayWidgetRef.current) {
      overlayWidgetRef.current.toggleExpand();
    } else {
      overlayWidgetRef.current = createOverlayWidget(
        editor,
        (message) => onAIMessage(message, 'global-context')
      );
    }
  }, [editorRef, onAIMessage]);
  
  // Clean up widgets when the component unmounts
  useEffect(() => {
    return () => {
      if (contentWidgetRef.current) {
        contentWidgetRef.current.dispose();
      }
      if (overlayWidgetRef.current) {
        overlayWidgetRef.current.dispose();
      }
    };
  }, []);
  
  return {
    addContentWidgetAtCursor,
    toggleOverlayWidget
  };
};

// Example usage component
export const AIChatWidgetsExample: React.FC<{
  editor: Monaco.editor.IStandaloneCodeEditor | null;
}> = ({ editor }) => {
  const editorRef = useRef(editor);
  
  // Update ref when editor changes
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);
  
  const handleAIMessage = useCallback((message: string, context?: string) => {
    console.log(`AI message received with ${context}:`, message);
    // In a real app, this would send the message to an AI service
  }, []);
  
  const { addContentWidgetAtCursor, toggleOverlayWidget } = useEditorWidgets(
    editorRef,
    handleAIMessage
  );
  
  return (
    <div className="mt-4 space-x-2">
      <Button onClick={addContentWidgetAtCursor}>
        Ask AI about current line
      </Button>
      <Button onClick={toggleOverlayWidget}>
        Toggle AI Chat
      </Button>
    </div>
  );
}; 