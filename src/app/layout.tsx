import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import ConfigInitializer from "@/components/config-initializer";
import ElectronProvider from '@/components/electron-provider';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "The AI Whisperer's Toolbox",
  description: "AI Whisperer Toolbox",
};

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
          </ElectronProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
