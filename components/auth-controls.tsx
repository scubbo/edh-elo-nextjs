"use client";

import { signIn, signOut } from "next-auth/react";
import type { Session } from "next-auth";

type Props = {
  session: Session | null;
};

export function AuthControls({ session }: Props) {
  if (session?.user) {
    return (
      <div className="flex items-center space-x-3">
        <span className="max-w-[160px] truncate text-sm text-slate-600">
          {session.user.name ?? session.user.email}
        </span>
        <button
          type="button"
          onClick={() => signOut()}
          className="cursor-pointer rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-slate-700"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => signIn("google")}
      className="cursor-pointer rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-amber-500"
    >
      Sign in
    </button>
  );
}
