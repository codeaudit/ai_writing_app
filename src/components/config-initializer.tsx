'use client';

import { useEffect } from 'react';
import { useLLMStore } from '@/lib/store';

export default function ConfigInitializer() {
  const { loadServerConfig, initializeAIRole } = useLLMStore();

  useEffect(() => {
    // Load server configuration
    loadServerConfig();
    
    // Initialize AI role from the available roles in the markdown file
    initializeAIRole();
  }, [loadServerConfig, initializeAIRole]);

  return null; // This component doesn't render anything
} 