import { useCallback } from 'react';
import { useAIChatStore } from '@/lib/store';
import { createMessageNode } from '@/lib/utils';
import { generateChatResponse } from '@/lib/llm-service';

export function useThread() {
  const store = useAIChatStore();
  
  const addMessage = useCallback(async (content: string) => {
    const messageNode = createMessageNode(content);
    store.addNode(messageNode);
    store.setActiveThread([...store.chatTree.activeThread, messageNode.id]);
    
    // Handle AI response
    try {
      // Generate response using the LLM service
      const response = await generateChatResponse({
        messages: [{ role: 'user', content }],
        stream: false
      });
      
      // Add the AI response directly using the store's addResponseNode method
      store.addResponseNode(messageNode.id, response.message.content, response.model);
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
    if (!message || !message.userContent) return;
    
    try {
      // Generate response using the LLM service
      const response = await generateChatResponse({
        messages: [{ role: 'user', content: message.userContent }],
        stream: false
      });
      
      // Add the AI response directly using the store's addResponseNode method
      store.addResponseNode(messageId, response.message.content, response.model);
    } catch (error) {
      console.error('Error regenerating response:', error);
    }
  }, [store]);
  
  return {
    addMessage,
    navigateToSibling,
    regenerateResponse,
    activeMessages: store.chatTree.activeThread.map(id => store.chatTree.nodes[id]).filter(Boolean),
    threadMetadata: {
      hasSiblings: (nodeId: string) => {
        const node = store.chatTree.nodes[nodeId];
        if (!node?.parentId) return false;
        const parent = store.chatTree.nodes[node.parentId];
        return parent?.childrenIds.length > 1;
      },
      getSiblingCount: (nodeId: string) => {
        const node = store.chatTree.nodes[nodeId];
        if (!node?.parentId) return 0;
        const parent = store.chatTree.nodes[node.parentId];
        return parent?.childrenIds.length || 0;
      },
      getCurrentBranchIndex: (nodeId: string) => {
        const node = store.chatTree.nodes[nodeId];
        if (!node?.parentId) return 0;
        const parent = store.chatTree.nodes[node.parentId];
        return parent?.childrenIds.indexOf(nodeId) || 0;
      }
    }
  };
} 