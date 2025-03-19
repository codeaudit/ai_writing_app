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
  description: "AI Whispere Toolbox",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ElectronProvider>
            <ConfigInitializer />
            {children}
            <Toaster />
          </ElectronProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
