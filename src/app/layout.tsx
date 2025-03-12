import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import ConfigInitializer from "@/components/config-initializer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "A Pattern Language Editor",
  description: "A Pattern Language Design Editor",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ConfigInitializer />
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
