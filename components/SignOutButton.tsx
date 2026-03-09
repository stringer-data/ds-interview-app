"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      className="btn btn-ghost"
      style={{ padding: "0.4rem 0.8rem", fontSize: "0.9rem" }}
      onClick={() => signOut({ callbackUrl: "/" })}
    >
      Sign out
    </button>
  );
}
