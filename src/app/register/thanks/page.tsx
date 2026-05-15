import Link from "next/link";

export default function ThanksPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-12 text-center">
      <div className="rounded-2xl bg-sl-navy px-6 py-10 text-white">
        <div className="text-5xl">🎳</div>
        <h1 className="mt-4 text-2xl font-medium">
          Welcome to <span className="text-sl-gold">Summer Strikes!</span>
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm opacity-80">
          Your family is registered. We sent a welcome email with login
          instructions and what to expect.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-sl-red px-6 py-3 text-sm font-medium text-white hover:bg-sl-red-dark"
        >
          Log in to your dashboard →
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { n: 1, t: "Tomorrow morning", b: "Your first daily vouchers will be ready in your dashboard at 7am." },
          { n: 2, t: "At the bowling alley", b: "Show your voucher screen to the front desk before bowling." },
          { n: 3, t: "Shoe rental", b: "Standard shoe rental fees still apply — vouchers cover the games only." },
        ].map((s) => (
          <div key={s.n} className="rounded-2xl border border-black/5 bg-white p-4 text-left shadow-sm">
            <div className="text-[11px] font-medium uppercase tracking-wider text-sl-navy/50">
              Step {s.n} · {s.t}
            </div>
            <p className="mt-1.5 text-sm text-sl-navy">{s.b}</p>
          </div>
        ))}
      </div>

      <Link href="/" className="mt-8 inline-block text-xs text-sl-navy/50 hover:text-sl-navy">
        ← Back to home
      </Link>
    </main>
  );
}
