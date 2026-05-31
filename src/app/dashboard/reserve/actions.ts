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

  // Auto-assign flow: post immediately to the manorlanes.com receiver with
  // lane_number=0. FRONTDESK1's PowerShell writer queries Conqueror for a
  // free lane at the requested time and calls back to /api/reservations/auto-confirm
  // with the assignment. No human in the loop unless the auto-assign fails.
  postToReservationReceiver({
    id: reservation.id,
    reservation_date: data.reservationDate,
    start_time: data.startTime,
    lane_number: 0, // 0 = "PowerShell, you pick"
    party_size: data.partySize,
    family_code: reservation.user.reservationCode ?? "",
    first_name: reservation.user.firstName,
    last_name: reservation.user.lastName,
    email: reservation.user.email,
    phone: reservation.user.phone ?? "",
    notes: data.notes ?? "",
  }).catch((err) =>
    console.error("[reservation/create] receiver POST failed:", err)
  );

  // Customer notification ("request received — we'll text you the lane")
  // + admin email for visibility (no action needed unless auto-assign fails)
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

Our system is checking lane availability — you'll get a text within about a minute with your lane number.

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
      `Manor Lanes: reservation request received for ${dateStr} at ${timeStr}. We'll text you the lane number within about a minute.`
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
          lastName: true,
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
  // Queue the reservation for FRONTDESK1's PowerShell writer to push into
  // Conqueror so it shows on the front-desk registration grid automatically.
  postToReservationReceiver({
    id: r.id,
    reservation_date: r.reservationDate.toISOString().slice(0, 10),
    start_time: r.startTime,
    lane_number: laneNumber,
    party_size: r.partySize,
    family_code: r.user.reservationCode ?? "",
    first_name: r.user.firstName,
    last_name: r.user.lastName,
    email: r.user.email,
    phone: r.user.phone ?? "",
    notes: r.notes ?? "",
  }).catch((err) =>
    console.error("[reservation/confirm] receiver POST failed:", err)
  );
  revalidatePath("/admin/reservations");
  revalidatePath("/dashboard");
  return { ok: true };
}

// Fire-and-forget POST to manorlanes.com/lm/summer-strikes-reservation-receiver.php
// so FRONTDESK1's PowerShell writer picks it up on next poll and writes it
// into Conqueror. Doesn't throw — the confirm action must not fail if the
// WP receiver is briefly unreachable. Admin can re-trigger via a future
// /admin/reservations 'Re-send to Conqueror' button.
async function postToReservationReceiver(payload: {
  id: string;
  reservation_date: string;
  start_time: string;
  lane_number: number;
  party_size: number;
  family_code: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  notes: string;
}) {
  const url = process.env.RESERVATION_RECEIVER_URL;
  const password = process.env.RESERVATION_RECEIVER_PASSWORD;
  if (!url || !password) {
    console.warn("[reservation] receiver URL/password not configured — skipped");
    return;
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, reservation: payload }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error(`[reservation] receiver ${res.status}: ${txt.slice(0, 200)}`);
    }
  } catch (err) {
    console.error("[reservation] receiver POST failed:", err);
  }
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
