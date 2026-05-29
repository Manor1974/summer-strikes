"use client";

import { useState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "./actions";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Note: action always returns ok regardless of whether the email exists
      // (to avoid leaking account existence). The actual email only goes out
      // if the email is registered.
      await requestPasswordReset(email);
    } finally {
      setSubmitting(false);
      setSubmitted(true);
    }
  };

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <Link
        href="/"
        className="flex items-center gap-2 text-sm font-bold tracking-tight text-sl-navy"
      >
        MANOR LANES
        <span className="text-xs font-normal text-sl-navy/30">·</span>
        <span className="text-xs font-normal text-sl-navy/60">
          Summer <span className="text-sl-gold">Strikes</span>
        </span>
      </Link>

      <div className="mt-6 rounded-2xl border border-black/5 bg-white p-7 shadow-sm">
        <h1 className="text-xl font-medium text-sl-navy">
          Forgot your <span className="text-sl-gold">password</span>?
        </h1>
        <p className="mt-1 text-sm text-sl-navy/60">
          Enter your email and we&apos;ll send you a link to set a new one.
        </p>

        {submitted ? (
          <div className="mt-5 rounded-md bg-[#EAF3DE] px-4 py-3 text-sm text-[#3B6D11]">
            ✓ Check your inbox. If we have an account for <strong>{email}</strong>,
            you&apos;ll receive a password reset link within a minute. The link
            is good for 1 hour.
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-5 space-y-3">
            <div>
              <label className="mb-1 block text-xs text-sl-navy/60">Email</label>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 w-full rounded-md border border-black/10 bg-sl-light px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sl-navy/20"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-sl-red px-4 py-3 text-sm font-medium text-white hover:bg-sl-red-dark disabled:opacity-50"
            >
              {submitting ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}

        <p className="mt-5 text-center text-xs text-sl-navy/60">
          Remembered it?{" "}
          <Link href="/login" className="font-medium text-sl-red hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
