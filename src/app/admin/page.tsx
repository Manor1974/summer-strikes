import { prisma } from "@/lib/prisma";
import { todayInProgramTz, isProgramActive } from "@/lib/dates";
import RedeemButton from "./redeem-button";
import GenerateVouchersButton from "./generate-vouchers-button";

export default async function AdminTodayPage() {
  const { dateOnly, isoDate } = todayInProgramTz();

  const [
    totalFamilies,
    totalChildren,
    paidAdults,
    smsCount,
    todayVouchers,
    redeemedAllTime,
    familyPassRevenue,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "PARENT" } }),
    prisma.child.count(),
    prisma.adult.count(),
    prisma.user.count({ where: { smsOptIn: true } }),
    prisma.voucher.findMany({
      where: { validDate: dateOnly },
      include: { child: true, adult: true, user: true },
      orderBy: [{ redeemedAt: "asc" }, { createdAt: "asc" }],
    }),
    prisma.voucher.count({ where: { redeemedAt: { not: null } } }),
    prisma.adult.aggregate({
      _sum: { paidAmountCents: true },
    }),
  ]);

  const todayRedeemed = todayVouchers.filter((v) => v.redeemedAt).length;
  const todayAvailable = todayVouchers.length - todayRedeemed;
  const revenueDollars = ((familyPassRevenue._sum?.paidAmountCents ?? 0) / 100).toLocaleString(
    "en-US",
    { style: "currency", currency: "USD" }
  );

  const programOn = isProgramActive();

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-medium text-sl-navy">Today · {isoDate}</h1>
        {!programOn && (
          <GenerateVouchersButton />
        )}
      </div>
      {!programOn && (
        <p className="mt-1 text-xs text-sl-navy/60">
          Program window opens Jun 1 — daily cron is idle until then. Use the
          button above to manually generate today&apos;s vouchers for testing.
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-6">
        <Metric value={totalFamilies} label="Families" />
        <Metric value={totalChildren} label="Children" />
        <Metric value={paidAdults} label="Family Pass" sub={revenueDollars} />
        <Metric value={smsCount} label="SMS subscribers" />
        <Metric value={todayAvailable} label="Vouchers today" sub={`${todayRedeemed} redeemed`} />
        <Metric value={redeemedAllTime.toLocaleString()} label="Redeemed all-time" />
      </div>

      <section className="mt-6">
        <h2 className="text-[11px] font-medium uppercase tracking-wider text-sl-navy/60">
          Today&apos;s vouchers ({todayVouchers.length})
        </h2>

        {todayVouchers.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-black/5 bg-white p-6 text-center text-sm text-sl-navy/60">
            No vouchers generated for today yet. They&apos;ll appear here once the
            7am cron runs (or you can trigger it manually for testing).
          </div>
        ) : (
          <div className="mt-3 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-sl-light text-left text-[11px] font-medium uppercase tracking-wider text-sl-navy/60">
                <tr>
                  <th className="px-4 py-2">Child</th>
                  <th className="px-4 py-2">Family</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {todayVouchers.map((v) => {
                  const member = v.child ?? v.adult;
                  const isAdult = !!v.adult;
                  if (!member) return null;
                  return (
                  <tr key={v.id} className="hover:bg-sl-light/50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-sl-navy">
                        {member.name}
                        {isAdult && (
                          <span className="ml-2 rounded-full bg-sl-gold/20 px-2 py-0.5 text-[10px] font-medium text-sl-gold">
                            Adult
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-sl-navy/50">Age {member.age}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sl-navy">
                        {v.user.firstName} {v.user.lastName}
                      </div>
                      <div className="text-xs text-sl-navy/50">{v.user.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      {v.redeemedAt ? (
                        <div>
                          <span className="rounded-full bg-sl-light px-2 py-0.5 text-[11px] text-sl-navy/60">
                            Redeemed · {v.gamesBowled ?? 2} games
                          </span>
                          <div className="mt-0.5 text-[11px] text-sl-navy/40">
                            {v.redeemedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                            {v.redeemedByStaff ? ` · ${v.redeemedByStaff}` : ""}
                          </div>
                        </div>
                      ) : (
                        <span className="rounded-full bg-[#EAF3DE] px-2 py-0.5 text-[11px] font-medium text-[#3B6D11]">
                          Available
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <RedeemButton voucherId={v.id} redeemed={!!v.redeemedAt} />
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function Metric({
  value,
  label,
  sub,
}: {
  value: number | string;
  label: string;
  sub?: string;
}) {
  return (
    <div className="rounded-md bg-white p-4 shadow-sm border border-black/5">
      <div className="text-2xl font-medium text-sl-navy">{value}</div>
      <div className="mt-0.5 text-[11px] text-sl-navy/60">{label}</div>
      {sub && <div className="text-[10px] text-sl-navy/40">{sub}</div>}
    </div>
  );
}
