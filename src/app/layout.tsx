import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import ConfigInitializer from "@/components/config-initializer";
import { TrpcProvider } from '@/components/trpc-provider';
import { AuthProvider } from '@/components/auth/auth-provider';
import { siteConfig } from '@/config/site';
import { initializeMCPServers } from '@/lib/mcp-server-manager';
import fs from 'fs';
import path from 'path';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  icons: {
    icon: [
      {
        url: "/favicon.ico",
        href: "/favicon.ico",
      }
    ]
  }
};

// Flag to track initialization status
let isInitialized = false;

// Initialize the application once at startup
async function initializeApplication() {
  // Only run once
  if (isInitialized) return;
  
  try {
    // Ensure vault directories exist
    const VAULT_DIR = path.join(process.cwd(), 'vault');
    const SYSTEM_DIR = path.join(VAULT_DIR, 'system');
    
    // Create directories if they don't exist
    if (!fs.existsSync(VAULT_DIR)) {
      console.log("Creating vault directory:", VAULT_DIR);
      fs.mkdirSync(VAULT_DIR, { recursive: true });
    }
    
    if (!fs.existsSync(SYSTEM_DIR)) {
      console.log("Creating system directory:", SYSTEM_DIR);
      fs.mkdirSync(SYSTEM_DIR, { recursive: true });
    }
    
    // Initialize MCP servers
    try {
      await initializeMCPServers();
      console.log('MCP servers initialized successfully');
    } catch (error) {
      console.error('Error initializing MCP servers at startup:', error);
    }
    
    // Initialize sessions store
    try {
      await fetch(new URL('/api/initialize', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').toString());
      console.log('Sessions initialized successfully');
    } catch (error) {
      console.error('Error initializing sessions at startup:', error);
    }
    
    // Set flag to prevent re-initialization
    isInitialized = true;
  } catch (error) {
    console.error('Error during application initialization:', error);
  }
}

// Run initialization
initializeApplication();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-background`} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <TrpcProvider>
              <div className="min-h-screen bg-grid">
                <div className="relative">
                  {/* Background gradient effects */}
                  <div className="absolute inset-0 bg-gradient-radial from-primary/5 to-transparent blur-2xl" />
                  <div className="absolute inset-0 bg-gradient-radial from-secondary/5 to-transparent blur-2xl" />
                  
                  {/* Main content */}
                  <div className="relative">
                    <ConfigInitializer />
                    {children}
                    <Toaster />
                  </div>
                </div>
              </div>
            </TrpcProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
