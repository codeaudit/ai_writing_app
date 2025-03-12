"use client";

import { useState, useEffect } from "react";

/**
 * Custom hook to check if a media query matches the current viewport
 * @param query The media query to check
 * @returns Boolean indicating if the media query matches
 */
export function useMediaQuery(query: string): boolean {
  // Initialize with false for SSR
  const [matches, setMatches] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    // Create a media query list
    const mediaQuery = window.matchMedia(query);
    
    // Set the initial value
    setMatches(mediaQuery.matches);

    // Define a callback function to handle changes
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Add the event listener
    mediaQuery.addEventListener("change", handleChange);

    // Clean up
    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [query]);

  // Return false during SSR, and the actual value after mounting
  return isMounted ? matches : false;
} 