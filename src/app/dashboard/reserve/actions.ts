"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hoursForDate } from "@/lib/program-hours";
import { sendSms } from "@/lib/twilio";
import { sendEmail } from "@/lib/email";
import { appBaseUrl } from "@/lib/stripe";

const reservationSchema = z.object({
  reservationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  partySize: z.coerce.number().int().min(1).max(12),
  notes: z.string().max(500).optional(),
});

export type CreateReservationInput = z.infer<typeof reservationSchema>;

export async function createReservation(input: unknown) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Sign in to reserve a lane");

  const parsed = reservationSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Invalid input");
  }
  const data = parsed.data;

  // Server-side validation: reservation must be on a program day at a valid
  // start time within program hours. Belt and suspenders with the client-side
  // validation in the form — protects against direct API hits.
  const date = new Date(`${data.reservationDate}T12:00:00-04:00`);
  const hours = hoursForDate(date);
  if (!hours) {
    throw new Error("Manor Lanes is closed for Summer Strikes on that date");
  }
  // Hours format: "5:00pm – 11:00pm". Parse to validate startTime falls in range.
  const [openLabel, closeLabel] = hours.split("–").map((s) => s.trim());
  const openMins = parseTime12(openLabel);
  const closeMins = parseTime12(closeLabel);
  const [h, m] = data.startTime.split(":").map(Number);
  const startMins = h * 60 + m;
  // Allow a reservation to start up to 1 hour before closing (so they can
  // bowl at least one game). Reject earlier than open / later than close-60.
  if (startMins < openMins || startMins > closeMins - 60) {
    throw new Error(`Lanes open ${openLabel} until ${closeLabel}`);
  }

  // Prevent duplicate active reservations on the same day for the same family
  const existing = await prisma.reservation.findFirst({
    where: {
      userId: session.user.id,
      reservationDate: new Date(`${data.reservationDate}T00:00:00Z`),
      status: { in: ["REQUESTED", "CONFIRMED"] },
    },
  });
  if (existing) {
    throw new Error(
      "You already have a reservation request for that day. Cancel it first if you want a different time."
    );
  }

  const reservation = await prisma.reservation.create({
    data: {
      userId: session.user.id,
      reservationDate: new Date(`${data.reservationDate}T00:00:00Z`),
      startTime: data.startTime,
      partySize: data.partySize,
      notes: data.notes || null,
    },
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          smsOptIn: true,
          reservationCode: true,
        },
      },
    },
  });

  // Fire-and-forget notifications (don't block the user's redirect)
  Promise.allSettled([
    notifyCustomer(reservation),
    notifyAdmins(reservation),
  ]).catch((err) => console.error("[reservation] notify failed:", err));

  revalidatePath("/dashboard");
  revalidatePath("/admin/reservations");
  return { ok: true, id: reservation.id };
}

export async function cancelReservation(reservationId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
  });
  if (!reservation) throw new Error("Reservation not found");
  // Only the owner can cancel their own (admin uses adminCancelReservation)
  if (reservation.userId !== session.user.id) {
    throw new Error("Not your reservation");
  }
  if (reservation.status === "CANCELLED" || reservation.status === "COMPLETED") {
    return { ok: true };
  }
  await prisma.reservation.update({
    where: { id: reservationId },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });
  revalidatePath("/dashboard");
  revalidatePath("/admin/reservations");
  return { ok: true };
}

// --- helpers ----------------------------------------------------------------

function parseTime12(label: string): number {
  // "5:00pm" → 17*60+0 = 1020
  const m = label.toLowerCase().match(/^(\d{1,2}):?(\d{0,2})\s*(am|pm)$/);
  if (!m) return 0;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2] || "0", 10);
  const ampm = m[3];
  if (ampm === "pm" && h !== 12) h += 12;
  if (ampm === "am" && h === 12) h = 0;
  return h * 60 + min;
}

