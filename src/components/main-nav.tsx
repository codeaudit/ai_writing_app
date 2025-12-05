'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { FileText, MessageSquare, Settings, BookText, Lock } from 'lucide-react';
import { LoginButton } from './auth/login-button';

export function MainNav() {
  const pathname = usePathname();

  const routes = [
    {
      href: '/',
      label: 'Documents',
      icon: <FileText className="h-4 w-4 mr-2" />,
      active: pathname === '/'
    },
    {
      href: '/chat',
      label: 'AI Chat',
      icon: <MessageSquare className="h-4 w-4 mr-2" />,
      active: pathname === '/chat'
    },
    {
      href: '/settings',
      label: 'Settings',
      icon: <Settings className="h-4 w-4 mr-2" />,
      active: pathname === '/settings'
    },
    {
      href: '/history',
      label: 'History',
      icon: <BookText className="h-4 w-4 mr-2" />,
      active: pathname === '/history'
    },
    {
      href: '/protected',
      label: 'Protected',
      icon: <Lock className="h-4 w-4 mr-2" />,
      active: pathname === '/protected'
    }
  ];

  return (
    <div className="border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
      {/* Gradient border effect */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" />

      <div className="flex h-12 items-center px-4">
        <nav className="flex items-center space-x-1 relative">
          {routes.map((route) => (
            <motion.div
              key={route.href}
              className="relative"
              whileHover={{ y: -1 }}
              transition={{ duration: 0.2 }}
            >
              <Button
                variant={route.active ? 'default' : 'ghost'}
                size="sm"
                asChild
                className={`relative transition-all duration-300 ${route.active
                    ? 'bg-primary/90 text-primary-foreground shadow-md shadow-primary/20'
                    : 'hover:bg-accent/60 text-muted-foreground hover:text-foreground'
                  }`}
              >
                <Link href={route.href} className="flex items-center">
                  <span className={`transition-transform duration-300 ${route.active ? 'scale-110' : 'group-hover:scale-105'}`}>
                    {route.icon}
                  </span>
                  {route.label}
                </Link>
              </Button>

              {/* Active indicator glow */}
              {route.active && (
                <motion.div
                  layoutId="activeNavIndicator"
                  className="absolute -bottom-[0.5px] left-2 right-2 h-[2px] bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 rounded-full"
                  initial={{ opacity: 0, scaleX: 0 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </motion.div>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <LoginButton />
        </div>
      </div>
    </div>
  );
} 