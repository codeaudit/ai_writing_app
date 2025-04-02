"use client";

import { AuthCheck } from "@/components/auth/auth-check";
import { MainNav } from "@/components/main-nav";
import { useSession } from "next-auth/react";

export default function ProtectedPage() {
  const { data: session } = useSession();
  
  return (
    <AuthCheck>
      <MainNav />
      <div className="container mx-auto py-10">
        <h1 className="text-3xl font-bold mb-4">Protected Page</h1>
        <p className="mb-4">This page is only accessible to authenticated users.</p>
        
        <div className="bg-card border rounded-lg p-4 mb-4">
          <h2 className="text-xl font-semibold mb-2">Your Session</h2>
          <pre className="bg-muted p-4 rounded-md overflow-auto">
            {JSON.stringify(session, null, 2)}
          </pre>
        </div>
      </div>
    </AuthCheck>
  );
} 