"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";

export function SignOutButton() {
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <button
      className="px-4 py-2 border-2 border-black hover:bg-black hover:text-white transition-colors font-mono font-bold"
      onClick={() => void signOut()}
    >
      SIGN OUT
    </button>
  );
}
