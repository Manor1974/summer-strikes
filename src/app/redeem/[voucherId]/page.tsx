import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { adminEmails } from "@/lib/admin";
import RedeemForm from "./redeem-form";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ voucherId: string }> };

export default async function RedeemPage({ params }: Params) {
  const { voucherId } = await params;
  const session = await auth();

  // Anyone reaching this page must be a logged-in admin / staff. Parents who
  // scan their own QR get a friendly "you can't redeem your own voucher" line.
  if (!session?.user?.email) {
    redirect(`/login?callbackUrl=/redeem/${voucherId}`);
  }

  const email = session.user.email.toLowerCase();
  const isAdmin =
    adminEmails().has(email) ||
    session.user.role === "ADMIN" ||
    session.user.role === "STAFF";

  const voucher = await prisma.voucher.findUnique({
    where: { id: voucherId },
    include: { child: true, adult: true, user: true },
  });

  if (!voucher) notFound();

  const member = voucher.child ?? voucher.adult;
  const isAdult = !!voucher.adult;

  // Non-admin view — friendly screen for parents who accidentally scan their own QR
  if (!isAdmin) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-sl-navy p-6 text-center text-white">
        <div className="text-5xl">🎳</div>
        <h1 className="mt-4 text-2xl font-medium">For desk staff only</h1>
        <p className="mt-2 max-w-sm text-sm opacity-70">
          Hand this screen (or your phone showing the QR code) to a Manor Lanes
          staff member — they&apos;ll scan it to start your free games.
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

  const validDateStr = voucher.validDate.toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  const isToday = validDateStr === today;
  const isAlreadyRedeemed = !!voucher.redeemedAt;

  return (
    <main className="min-h-screen bg-sl-light p-4">
      <div className="mx-auto max-w-md py-6">
        <div className="flex items-center justify-between text-xs text-sl-navy/60">
          <Link href="/admin">← Admin</Link>
          <form action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}>
            <button type="submit" className="hover:text-sl-navy">Sign out</button>
          </form>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="bg-sl-navy px-5 py-3 text-white">
            <p className="text-[11px] font-medium uppercase tracking-wider opacity-70">
              Voucher · {voucher.id.slice(-6).toUpperCase()}
              {isAdult && <span className="ml-2 text-sl-gold">FAMILY PASS</span>}
            </p>
          </div>

          <div className="px-5 py-5">
            <h1 className="text-3xl font-medium text-sl-navy">
              {member?.name}
            </h1>
            <p className="mt-1 text-sm text-sl-navy/60">
              Age {member?.age} · {voucher.user.firstName} {voucher.user.lastName}&apos;s family
            </p>

            <div className="mt-4 rounded-lg bg-sl-light px-4 py-3">
              <p className="text-[11px] uppercase tracking-wider text-sl-navy/60">
                Allotment
              </p>
              <p className="mt-1 text-2xl font-medium text-sl-red">2 Free Games</p>
            </div>

            {!isToday && (
              <p className="mt-3 rounded-md bg-sl-gold/10 px-3 py-2 text-xs text-sl-navy/80">
                ⚠️ This voucher is for <strong>{validDateStr}</strong>, not today
                ({today}). Confirm with the family before redeeming.
              </p>
            )}

            {isAlreadyRedeemed ? (
              <div className="mt-5 rounded-md bg-[#EAF3DE] px-4 py-3 text-center">
                <p className="text-sm font-medium text-[#3B6D11]">
                  Already redeemed
                </p>
                <p className="mt-1 text-xs text-[#3B6D11]/80">
                  {voucher.redeemedAt!.toLocaleString()}
                  {voucher.redeemedByStaff && ` · ${voucher.redeemedByStaff}`}
                  {voucher.gamesBowled && ` · ${voucher.gamesBowled} games`}
                </p>
              </div>
            ) : (
              <RedeemForm voucherId={voucher.id} memberName={member?.name ?? ""} />
            )}
          </div>
        </div>

        <Link
          href="/admin"
          className="mt-4 block text-center text-xs text-sl-navy/60 hover:text-sl-navy"
        >
          ← Back to admin
        </Link>
      </div>
    </main>
  );
}
