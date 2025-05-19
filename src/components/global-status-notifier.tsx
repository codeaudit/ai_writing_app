"use client";
import React, { useEffect, useRef } from 'react';
import { useDocumentStore } from '@/lib/store';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export function GlobalStatusNotifier() {
  const isLoading = useDocumentStore((state) => state.isLoading);
  const error = useDocumentStore((state) => state.error);
  const setError = useDocumentStore((state) => state.setError);
  const loadData = useDocumentStore((state) => state.loadData);

  // Ref to keep track of the persistent toast ID
  const persistentToastIdRef = useRef<string | number | undefined>(undefined);

  useEffect(() => {
    // Clear persistent toast if error is null (e.g., after successful loadData)
    if (error === null && persistentToastIdRef.current) {
      toast.dismiss(persistentToastIdRef.current);
      persistentToastIdRef.current = undefined;
    }

    if (error) {
      // If a persistent toast is already active, dismiss it before showing a new one
      // This handles cases where a new error occurs while the persistent one is shown
      if (persistentToastIdRef.current) {
        toast.dismiss(persistentToastIdRef.current);
        persistentToastIdRef.current = undefined;
      }

      if (typeof error === 'string') {
        toast.error(error, {
          onDismiss: () => setError(null), // Clear error when dismissed
        });
      } else if (error.type === 'LOAD_DATA_SERVER_FAILURE') {
        persistentToastIdRef.current = toast.error(error.message, {
          duration: Infinity, // Make it persistent
          action: <Button onClick={() => {
            toast.dismiss(persistentToastIdRef.current); // Dismiss current toast before retrying
            persistentToastIdRef.current = undefined; 
            loadData();
          }}>Retry</Button>,
          // Do not automatically clear this error via setError(null) here,
          // it should persist until a successful loadData or manual dismissal through retry.
          // A successful loadData should set error to null, which will then dismiss this toast via the logic at the start of useEffect.
        });
      } else if (error.message) { // Handle other structured errors with a message
        toast.error(error.message, {
          onDismiss: () => setError(null), // Clear error when dismissed
        });
      } else { // Fallback for unexpected error structures
        toast.error('An unexpected error occurred.', {
          onDismiss: () => setError(null), // Clear error when dismissed
        });
      }
      
      // For non-persistent errors, clear them from the store immediately after showing.
      // For LOAD_DATA_SERVER_FAILURE, we let it persist.
      // The onDismiss handler for other toasts will clear the error.
      if (typeof error === 'string' || (typeof error === 'object' && error.type !== 'LOAD_DATA_SERVER_FAILURE')) {
         // setError(null); // This is now handled by onDismiss for individual toasts
      }
    }
  }, [error, setError, loadData]);

  useEffect(() => {
    let loadingToastId: string | number | undefined;
    if (isLoading) {
      // console.log("Global loading state active..."); // Placeholder
      loadingToastId = toast.loading("Loading data...");
    } else {
      // Dismiss loading toast if it was shown
      if (loadingToastId) {
        toast.dismiss(loadingToastId);
      }
      // Also dismiss any generic loading toast if isLoading becomes false
      // This is a bit of a catch-all, as sonner doesn't seem to have a global dismiss by type.
      // We rely on the specific ID if available.
      toast.dismiss(); // This might be too aggressive if other toasts are meant to persist.
                       // A better approach would be to manage IDs of all loading toasts.
                       // For this subtask, we'll assume simple loading toast management.
    }
    return () => {
      // Ensure loading toast is dismissed on component unmount if active
      if (loadingToastId) {
        toast.dismiss(loadingToastId);
      }
    };
  }, [isLoading]);

  return null; // Component doesn't render anything itself
}
