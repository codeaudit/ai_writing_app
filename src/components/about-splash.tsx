"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, useAnimation, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, Sparkles, Zap, History, FolderKanban, GitCompare, Share2 } from "lucide-react";
import { HyperText } from "@/components/magicui/hyper-text";
import dynamic from "next/dynamic";

const Splash3DScene = dynamic(() => import("@/components/splash-3d-scene").then(mod => mod.Splash3DScene), {
  ssr: false,
  loading: () => <div className="absolute inset-0 -z-10 bg-white/80" />
});

interface AboutSplashProps {
  isOpen: boolean;
  onClose: () => void;
}

// Floating particle component for CSS-based particles
function FloatingParticle({ delay, x, y }: { delay: number; x: number; y: number }) {
  return (
    <motion.div
      className="absolute w-1 h-1 rounded-full bg-gradient-to-br from-violet-400 to-indigo-600 opacity-60"
      style={{ left: `${x}%`, top: `${y}%` }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: [0, 0.8, 0.4, 0.8, 0],
        scale: [0, 1, 0.8, 1.2, 0],
        y: [0, -30, -20, -40, -60],
        x: [0, 10, -10, 5, 0],
      }}
      transition={{
        duration: 6,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

// Magnetic button with smooth cursor tracking
function MagneticButton({ children, onClick, className }: { children: React.ReactNode; onClick: () => void; className?: string }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springConfig = { stiffness: 300, damping: 20 };
  const xSpring = useSpring(x, springConfig);
  const ySpring = useSpring(y, springConfig);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set((e.clientX - centerX) * 0.15);
    y.set((e.clientY - centerY) * 0.15);
  }, [x, y]);

  const handleMouseLeave = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  return (
    <motion.button
      style={{ x: xSpring, y: ySpring }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={className}
    >
      {children}
    </motion.button>
  );
}

export function AboutSplash({ isOpen, onClose }: AboutSplashProps) {
  const controls = useAnimation();
  const [isMounted, setIsMounted] = useState(false);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);

  useEffect(() => {
    setIsMounted(true);
    // Generate random particles
    const newParticles = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 4,
    }));
    setParticles(newParticles);
  }, []);

  useEffect(() => {
    if (isOpen) {
      controls.start("visible");
    } else {
      controls.start("hidden");
    }
  }, [isOpen, controls]);

  if (!isMounted) return null;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.1 }
    },
    exit: { opacity: 0, transition: { duration: 0.3 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: "spring", damping: 20, stiffness: 300 }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden"
        >
          {/* 3D Background Scene */}
          <Splash3DScene />

          {/* Floating CSS Particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {particles.map((p) => (
              <FloatingParticle key={p.id} delay={p.delay} x={p.x} y={p.y} />
            ))}
          </div>

          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-5xl overflow-hidden rounded-3xl border border-white/40 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 shadow-[0_20px_70px_-12px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_70px_-12px_rgba(0,0,0,0.5)] backdrop-blur-2xl"
          >
            {/* Animated gradient border */}
            <div className="absolute inset-0 rounded-3xl p-[1px] gradient-border opacity-50 pointer-events-none" />

            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4 z-20 text-slate-500 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white rounded-full transition-all hover:scale-110"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>

            <motion.div
              className="relative z-10 flex flex-col items-center justify-center p-12"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {/* Header Section */}
              <motion.div className="mb-12 text-center" variants={itemVariants}>
                <motion.div
                  className="mb-6 inline-flex items-center justify-center rounded-full border border-slate-200/50 dark:border-white/10 bg-white/60 dark:bg-slate-800/60 px-4 py-1.5 backdrop-blur-md shadow-sm"
                  whileHover={{ scale: 1.05 }}
                >
                  <Sparkles className="mr-2 h-4 w-4 text-amber-500 icon-glow" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Welcome to the Future of Writing</span>
                </motion.div>

                <h1 className="mb-4 text-5xl font-bold tracking-tight md:text-6xl drop-shadow-sm">
                  <span className="shimmer-text">
                    AI Whisperer's Toolbox
                  </span>
                </h1>

                <motion.p
                  className="mx-auto max-w-2xl text-lg text-slate-600 dark:text-slate-300 font-medium"
                  variants={itemVariants}
                >
                  Create, organize, and explore patterns for better writing and thinking.
                  Inspired by Christopher Alexander's "A Pattern Language".
                </motion.p>
              </motion.div>

              {/* Feature Grid */}
              <motion.div
                className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
                variants={containerVariants}
              >
                {features.map((feature, index) => (
                  <motion.div
                    key={index}
                    className="group relative overflow-hidden rounded-2xl border border-white/50 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 p-6 transition-all duration-300 hover:border-violet-300 dark:hover:border-violet-500/50 hover:bg-white/70 dark:hover:bg-slate-800/70 hover:shadow-xl hover:-translate-y-1 backdrop-blur-sm"
                    variants={itemVariants}
                    whileHover={{
                      boxShadow: "0 20px 40px -12px rgba(139, 92, 246, 0.25)"
                    }}
                  >
                    <motion.div
                      className={`mb-4 inline-flex rounded-xl bg-gradient-to-br ${feature.gradient} p-3 text-white shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl`}
                      whileHover={{ rotate: [0, -10, 10, -5, 0] }}
                      transition={{ duration: 0.5 }}
                    >
                      <span className="group-hover:icon-glow transition-all duration-300">
                        {feature.icon}
                      </span>
                    </motion.div>
                    <h3 className="mb-2 text-lg font-semibold text-slate-800 dark:text-white">{feature.title}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors">
                      {feature.description}
                    </p>

                    {/* Hover glow effect */}
                    <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-r from-violet-500/5 via-purple-500/5 to-indigo-500/5" />
                  </motion.div>
                ))}
              </motion.div>

              {/* Footer Action */}
              <motion.div
                className="mt-12"
                variants={itemVariants}
              >
                <MagneticButton
                  onClick={onClose}
                  className="relative overflow-hidden rounded-full bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 px-10 py-4 text-lg font-semibold text-white shadow-xl transition-all hover:shadow-[0_20px_40px_-12px_rgba(139,92,246,0.5)]"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Get Started
                  </span>
                  {/* Shimmer overlay */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  />
                </MagneticButton>
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Features for the grid
const features = [
  {
    title: "Pattern Creation",
    description: "Create and edit patterns with a powerful markdown editor designed for clarity.",
    icon: <Zap className="h-6 w-6" />,
    gradient: "from-amber-400 to-orange-500",
  },
  {
    title: "AI Assistance",
    description: "Get intelligent suggestions and help from AI as you write and refine ideas.",
    icon: <Sparkles className="h-6 w-6" />,
    gradient: "from-violet-500 to-purple-600",
  },
  {
    title: "Version History",
    description: "Track changes and restore previous versions of your patterns effortlessly.",
    icon: <History className="h-6 w-6" />,
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    title: "Organization",
    description: "Organize patterns in folders and categories for easy access and structure.",
    icon: <FolderKanban className="h-6 w-6" />,
    gradient: "from-emerald-400 to-teal-600",
  },
  {
    title: "Comparison",
    description: "Compare different patterns side by side to find connections and insights.",
    icon: <GitCompare className="h-6 w-6" />,
    gradient: "from-pink-500 to-rose-600",
  },
  {
    title: "Export & Share",
    description: "Export your patterns as markdown files to share with others seamlessly.",
    icon: <Share2 className="h-6 w-6" />,
    gradient: "from-red-500 to-orange-500",
  },
]; 