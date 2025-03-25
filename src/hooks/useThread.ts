import { useCallback } from 'react';
import { useAIChatStore } from '@/lib/store';
import { createMessageNode } from '@/lib/utils';

export function useThread() {
  const store = useAIChatStore();
  
  const addMessage = useCallback(async (content: string) => {
    const messageNode = createMessageNode(content);
    store.addNode(messageNode);
    store.setActiveThread([...store.chatTree.activeThread, messageNode.id]);
    
    // Handle AI response
    try {
      const response = await store.generateResponse(content);
      const responseNode = createMessageNode(response, 'assistant');
      store.addResponseNode(messageNode.id, responseNode);
      store.setActiveThread([...store.chatTree.activeThread, responseNode.id]);
    } catch (error) {
      console.error('Error generating response:', error);
    }
  }, [store]);
  
  const navigateToSibling = useCallback((nodeId: string) => {
    // Build thread from root to this node
    const newThread: string[] = [];
    let currentNodeId: string | null = nodeId;
    
    while (currentNodeId && store.chatTree.nodes[currentNodeId]) {
      newThread.unshift(currentNodeId);
      currentNodeId = store.chatTree.nodes[currentNodeId].parentId;
    }
    
    store.setActiveThread(newThread);
  }, [store]);
  
  const regenerateResponse = useCallback(async (messageId: string) => {
    const message = store.chatTree.nodes[messageId];
    if (!message) return;
    
    try {
      const response = await store.generateResponse(message.content);
      const responseNode = createMessageNode(response, 'assistant');
      store.addResponseNode(messageId, responseNode);
      store.setActiveThread([...store.chatTree.activeThread, responseNode.id]);
    } catch (error) {
      console.error('Error regenerating response:', error);
    }
  }, [store]);
  
  return {
    addMessage,
    navigateToSibling,
    regenerateResponse,
    activeMessages: store.selectActiveMessages(),
    threadMetadata: store.selectThreadMetadata()
  };
} 