import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OPEN_SATURDAYS_2026, hoursForDate } from "@/lib/program-hours";
import ReserveForm from "./reserve-form";

export const dynamic = "force-dynamic";

export default async function ReservePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard/reserve");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { firstName: true, reservationCode: true },
  });
  if (!user) redirect("/login");

  // Build the list of valid program dates between today and Aug 31, 2026.
  // The form date picker uses this so users can only pick days we're actually open.
  const today = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
  );
  today.setHours(0, 0, 0, 0);
  const programEnd = new Date("2026-08-31T23:59:59-04:00");
  const validDates: { iso: string; label: string }[] = [];
  for (let d = new Date(today); d <= programEnd; d.setDate(d.getDate() + 1)) {
    if (hoursForDate(d)) {
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const label = new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }).format(d);
      validDates.push({ iso, label });
    }
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-6 sm:py-10">
      <Link
        href="/dashboard"
        className="text-xs text-sl-navy/60 hover:text-sl-navy"
      >
        ← Back to dashboard
      </Link>
      <h1 className="mt-3 text-2xl font-medium text-sl-navy">
        Reserve a <span className="text-sl-gold">lane</span>
      </h1>
      <p className="mt-1 text-sm text-sl-navy/60">
        Pick a date and start time. Manor Lanes will confirm and assign your
        lane — you&apos;ll get a text when it&apos;s ready. No payment,
        no checkout.
      </p>

      <ReserveForm
        validDates={validDates}
        reservationCode={user.reservationCode || ""}
      />

      <p className="mt-6 text-[11px] text-sl-navy/50">
        Open Saturdays 2026: {OPEN_SATURDAYS_2026.map((iso) => {
          const d = new Date(`${iso}T12:00:00-04:00`);
          return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(d);
        }).join(", ")}.
      </p>
    </main>
  );
}
