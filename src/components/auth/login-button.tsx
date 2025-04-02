"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { Button } from "../ui/button";
import { User } from "lucide-react";

export function LoginButton() {
  const { data: session, status } = useSession();
  const isLoading = status === "loading";

  if (isLoading) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <User className="h-4 w-4 mr-2" />
        Loading...
      </Button>
    );
  }

  if (session?.user) {
    return (
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => signOut()}
      >
        <User className="h-4 w-4 mr-2" />
        {session.user.name || "Sign out"}
      </Button>
    );
  }

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={() => signIn()}
    >
      <User className="h-4 w-4 mr-2" />
      Sign in
    </Button>
  );
} 