function formatTime12(time: string): string {
  // "17:00" → "5:00 PM"
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${display}:${String(m).padStart(2, "0")} ${period}`;
}

function formatDateLong(iso: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "America/New_York",
  }).format(iso);
}

type ReservationWithUser = {
  id: string;
  reservationDate: Date;
  startTime: string;
  partySize: number;
  notes: string | null;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    smsOptIn: boolean;
    reservationCode: string | null;
  };
};

async function notifyCustomer(r: ReservationWithUser) {
  const dateStr = formatDateLong(r.reservationDate);
  const timeStr = formatTime12(r.startTime);
  const subject = `Reservation request received — ${dateStr} at ${timeStr}`;
  const text = `Hi ${r.user.firstName},

Your reservation request for Summer Strikes is in:

  When:        ${dateStr} at ${timeStr}
  Party size:  ${r.partySize}
  Family code: ${r.user.reservationCode}

We'll confirm shortly and assign your lane. Show your reservation code at the desk if asked.

— Manor Lanes`;
  await sendEmail({
    to: r.user.email,
    subject,
    text,
    html: `<div style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a2744;">
  <h2 style="margin:0 0 12px;font-size:18px;">Reservation request received</h2>
  <p>Hi ${r.user.firstName},</p>
  <p>Your Summer Strikes reservation request is in:</p>
  <table style="border-collapse:collapse;margin:12px 0;font-size:14px;">
    <tr><td style="padding:4px 12px 4px 0;color:#1a2744;opacity:0.6;">When</td><td style="padding:4px 0;font-weight:600;">${dateStr} &middot; ${timeStr}</td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#1a2744;opacity:0.6;">Party size</td><td style="padding:4px 0;font-weight:600;">${r.partySize}</td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#1a2744;opacity:0.6;">Family code</td><td style="padding:4px 0;font-family:monospace;font-weight:700;">${r.user.reservationCode}</td></tr>
  </table>
  <p>We&apos;ll confirm shortly and assign your lane.</p>
  <p style="margin-top:24px;color:#1a2744;opacity:0.6;font-size:12px;">Manor Lanes &middot; Summer Strikes 2026</p>
</div>`,
  });
  if (r.user.smsOptIn && r.user.phone) {
    await sendSms(
      r.user.phone,
      `Manor Lanes: reservation request received for ${dateStr} at ${timeStr}. We'll text you when it's confirmed.`
    );
  }
}

async function notifyAdmins(r: ReservationWithUser) {
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (adminEmails.length === 0) return;
  const dateStr = formatDateLong(r.reservationDate);
  const timeStr = formatTime12(r.startTime);
  const subject = `[Summer Strikes] New reservation request — ${r.user.firstName} ${r.user.lastName}`;
  const text = `New reservation request

  Family:      ${r.user.firstName} ${r.user.lastName}
  Email:       ${r.user.email}
  Family code: ${r.user.reservationCode}
  When:        ${dateStr} at ${timeStr}
  Party size:  ${r.partySize}
  Notes:       ${r.notes || "(none)"}

Confirm or cancel at ${appBaseUrl()}/admin/reservations
`;
  await Promise.all(
    adminEmails.map((to) =>
      sendEmail({
        to,
        subject,
        text,
        html: `<pre style="font-family:ui-monospace,monospace;font-size:13px;">${text.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</pre>`,
      })
    )
  );
}

// Admin-only actions for the staff queue --------------------------------------

export async function adminConfirmReservation(
  reservationId: string,
  laneNumber: number
) {
  const session = await auth();
  if (
    !session?.user?.email ||
    (session.user.role !== "ADMIN" && session.user.role !== "STAFF")
  ) {
    throw new Error("Unauthorized");
  }
  if (!Number.isInteger(laneNumber) || laneNumber < 1 || laneNumber > 24) {
    throw new Error("Lane number must be 1-24");
  }
  const r = await prisma.reservation.update({
    where: { id: reservationId },
    data: {
      status: "CONFIRMED",
      laneNumber,
      confirmedAt: new Date(),
      confirmedBy: session.user.email,
    },
    include: {
      user: {
        select: {
          firstName: true,
          email: true,
          phone: true,
          smsOptIn: true,
          reservationCode: true,
        },
      },
    },
  });
  // SMS the family
  if (r.user.smsOptIn && r.user.phone) {
    const dateStr = formatDateLong(r.reservationDate);
    const timeStr = formatTime12(r.startTime);
    await sendSms(
      r.user.phone,
      `Manor Lanes: your reservation is CONFIRMED for ${dateStr} at ${timeStr} on lane ${laneNumber}. Family code ${r.user.reservationCode}.`
    ).catch((err) => console.error("[reservation/confirm] SMS failed:", err));
  }
  revalidatePath("/admin/reservations");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function adminCancelReservation(reservationId: string) {
  const session = await auth();
  if (
    !session?.user?.email ||
    (session.user.role !== "ADMIN" && session.user.role !== "STAFF")
  ) {
    throw new Error("Unauthorized");
  }
  await prisma.reservation.update({
    where: { id: reservationId },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });
  revalidatePath("/admin/reservations");
  revalidatePath("/dashboard");
  return { ok: true };
}
