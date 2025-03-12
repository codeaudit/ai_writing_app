'use client';

import { useEffect } from 'react';
import { useLLMStore } from '@/lib/store';

export default function ConfigInitializer() {
  const { loadServerConfig } = useLLMStore();

  useEffect(() => {
    loadServerConfig();
  }, [loadServerConfig]);

  return null; // This component doesn't render anything
} 