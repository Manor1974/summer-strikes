import Link from "next/link";
import { existsSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";

// Print-friendly staff guide. Save as PDF: Cmd+P -> Save as PDF.
// Designed for letter paper (8.5" x 11"); two pages if printed.
export default function StaffGuidePage() {
  const publicDir = join(process.cwd(), "public");
  const logoSrc = existsSync(join(publicDir, "manor-lanes-logo.svg"))
    ? "/manor-lanes-logo.svg"
    : existsSync(join(publicDir, "manor-lanes-logo.png"))
    ? "/manor-lanes-logo.png"
    : null;

  return (
    <>
      {/* Print stylesheet — hide the admin chrome and force black-on-white-ish */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @page { size: letter; margin: 0.5in; }
            @media print {
              nav, .no-print { display: none !important; }
              body { background: white !important; }
              main { padding: 0 !important; max-width: none !important; }
              .page-break { page-break-after: always; }
            }
          `,
        }}
      />

      <div className="no-print mb-4 flex items-center justify-between rounded-2xl border border-sl-gold/30 bg-sl-gold/10 px-4 py-3">
        <p className="text-sm text-sl-navy">
          <strong>Save as PDF or print:</strong> press <kbd className="rounded border border-black/20 bg-white px-1.5 py-0.5 text-xs">Cmd</kbd> + <kbd className="rounded border border-black/20 bg-white px-1.5 py-0.5 text-xs">P</kbd> and pick &ldquo;Save as PDF&rdquo; (or print to a real printer).
        </p>
        <button
          onClick={() => window.print()}
          className="rounded-md bg-sl-navy px-3 py-1.5 text-xs font-medium text-white hover:bg-sl-navy-light no-print"
          // Server component — onClick won't work without 'use client'. Hide via CSS instead.
          style={{ display: "none" }}
        >
          Print
        </button>
      </div>

      <article className="mx-auto max-w-3xl bg-white p-8 text-sl-navy print:p-0">
        {/* Header band */}
        <header className="flex items-center justify-between border-b-2 border-sl-navy pb-4">
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoSrc} alt="Manor Lanes" className="h-14 w-auto" />
          ) : (
            <span className="text-xl font-black tracking-tight">MANOR LANES</span>
          )}
          <div className="text-right">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-sl-navy/60">
              Staff guide
            </p>
            <h1 className="mt-0.5 text-2xl font-bold">
              Summer <span className="text-sl-gold">Strikes</span> 2026
            </h1>
          </div>
        </header>

        {/* Overview */}
        <section className="mt-6">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-sl-navy/60">
            The program
          </h2>
          <p className="mt-2 text-sm leading-relaxed">
            <strong>Summer Strikes</strong> is Manor Lanes&apos; free summer
            bowling program for kids ages 2&ndash;15. Registered children get{" "}
            <strong>2 free games per day</strong> during program hours, every
            program day from <strong>June 1 through August 31</strong>.
            Family members age 16+ can join via a one-time{" "}
            <strong>Family Pass ($49.95/person)</strong> for the same daily
            benefit.
          </p>
        </section>

        {/* Schedule */}
        <section className="mt-5 rounded-lg border border-sl-navy/15 bg-sl-light p-4">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-sl-navy/60">
            Program hours
          </h2>
          <table className="mt-2 w-full text-sm">
            <tbody>
              {[
                ["Monday", null],
                ["Tuesday", "11:00am – 5:00pm"],
                ["Wednesday", "11:00am – 5:00pm"],
                ["Thursday", "11:00am – 10:00pm"],
                ["Friday", "4:00pm – 6:00pm"],
                ["Saturday", "11:00am – 5:00pm"],
                ["Sunday", null],
              ].map(([day, hours]) => (
                <tr key={day} className="border-b border-sl-navy/10 last:border-0">
                  <td className="py-1.5 font-medium">{day}</td>
                  <td className="py-1.5 text-right">
                    {hours ?? <span className="text-sl-navy/40">closed for Summer Strikes</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* How to redeem */}
        <section className="mt-6">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-sl-navy/60">
            How to redeem a voucher
          </h2>
          <ol className="mt-2 space-y-2 pl-6 text-sm leading-relaxed">
            <li>
              <strong>Customer shows their phone</strong> with a QR code per
              family member (one for each kid, one for each Family Pass adult).
              They&apos;ll come from the customer&apos;s dashboard at{" "}
              <em>summer.manorlanes.com/dashboard</em>.
            </li>
            <li>
              <strong>Scan each QR with the front-desk iPad&apos;s camera.</strong>{" "}
              The voucher detail page opens automatically &mdash; it shows the
              family member&apos;s name, age, and a big red &ldquo;Mark
              redeemed&rdquo; button.
            </li>
            <li>
              <strong>Confirm the name matches</strong> the person you&apos;re
              checking in. If a kid&apos;s name doesn&apos;t match, do not
              redeem &mdash; politely ask the parent.
            </li>
            <li>
              <strong>Tap &ldquo;Mark redeemed.&rdquo;</strong> The voucher
              flips to a green &ldquo;Redeemed&rdquo; badge. The customer&apos;s
              dashboard updates instantly. The family is good to start
              bowling.
            </li>
            <li>
              <strong>Once per day, per family member.</strong> If they try to
              come back later the same day, the voucher will already show as
              redeemed and the page will say so.
            </li>
          </ol>
        </section>

        {/* Important notes */}
        <section className="mt-6 rounded-lg border-2 border-sl-red/40 bg-sl-red/5 p-4">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-sl-red">
            Important — please remember
          </h2>
          <ul className="mt-2 space-y-1.5 pl-5 text-sm leading-relaxed text-sl-navy">
            <li>
              <strong>Shoe rental is NOT included.</strong> Charge the standard
              shoe rental rate for every person bowling.
            </li>
            <li>
              The 2 free games per day is <strong>per registered family
              member</strong>, not per family.
            </li>
            <li>
              <strong>No daycares, camps, business outings, or party groups.</strong>{" "}
              This is for individual family use only. If a group shows up
              wanting to use Summer Strikes vouchers as a discount, politely
              decline and offer normal group pricing.
            </li>
            <li>
              <strong>Photo IDs not required</strong> &mdash; the QR code +
              the name match is the verification.
            </li>
            <li>
              Lanes are <strong>first-come, first-served</strong>. On busy
              weekends, walk-ins may need to wait.
            </li>
          </ul>
        </section>

        <div className="page-break"></div>

        {/* Page 2 — FAQ */}
        <section className="mt-6">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-sl-navy/60">
            Common questions from customers
          </h2>
          <dl className="mt-2 space-y-3 text-sm leading-relaxed">
            <div>
              <dt className="font-bold">&ldquo;How do I sign up?&rdquo;</dt>
              <dd className="mt-0.5 pl-1">
                Direct them to <em>summer.manorlanes.com</em>. It&apos;s a free
                online registration. Kids 2&ndash;15 are free; adults 16+ are
                $49.95/person.
              </dd>
            </div>
            <div>
              <dt className="font-bold">&ldquo;I forgot my password.&rdquo;</dt>
              <dd className="mt-0.5 pl-1">
                There&apos;s no self-serve reset yet. Take their email and
                let the manager know &mdash; we can reset it from the admin
                panel.
              </dd>
            </div>
            <div>
              <dt className="font-bold">
                &ldquo;Can I add more kids/adults later?&rdquo;
              </dt>
              <dd className="mt-0.5 pl-1">
                Adults: yes &mdash; from their dashboard, &ldquo;+ Add Family
                Pass adult.&rdquo; New kids: take the parent&apos;s email and
                ask the manager to add them from the admin panel.
              </dd>
            </div>
            <div>
              <dt className="font-bold">
                &ldquo;My voucher already says redeemed and I haven&apos;t
                bowled.&rdquo;
              </dt>
              <dd className="mt-0.5 pl-1">
                Don&apos;t panic. Confirm the family name, then ask the
                manager to undo the redemption from the admin panel
                (Today&apos;s vouchers table has an Undo button).
              </dd>
            </div>
            <div>
              <dt className="font-bold">
                &ldquo;Can I bowl on Mondays or Sundays?&rdquo;
              </dt>
              <dd className="mt-0.5 pl-1">
                Not as part of Summer Strikes &mdash; we&apos;re closed for
                the program those days. Normal lane pricing still applies if
                they want to bowl.
              </dd>
            </div>
            <div>
              <dt className="font-bold">
                &ldquo;Why do I have to pay shoe rental?&rdquo;
              </dt>
              <dd className="mt-0.5 pl-1">
                Summer Strikes covers the 2 games of bowling only. Shoe rental
                is a separate item, same as any normal visit.
              </dd>
            </div>
            <div>
              <dt className="font-bold">
                &ldquo;Can my friend use my voucher?&rdquo;
              </dt>
              <dd className="mt-0.5 pl-1">
                No &mdash; vouchers are tied to a specific registered person.
                The QR shows the name; if the name doesn&apos;t match the
                person standing at the desk, don&apos;t redeem.
              </dd>
            </div>
          </dl>
        </section>

        {/* Quick reference */}
        <section className="mt-6 rounded-lg bg-sl-navy p-4 text-white">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] opacity-70">
            Quick reference
          </h2>
          <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-[11px] opacity-60">Family Pass price</p>
              <p className="text-base font-semibold">$49.95 / adult</p>
            </div>
            <div>
              <p className="text-[11px] opacity-60">Free for kids ages</p>
              <p className="text-base font-semibold">2 – 15</p>
            </div>
            <div>
              <p className="text-[11px] opacity-60">Family Pass for ages</p>
              <p className="text-base font-semibold">16 +</p>
            </div>
            <div>
              <p className="text-[11px] opacity-60">Daily allotment</p>
              <p className="text-base font-semibold">2 free games / day</p>
            </div>
            <div>
              <p className="text-[11px] opacity-60">Program runs</p>
              <p className="text-base font-semibold">Jun 1 – Aug 31, 2026</p>
            </div>
            <div>
              <p className="text-[11px] opacity-60">Customer site</p>
              <p className="text-base font-semibold">summer.manorlanes.com</p>
            </div>
          </div>
        </section>

        <footer className="mt-8 border-t border-sl-navy/10 pt-3 text-center text-[11px] text-sl-navy/50">
          Manor Lanes &middot; Summer Strikes 2026 staff guide &middot; questions?
          Ask the manager or check the admin panel.
        </footer>
      </article>

      <div className="no-print mt-6 text-center">
        <Link
          href="/admin"
          className="text-sm text-sl-navy/60 hover:text-sl-navy"
        >
          ← Back to admin
        </Link>
      </div>
    </>
  );
}
