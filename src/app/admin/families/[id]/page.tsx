import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { updateChildScore } from "../../actions";

export default async function FamilyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      children: { orderBy: { createdAt: "asc" } },
      adults: { orderBy: { createdAt: "asc" } },
      vouchers: {
        orderBy: { validDate: "desc" },
        include: { child: true, adult: true },
        take: 60,
      },
    },
  });
  if (!user) notFound();

  const redeemedCount = user.vouchers.filter((v) => v.redeemedAt).length;
  const totalGames = user.vouchers.reduce(
    (s, v) => s + (v.gamesBowled ?? 0),
    0
  );

  return (
    <>
      <Link href="/admin/families" className="text-xs text-sl-navy/60 hover:text-sl-navy">
        ← All families
      </Link>

      <h1 className="mt-3 text-xl font-medium text-sl-navy">
        {user.firstName} {user.lastName}
      </h1>
      <p className="text-sm text-sl-navy/60">
        {user.email} · {user.phone ? formatPhone(user.phone) : "no phone"} ·{" "}
        SMS {user.smsOptIn ? "ON" : "OFF"}
      </p>
      <p className="mt-1 text-xs text-sl-navy/50">
        {user.address}, {user.city}, {user.state} {user.zip}
      </p>
      <p className="mt-1 text-xs text-sl-navy/50">
        Joined {user.createdAt.toLocaleString()} · {redeemedCount} vouchers redeemed · {totalGames} games
      </p>

      <h2 className="mt-6 text-[11px] font-medium uppercase tracking-wider text-sl-navy/60">
        Children
      </h2>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        {user.children.map((c) => (
          <form
            key={c.id}
            action={async (formData) => {
              "use server";
              const score = parseInt(formData.get("score") as string, 10);
              if (!Number.isFinite(score) || score < 0) return;
              await updateChildScore(c.id, score);
            }}
            className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm"
          >
            <p className="text-sm font-medium text-sl-navy">{c.name}</p>
            <p className="text-xs text-sl-navy/60">Age {c.age}</p>
            <div className="mt-3 flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-[11px] text-sl-navy/60">
                  High score
                </label>
                <input
                  name="score"
                  type="number"
                  defaultValue={c.highScore}
                  min={0}
                  max={300}
                  className="mt-1 h-9 w-full rounded-md border border-black/10 bg-sl-light px-2 text-sm focus:outline-none focus:ring-2 focus:ring-sl-navy/20"
                />
              </div>
              <button
                type="submit"
                className="h-9 rounded-md bg-sl-navy px-3 text-xs font-medium text-white hover:bg-sl-navy-light"
              >
                Save
              </button>
            </div>
          </form>
        ))}
      </div>

      {user.adults.length > 0 && (
        <>
          <h2 className="mt-6 text-[11px] font-medium uppercase tracking-wider text-sl-navy/60">
            Family Pass adults
          </h2>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {user.adults.map((a) => (
              <div key={a.id} className="rounded-2xl border border-sl-gold/30 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-sl-navy">{a.name}</p>
                    <p className="text-xs text-sl-navy/60">Age {a.age}</p>
                  </div>
                  <span className="rounded-full bg-sl-gold/20 px-2 py-0.5 text-[10px] font-medium text-sl-gold">
                    ${(a.paidAmountCents / 100).toFixed(2)}
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-sl-navy/50">
                  Paid {a.paidAt.toLocaleDateString()} · High score {a.highScore}
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="mt-8 text-[11px] font-medium uppercase tracking-wider text-sl-navy/60">
        Recent vouchers
      </h2>
      <div className="mt-2 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
        {user.vouchers.length === 0 ? (
          <div className="p-6 text-center text-sm text-sl-navy/60">
            No vouchers yet.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-sl-light text-left text-[11px] font-medium uppercase tracking-wider text-sl-navy/60">
              <tr>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Child</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {user.vouchers.map((v) => {
                const member = v.child ?? v.adult;
                return (
                <tr key={v.id}>
                  <td className="px-4 py-2 text-sl-navy">
                    {v.validDate.toISOString().slice(0, 10)}
                  </td>
                  <td className="px-4 py-2 text-sl-navy/80">
                    {member?.name ?? "—"}
                    {v.adult && (
                      <span className="ml-2 text-[10px] text-sl-gold">Adult</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {v.redeemedAt ? (
                      <span className="text-sl-navy/60">
                        Redeemed · {v.gamesBowled ?? 2} games ·{" "}
                        {v.redeemedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                      </span>
                    ) : (
                      <span className="text-[#3B6D11]">Available</span>
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function formatPhone(e164: string): string {
  const m = e164.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : e164;
}
