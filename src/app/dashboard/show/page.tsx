import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { todayInProgramTz } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function ShowVouchersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard/show");

  const { dateOnly } = todayInProgramTz();
  const vouchers = await prisma.voucher.findMany({
    where: {
      userId: session.user.id,
      validDate: dateOnly,
      redeemedAt: null,
    },
    include: { child: true, adult: true, user: true },
    orderBy: { createdAt: "asc" },
  });

  if (vouchers.length === 0) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-sl-navy p-6 text-center text-white">
        <div className="text-5xl">🎳</div>
        <h1 className="mt-4 text-2xl font-medium">No vouchers available</h1>
        <p className="mt-2 text-sm opacity-70">
          Either all of today&apos;s vouchers are redeemed or it&apos;s before 7am.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 rounded-md bg-white/10 px-5 py-2 text-sm hover:bg-white/20"
        >
          Back to dashboard
        </Link>
      </main>
    );
  }

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const parentName = vouchers[0].user.firstName + " " + vouchers[0].user.lastName;

  return (
    <main className="min-h-screen bg-sl-navy p-4 text-white">
      <div className="mx-auto max-w-md py-6">
        <Link href="/dashboard" className="text-xs opacity-60 hover:opacity-100">
          ← Back
        </Link>

        <div className="mt-6 rounded-3xl bg-sl-red px-6 py-5 text-center">
          <p className="text-[11px] font-medium uppercase tracking-wider opacity-90">
            Summer Strikes · Manor Lanes
          </p>
          <h1 className="mt-2 text-3xl font-medium">Show this at the desk</h1>
          <p className="mt-1 text-sm opacity-90">{today}</p>
        </div>

        <p className="mt-4 text-center text-sm opacity-80">{parentName}</p>

        <div className="mt-3 space-y-3">
          {vouchers.map((v) => {
            const member = v.child ?? v.adult;
            const isAdult = !!v.adult;
            if (!member) return null;
            return (
              <div
                key={v.id}
                className="rounded-2xl bg-white px-6 py-5 text-sl-navy"
              >
                <p className="text-[11px] font-medium uppercase tracking-wider text-sl-navy/60">
                  Voucher · {v.id.slice(-6).toUpperCase()}
                  {isAdult && <span className="ml-2 text-sl-gold">FAMILY PASS</span>}
                </p>
                <h2 className="mt-2 text-2xl font-medium">{member.name}</h2>
                <p className="text-sm text-sl-navy/60">Age {member.age}</p>
                <div className="mt-4 rounded-lg bg-sl-light px-4 py-3 text-center">
                  <p className="text-xs uppercase tracking-wider text-sl-navy/60">
                    Today&apos;s allotment
                  </p>
                  <p className="mt-1 text-2xl font-medium text-sl-red">
                    2 Free Games
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-6 text-center text-xs opacity-50">
          Staff: mark vouchers redeemed in the admin panel after the games.
          Shoe rental not included.
        </p>
      </div>
    </main>
  );
}
