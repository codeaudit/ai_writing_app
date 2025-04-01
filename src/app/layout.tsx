import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import ConfigInitializer from "@/components/config-initializer";
import ElectronProvider from '@/components/electron-provider';
import { TrpcProvider } from '@/components/trpc-provider';
import { siteConfig } from '@/config/site';
import { initializeMCPServers } from '@/lib/mcp-server-manager';

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

// Initialize MCP servers as soon as the app loads
initializeMCPServers().catch(error => {
  console.error('Error initializing MCP servers at startup:', error);
});

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
          <ElectronProvider>
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
          </ElectronProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
