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
        a: "Tuesday, Wednesday, Saturday: 11am–5pm. Thursday: 11am–10pm. Friday: 4–6pm. We're closed for Summer Strikes on Monday and Sunday.",
      },
      {
        q: "When does the program run?",
        a: "Summer Strikes runs June 1 through August 31. Vouchers will be available every program day during that window.",
      },
    ],
  },
  {
    category: "Family Pass (optional)",
    items: [
      {
        q: "What is the Family Pass?",
        a: "The Family Pass is a paid upgrade that lets adults bowl alongside their children during Summer Strikes hours. It's a one-time seasonal fee, available during or after registration.",
      },
      {
        q: "Do I need a Family Pass for my kids to bowl?",
        a: "No — kids bowl free with Summer Strikes regardless of whether you buy a Family Pass. The pass is only for adults who want to bowl with them.",
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
