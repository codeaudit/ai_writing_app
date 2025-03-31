'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileText, MessageSquare, Settings } from 'lucide-react';

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
    }
  ];
  
  return (
    <div className="border-b">
      <div className="flex h-10 items-center px-4">
        <nav className="flex items-center space-x-4">
          {routes.map((route) => (
            <Button
              key={route.href}
              variant={route.active ? 'default' : 'ghost'}
              size="sm"
              asChild
            >
              <Link href={route.href}>
                {route.icon}
                {route.label}
              </Link>
            </Button>
          ))}
        </nav>
      </div>
    </div>
  );
} 