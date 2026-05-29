"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginShell />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginShell({ children }: { children?: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <Link href="/" className="flex items-center gap-2 text-sm font-bold tracking-tight text-sl-navy">
        MANOR LANES
        <span className="text-xs font-normal text-sl-navy/30">·</span>
        <span className="text-xs font-normal text-sl-navy/60">
          Summer <span className="text-sl-gold">Strikes</span>
        </span>
      </Link>
      <div className="mt-6 rounded-2xl bg-white p-7 shadow-sm border border-black/5">
        <h1 className="text-xl font-medium text-sl-navy">
          Welcome <span className="text-sl-gold">back</span>
        </h1>
        <p className="mt-1 text-sm text-sl-navy/60">
          Log in to see today&apos;s vouchers.
        </p>
        {children}
      </div>
    </main>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const explicitCallback = params.get("callbackUrl");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    if (res?.error) {
      setError("Invalid email or password.");
      setSubmitting(false);
      return;
    }

    // If user was bounced to login from a specific page, send them back there.
    // Otherwise pick a sensible default based on their role:
    //   ADMIN / STAFF → /admin
    //   PARENT        → /dashboard
    let target = explicitCallback;
    if (!target) {
      try {
        const session = await fetch("/api/auth/session", {
          cache: "no-store",
        }).then((r) => r.json());
        const role = session?.user?.role;
        target = role === "ADMIN" || role === "STAFF" ? "/admin" : "/dashboard";
      } catch {
        target = "/dashboard";
      }
    }
    router.push(target);
    router.refresh();
  };

  return (
    <LoginShell>
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
        <div>
          <label className="mb-1 block text-xs text-sl-navy/60">Password</label>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-10 w-full rounded-md border border-black/10 bg-sl-light px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sl-navy/20"
          />
        </div>
        {error && (
          <p className="rounded-md bg-sl-red/10 px-3 py-2 text-sm text-sl-red">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="mt-2 w-full rounded-md bg-sl-red px-4 py-3 text-sm font-medium text-white transition hover:bg-sl-red-dark disabled:opacity-50"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-3 text-center text-xs text-sl-navy/60">
        <Link href="/forgot-password" className="hover:text-sl-navy">
          Forgot your password?
        </Link>
      </p>

      <p className="mt-3 text-center text-xs text-sl-navy/60">
        New here?{" "}
        <Link href="/register" className="font-medium text-sl-red hover:underline">
          Register your family
        </Link>
      </p>
    </LoginShell>
  );
}
