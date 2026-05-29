"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { resetPassword } from "./actions";

export default function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }
    setSubmitting(true);
    try {
      const r = await resetPassword(token, password);
      if (!r.ok) {
        setError(r.error || "Couldn't reset");
        setSubmitting(false);
        return;
      }
      // Auto-sign-in
      const signInRes = await signIn("credentials", {
        email: r.email,
        password,
        redirect: false,
      });
      if (signInRes?.error) {
        // Reset worked but auto-sign-in didn't — send them to login
        router.push("/login?reset=1");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Try again.");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="mt-5 space-y-3">
      <div>
        <label className="mb-1 block text-xs text-sl-navy/60">New password</label>
        <input
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          className="h-10 w-full rounded-md border border-black/10 bg-sl-light px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sl-navy/20"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-sl-navy/60">Confirm password</label>
        <input
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          minLength={6}
          className="h-10 w-full rounded-md border border-black/10 bg-sl-light px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sl-navy/20"
        />
      </div>
      {error && (
        <p className="rounded-md bg-sl-red/10 px-3 py-2 text-sm text-sl-red">{error}</p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-sl-red px-4 py-3 text-sm font-medium text-white hover:bg-sl-red-dark disabled:opacity-50"
      >
        {submitting ? "Saving…" : "Save password & sign in"}
      </button>
    </form>
  );
}
