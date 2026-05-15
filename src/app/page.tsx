import Link from "next/link";

const SCHEDULE: { day: string; hours: string; closed?: boolean }[] = [
  { day: "Monday", hours: "Not available", closed: true },
  { day: "Tuesday", hours: "11:00am – 5:00pm" },
  { day: "Wednesday", hours: "11:00am – 5:00pm" },
  { day: "Thursday", hours: "11:00am – 10:00pm" },
  { day: "Friday", hours: "4:00pm – 6:00pm" },
  { day: "Saturday", hours: "11:00am – 5:00pm" },
  { day: "Sunday", hours: "Not available", closed: true },
];

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-sl-navy px-7 py-10 text-white sm:px-10 sm:py-14">
        <span className="inline-block rounded-full bg-sl-red px-3 py-1 text-[11px] font-medium uppercase tracking-wider">
          Manor Lanes · Summer 2026
        </span>
        <h1 className="mt-3 text-3xl font-medium leading-tight sm:text-5xl">
          Summer <span className="text-sl-gold">Strikes</span>
          <br />
          Bowl Free All Summer
        </h1>
        <p className="mt-3 max-w-md text-sm opacity-80 sm:text-base">
          Register your kids (ages 2–15) for 2 free games of bowling every
          single day — all summer long.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs">
            2 free games/day
          </span>
          <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs">
            Ages 2–15
          </span>
          <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs">
            Jun 1 – Aug 31
          </span>
        </div>
        <Link
          href="/register"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-sl-red px-6 py-3 text-sm font-medium text-white transition hover:bg-sl-red-dark"
        >
          Register now →
        </Link>
        <div className="pointer-events-none absolute -bottom-2 right-5 text-7xl opacity-10 sm:text-9xl">
          🎳
        </div>
      </section>

      {/* How it works */}
      <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          {
            n: 1,
            title: "Register",
            body: "Create a free family account in minutes",
          },
          {
            n: 2,
            title: "Get your pass",
            body: "Receive digital vouchers via email & text",
          },
          {
            n: 3,
            title: "Bowl free",
            body: "Show your pass at the desk — bowl!",
          },
        ].map((s) => (
          <div
            key={s.n}
            className="rounded-2xl border border-black/5 bg-white p-5 text-center shadow-sm"
          >
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-sl-navy text-sm font-medium text-white">
              {s.n}
            </div>
            <h3 className="mt-3 text-sm font-medium text-sl-navy">{s.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-sl-navy/60">
              {s.body}
            </p>
          </div>
        ))}
      </section>

      {/* Offer cards */}
      <section className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-black/5 bg-sl-light p-5">
          <h4 className="text-[11px] font-medium uppercase tracking-wider text-sl-navy/60">
            Special offer
          </h4>
          <p className="mt-1 text-sm font-medium text-sl-navy">
            2 Free Games Per Day, Per Child
          </p>
        </div>
        <div className="rounded-2xl border border-black/5 bg-sl-light p-5">
          <h4 className="text-[11px] font-medium uppercase tracking-wider text-sl-navy/60">
            Age requirement
          </h4>
          <p className="mt-1 text-sm font-medium text-sl-navy">
            Children ages 2–15
          </p>
        </div>
      </section>

      {/* Schedule */}
      <section className="mt-4 rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
        <h4 className="text-[11px] font-medium uppercase tracking-wider text-sl-navy/60">
          Available times
        </h4>
        <table className="mt-3 w-full text-sm">
          <tbody>
            {SCHEDULE.map((row) => (
              <tr key={row.day} className="border-b border-black/5 last:border-0">
                <td className="py-2 text-sl-navy/60">{row.day}</td>
                <td
                  className={`py-2 text-right ${
                    row.closed ? "text-sl-navy/30" : "text-sl-navy"
                  }`}
                >
                  {row.hours}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* CTA */}
      <section className="mt-6 rounded-2xl bg-sl-navy p-6 text-center text-white">
        <p className="text-base font-medium sm:text-lg">
          Ready to bowl free all summer?
        </p>
        <Link
          href="/register"
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-sl-red px-6 py-3 text-sm font-medium text-white transition hover:bg-sl-red-dark"
        >
          Register your family →
        </Link>
      </section>

      {/* Footer */}
      <footer className="mt-8 pb-4 text-center text-xs text-sl-navy/40">
        Manor Lanes · Summer Strikes 2026 ·{" "}
        <Link href="/faq" className="hover:text-sl-navy">
          FAQ
        </Link>
      </footer>
    </main>
  );
}
