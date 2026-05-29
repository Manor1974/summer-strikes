import { prisma } from "@/lib/prisma";
import ResyncButton from "./resync-button";

export const dynamic = "force-dynamic";

export default async function ConquerorPage() {
  const [kidsCount, adultsCount, recent] = await Promise.all([
    prisma.child.count(),
    prisma.adult.count(),
    prisma.child.findMany({
      orderBy: { bowlerNumber: "desc" },
      take: 10,
      select: {
        bowlerNumber: true,
        name: true,
        age: true,
        createdAt: true,
        user: { select: { lastName: true } },
      },
    }),
  ]);
  const recentAdults = await prisma.adult.findMany({
    orderBy: { bowlerNumber: "desc" },
    take: 5,
    select: {
      bowlerNumber: true,
      name: true,
      age: true,
      createdAt: true,
    },
  });

  return (
    <>
      <h1 className="text-xl font-medium text-sl-navy">Conqueror / FBT export</h1>
      <p className="mt-1 text-sm text-sl-navy/60">
        Every registered Summer Strikes bowler gets a unique 4-digit bowler
        ID starting at 1000. They auto-POST to{" "}
        <code>manorlanes.com/lm/summer-strikes-receiver.php</code> for the
        FRONTDESK1 poller to pick up and import into Conqueror.
      </p>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Metric value={kidsCount} label="Children registered" />
        <Metric value={adultsCount} label="Family Pass adults" />
        <Metric value={kidsCount + adultsCount} label="Total bowlers" />
      </div>

      <section className="mt-5 rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-medium text-sl-navy">Manual XML export</h2>
        <p className="mt-1 text-xs text-sl-navy/60">
          Generates a UTF-16 LE <code>FBT.xml</code> matching Conqueror&apos;s
          export format. Drop it into the FBT import folder on FRONTDESK1 to
          ingest all current Summer Strikes bowlers in one shot. Each bowler
          uses their first name as the <code>NickName</code> so the lane
          overhead shows just &ldquo;Emma&rdquo; not &ldquo;Emma Russo.&rdquo;
        </p>
        <a
          href="/api/admin/fbt-export"
          className="mt-3 inline-block rounded-md bg-sl-navy px-4 py-2 text-sm font-medium text-white hover:bg-sl-navy-light"
          download
        >
          Download FBT.xml
        </a>
      </section>

      <section className="mt-4 rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-medium text-sl-navy">Re-sync to receiver</h2>
        <p className="mt-1 text-xs text-sl-navy/60">
          Force-POST every existing bowler to the WP receiver. Use after
          deploying <code>summer-strikes-receiver.php</code> for the first
          time, or to recover from an outage where new registrations
          couldn&apos;t reach <code>manorlanes.com</code>.
        </p>
        <div className="mt-3">
          <ResyncButton />
        </div>
      </section>

      <section className="mt-5">
        <h2 className="text-[11px] font-medium uppercase tracking-wider text-sl-navy/60">
          Most recent bowler IDs
        </h2>
        <div className="mt-2 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-sl-light text-left text-[11px] font-medium uppercase tracking-wider text-sl-navy/60">
              <tr>
                <th className="px-4 py-2">Bowler ID</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Age</th>
                <th className="px-4 py-2 text-right">Registered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {[...recentAdults.map((a) => ({ ...a, kind: "Adult" as const })),
                ...recent.map((c) => ({ ...c, kind: "Child" as const }))]
                .sort((a, b) => b.bowlerNumber - a.bowlerNumber)
                .slice(0, 15)
                .map((b) => (
                  <tr key={`${b.kind}-${b.bowlerNumber}`}>
                    <td className="px-4 py-2 font-mono text-sl-navy">
                      {String(b.bowlerNumber).padStart(4, "0")}
                    </td>
                    <td className="px-4 py-2 text-sl-navy">{b.name}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${b.kind === "Adult" ? "bg-sl-gold/20 text-sl-gold" : "bg-[#EDF3FC] text-sl-navy"}`}
                      >
                        {b.kind}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sl-navy/70">{b.age}</td>
                    <td className="px-4 py-2 text-right text-[11px] text-sl-navy/60">
                      {b.createdAt.toLocaleDateString()}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-black/5 bg-sl-light p-5">
        <h2 className="text-[11px] font-medium uppercase tracking-wider text-sl-navy/60">
          Files to deploy on manorlanes.com
        </h2>
        <p className="mt-2 text-xs text-sl-navy/70">
          The repo has a ready-to-deploy{" "}
          <code>manorlanes-lm/summer-strikes-receiver.php</code> &mdash; copy
          it into <code>/wp-content/uploads/lm/</code> (or wherever the other
          receivers live on Kinsta). Shared-secret password matches{" "}
          <code>FBT_RECEIVER_PASSWORD</code> in Vercel.
        </p>
        <p className="mt-2 text-xs text-sl-navy/70">
          FRONTDESK1 needs a small PowerShell script that polls{" "}
          <code>manorlanes.com/lm/data/summer-strikes-pending.json</code>,
          converts each entry to a one-person FBT.xml, and drops it into
          Conqueror&apos;s import folder. I can write a stub when you&apos;re
          ready &mdash; just need the FBT import folder path on FRONTDESK1
          (typically{" "}
          <code>C:\Program Files (x86)\QubicaAMF\Conqueror\Imports\</code>).
        </p>
      </section>
    </>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-md bg-white p-4 shadow-sm border border-black/5">
      <div className="text-2xl font-medium text-sl-navy">{value}</div>
      <div className="mt-0.5 text-[11px] text-sl-navy/60">{label}</div>
    </div>
  );
}
