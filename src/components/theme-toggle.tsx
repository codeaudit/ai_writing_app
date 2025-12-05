"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="relative">
        <div className="h-[1.2rem] w-[1.2rem]" />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative group overflow-hidden rounded-full hover:bg-accent/80 transition-all duration-300"
    >
      {/* Ambient glow effect */}
      <motion.div
        className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: isDark
            ? "radial-gradient(circle, rgba(251,191,36,0.15) 0%, transparent 70%)"
            : "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)"
        }}
      />

      <AnimatePresence mode="wait">
        {isDark ? (
          <motion.div
            key="sun"
            initial={{ rotate: -90, scale: 0, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: 90, scale: 0, opacity: 0 }}
            transition={{ duration: 0.3, type: "spring", stiffness: 200, damping: 15 }}
          >
            <Sun className="h-[1.2rem] w-[1.2rem] text-amber-500 group-hover:text-amber-400 transition-colors" />
          </motion.div>
        ) : (
          <motion.div
            key="moon"
            initial={{ rotate: 90, scale: 0, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: -90, scale: 0, opacity: 0 }}
            transition={{ duration: 0.3, type: "spring", stiffness: 200, damping: 15 }}
          >
            <Moon className="h-[1.2rem] w-[1.2rem] text-indigo-500 group-hover:text-indigo-400 transition-colors" />
          </motion.div>
        )}
      </AnimatePresence>

      <span className="sr-only">Toggle theme</span>
    </Button>
  );
} 