"use client";

import React, { useState, useEffect } from "react";
import { motion, useAnimation } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { HyperText } from "@/components/magicui/hyper-text";


interface AboutSplashProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutSplash({ isOpen, onClose }: AboutSplashProps) {
  const controls = useAnimation();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      controls.start("visible");
    } else {
      controls.start("hidden");
    }
  }, [isOpen, controls]);

  if (!isMounted) return null;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl rounded-lg bg-background p-8 shadow-lg">
        <Button 
          variant="outline" 
          size="icon" 
          className="absolute right-4 top-4 z-20 bg-background shadow-sm" 
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>

        {/* MagicUI Interactive Grid */}
        <div className="relative overflow-hidden rounded-lg border bg-background p-2">
          <div className="absolute inset-0 bg-grid-small-black/[0.2] [mask-image:linear-gradient(to_bottom_right,white,transparent,white)]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="pointer-events-none absolute h-56 w-56 bg-gradient-radial from-purple-500/30 to-transparent blur-lg" />
            <div className="pointer-events-none absolute h-40 w-40 bg-gradient-radial from-blue-500/40 to-transparent blur-lg" />
          </div>

          <div className="relative z-10 flex min-h-[400px] flex-col items-center justify-center p-8">
            {/* Hyper Text Animation */}
            <div className="mb-8 text-center">
              <HyperText duration={100}>A Pattern Language Editor</HyperText>

                
              <motion.p 
                className="mt-4 text-lg text-muted-foreground"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 2.6, duration: 0.5 }}
              >
                Create, organize, and explore patterns for better writing and thinking
              </motion.p>
            </div>

            {/* Interactive Grid */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  className="flex flex-col items-center rounded-lg border bg-card p-6 text-center shadow-sm transition-all hover:shadow-md hover:scale-105"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 2.7 + index * 0.1 }}
                >
                  <div className="mb-4 rounded-full bg-primary/10 p-3">
                    {feature.icon}
                  </div>
                  <h3 className="mb-2 text-lg font-medium">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>

            <motion.div 
              className="mt-8 flex flex-col items-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 3.5, duration: 0.5 }}
            >
              <p className="mb-4 text-center text-sm text-muted-foreground">
                Inspired by Christopher Alexander's "A Pattern Language"
              </p>
              <Button
                variant="default"
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                onClick={onClose}
              >
                Get Started
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Features for the grid
const features = [
  {
    title: "Pattern Creation",
    description: "Create and edit patterns with a powerful markdown editor",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6 text-primary"
      >
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <path d="M12 18v-6" />
        <path d="M9 15h6" />
      </svg>
    ),
  },
  {
    title: "AI Assistance",
    description: "Get intelligent suggestions and help from AI as you write",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6 text-primary"
      >
        <path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
      </svg>
    ),
  },
  {
    title: "Version History",
    description: "Track changes and restore previous versions of your patterns",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6 text-primary"
      >
        <path d="M3 3v5h5" />
        <path d="M3 3 9 9" />
        <path d="M21 21v-5h-5" />
        <path d="M21 21-7-7" />
        <path d="M3 21v-5h5" />
        <path d="M3 21l6-6" />
        <path d="M21 3v5h-5" />
        <path d="M21 3-7 7" />
      </svg>
    ),
  },
  {
    title: "Organization",
    description: "Organize patterns in folders and categories for easy access",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6 text-primary"
      >
        <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
      </svg>
    ),
  },
  {
    title: "Comparison",
    description: "Compare different patterns side by side to find connections",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6 text-primary"
      >
        <line x1="18" x2="18" y1="2" y2="22" />
        <line x1="6" x2="6" y1="2" y2="22" />
        <line x1="2" x2="22" y1="12" y2="12" />
        <line x1="2" x2="7" y1="7" y2="7" />
        <line x1="2" x2="7" y1="17" y2="17" />
        <line x1="17" x2="22" y1="17" y2="17" />
        <line x1="17" x2="22" y1="7" y2="7" />
      </svg>
    ),
  },
  {
    title: "Export & Share",
    description: "Export your patterns as markdown files to share with others",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6 text-primary"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" x2="12" y1="15" y2="3" />
      </svg>
    ),
  },
]; 