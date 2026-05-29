import Link from "next/link";

type FaqItem = { q: string; a: string };

const FAQS: { category: string; items: FaqItem[] }[] = [
  {
    category: "Getting started",
    items: [
      {
        q: "Who can register?",
        a: "Any parent or legal guardian of children ages 2–15 who live in their household. One account per household — you can add up to 8 children.",
      },
      {
        q: "Is there a cost to register?",
        a: "No. Summer Strikes registration is completely free.",
      },
      {
        q: "How do I get my daily vouchers?",
        a: "Vouchers refresh in your dashboard each morning at 7am. If you opted in to text alerts, we'll send a reminder. Log in any time at manorlanes.com to view today's vouchers.",
      },
      {
        q: "Can I add more children later?",
        a: "Yes — log into your account, go to your dashboard, and contact us to add a child. They must be ages 2–15 and live in your household.",
      },
    ],
  },
  {
    category: "At the bowling alley",
    items: [
      {
        q: "Is shoe rental included?",
        a: "No — standard shoe rental rates apply and are not included in the Summer Strikes program. Vouchers cover the 2 games of bowling only.",
      },
      {
        q: "How do I redeem a voucher?",
        a: "Open your dashboard, tap 'Show vouchers at the desk', and show the front-of-house screen to our staff. They'll mark your vouchers as redeemed once your games begin.",
      },
      {
        q: "Do I need to make a reservation?",
        a: "Walk-ins are welcome during program hours, but lanes are first-come, first-served. On busy weekends, calling ahead is a good idea.",
      },
      {
        q: "Can this be used for daycare, camp, or group outings?",
        a: "No. This program is for individual family use only. It is not valid for daycare outings, camps, business groups, or birthday parties.",
      },
    ],
  },
  {
    category: "Schedule",
    items: [
      {
        q: "When can my kids bowl?",
        a: "Monday through Friday: 5pm–11pm. Saturdays: every other Saturday 5pm–11pm, starting May 30, 2026 (May 30, June 13, June 27, July 11, July 25, August 8, August 22). We're closed for Summer Strikes on Sundays.",
      },
      {
        q: "When does the program run?",
        a: "Summer Strikes runs June 1 through August 31. Vouchers will be available every program day during that window.",
      },
      {
        q: "How do I know if lanes are open right now?",
        a: "Your dashboard shows a live availability badge powered by Manor Lanes' lane management system — refreshes every 5 minutes. You'll see how many lanes are open the moment you log in.",
      },
    ],
  },
  {
    category: "Family Pass — adults 16+",
    items: [
      {
        q: "What is the Family Pass?",
        a: "The Family Pass lets older teens and adults (age 16 and up) join Summer Strikes alongside the kids. Each paid member gets 2 free games of bowling per day, just like the kids — for the entire summer. It's $49.95 per person, one-time for the season.",
      },
      {
        q: "Do I need a Family Pass for my kids to bowl?",
        a: "No — kids ages 2–15 bowl free with Summer Strikes regardless of whether you buy a Family Pass. The pass is only for additional household members age 16+.",
      },
      {
        q: "How much does the Family Pass cost?",
        a: "$49.95 per person, age 16 and up, for the entire Summer Strikes season (June 1 – August 31). No monthly fees, no renewals — one payment covers the whole summer.",
      },
      {
        q: "Can I add Family Pass members after I've already registered?",
        a: "Yes. Log into your dashboard and click 'Add Family Pass adult'. You can add as many as you'd like, anytime during the season.",
      },
      {
        q: "Who can use a Family Pass?",
        a: "Family members in your household age 16 and up. Each pass is tied to a named person and is non-transferable. The pass covers 2 games per day during Summer Strikes program hours.",
      },
      {
        q: "Is there a refund if I don't use it?",
        a: "Family Pass payments are non-refundable. We recommend adding adults only when you know they'll bowl regularly through the summer.",
      },
    ],
  },
  {
    category: "Text alerts",
    items: [
      {
        q: "How do I sign up for text alerts?",
        a: "Check the SMS consent box during registration. You can also turn alerts on or off from your dashboard at any time.",
      },
      {
        q: "How do I stop receiving texts?",
        a: "Reply STOP to any text from us, or toggle alerts off in your dashboard. You'll continue to have full program access — only the texts stop.",
      },
      {
        q: "Will I get marketing texts?",
        a: "We only send program-related texts: daily voucher reminders, schedule changes, and occasional Manor Lanes program announcements. We don't share your number with third parties.",
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
      <Link href="/" className="text-xs text-sl-navy/60 hover:text-sl-navy">
        ← Summer Strikes
      </Link>
      <h1 className="mt-4 text-2xl font-medium text-sl-navy">
        Frequently asked <span className="text-sl-gold">questions</span>
      </h1>
      <p className="mt-2 text-sm text-sl-navy/60">
        Can&apos;t find what you&apos;re looking for? Call Manor Lanes during business hours.
      </p>

      <div className="mt-6 space-y-6">
        {FAQS.map((cat) => (
          <section key={cat.category}>
            <h2 className="text-[11px] font-medium uppercase tracking-wider text-sl-navy/60">
              {cat.category}
            </h2>
            <div className="mt-2 divide-y divide-black/5 rounded-2xl border border-black/5 bg-white shadow-sm">
              {cat.items.map((item) => (
                <details key={item.q} className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer items-start justify-between gap-3 text-sm font-medium text-sl-navy">
                    {item.q}
                    <span className="select-none text-sl-navy/40 transition group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-sl-navy/70">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-10 rounded-2xl bg-sl-navy p-6 text-center text-white">
        <p className="text-sm sm:text-base">Ready to bowl free all summer?</p>
        <Link
          href="/register"
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-sl-red px-6 py-3 text-sm font-medium text-white hover:bg-sl-red-dark"
        >
          Register your family →
        </Link>
      </div>
    </main>
  );
}
