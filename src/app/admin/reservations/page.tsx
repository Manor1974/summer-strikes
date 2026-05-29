import { prisma } from "@/lib/prisma";
import ReservationRow from "./reservation-row";

export const dynamic = "force-dynamic";

export default async function ReservationsAdminPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayUtc = new Date(today.toISOString().slice(0, 10) + "T00:00:00Z");

  const [pending, confirmedUpcoming, recentlyHandled] = await Promise.all([
    prisma.reservation.findMany({
      where: { status: "REQUESTED" },
      orderBy: [{ reservationDate: "asc" }, { startTime: "asc" }],
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            reservationCode: true,
          },
        },
      },
    }),
    prisma.reservation.findMany({
      where: {
        status: "CONFIRMED",
        reservationDate: { gte: todayUtc },
      },
      orderBy: [{ reservationDate: "asc" }, { startTime: "asc" }],
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            reservationCode: true,
          },
        },
      },
    }),
    prisma.reservation.findMany({
      where: {
        OR: [
          { status: "CANCELLED" },
          { status: "COMPLETED" },
          {
            status: "CONFIRMED",
            reservationDate: { lt: todayUtc },
          },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: 15,
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

  return (
    <>
      <h1 className="text-xl font-medium text-sl-navy">Reservations</h1>
      <p className="mt-1 text-sm text-sl-navy/60">
        Confirm a request: assign a lane (1-24) and we&apos;ll text the family
        automatically. Until we have an automated Conqueror writer, also enter
        it manually in Conqueror so the FRONTDESK1 staff see it.
      </p>

      <section className="mt-5">
        <h2 className="text-[11px] font-medium uppercase tracking-wider text-sl-red">
          Pending requests ({pending.length})
        </h2>
        <div className="mt-2 overflow-hidden rounded-2xl border border-sl-red/20 bg-white shadow-sm">
          {pending.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-sl-navy/60">
              No pending requests.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-sl-red/5 text-left text-[11px] font-medium uppercase tracking-wider text-sl-navy/60">
                <tr>
                  <th className="px-4 py-2">When</th>
                  <th className="px-4 py-2">Family</th>
                  <th className="px-4 py-2">Party / notes</th>
                  <th className="px-4 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {pending.map((r) => (
                  <ReservationRow key={r.id} r={r} pending />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-[11px] font-medium uppercase tracking-wider text-sl-navy/60">
          Confirmed upcoming ({confirmedUpcoming.length})
        </h2>
        <div className="mt-2 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
          {confirmedUpcoming.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-sl-navy/60">
              No confirmed reservations upcoming.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-sl-light text-left text-[11px] font-medium uppercase tracking-wider text-sl-navy/60">
                <tr>
                  <th className="px-4 py-2">When</th>
                  <th className="px-4 py-2">Family</th>
                  <th className="px-4 py-2">Lane / party</th>
                  <th className="px-4 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {confirmedUpcoming.map((r) => (
                  <ReservationRow key={r.id} r={r} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {recentlyHandled.length > 0 && (
        <section className="mt-6">
          <h2 className="text-[11px] font-medium uppercase tracking-wider text-sl-navy/60">
            Recently handled
          </h2>
          <div className="mt-2 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-black/5">
                {recentlyHandled.map((r) => (
                  <tr key={r.id} className="text-sl-navy/60">
                    <td className="px-4 py-2 text-xs">
                      {r.reservationDate.toISOString().slice(0, 10)} {r.startTime}
                    </td>
                    <td className="px-4 py-2 text-xs">
                      {r.user.firstName} {r.user.lastName}
                    </td>
                    <td className="px-4 py-2 text-xs">{r.status}</td>
                    <td className="px-4 py-2 text-right text-xs">
                      {r.updatedAt.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
