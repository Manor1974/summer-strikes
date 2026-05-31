// POST /api/reservations/auto-confirm
// Called by FRONTDESK1's reservation-writer.ps1 after it queries Conqueror
// for a free lane at the requested time. We trust the writer's lane pick
// (it has the only authoritative view of RsrvBody) and flip the reservation
// to CONFIRMED (or CANCELLED if no lane was available).
//
// Auth: shared-secret token in the request body. Matches the env var
// RESERVATION_RECEIVER_PASSWORD (same secret already used between Vercel
// and the manorlanes.com PHP receivers — no new secret to manage).
//
// Expected body:
// {
//   "password": "...",
//   "id": "<our reservation cuid>",
//   "result": "confirmed" | "declined",
//
//   // Required if result=confirmed:
//   "lane_number":       14,       // 1-24 (lane PowerShell picked)
//   "conqueror_id_rsrv": 9273,     // RsrvHdr.ID it landed as (informational)
//   "conqueror_key":     "ML00001", // RsrvHdr.ReservationKey (informational)
//
//   // Required if result=declined:
//   "reason": "no lanes available at requested time"
// }
//
// Returns: { ok: true, status: "CONFIRMED" | "CANCELLED" }

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendSms } from "@/lib/twilio";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  password: z.string(),
  id: z.string().min(1),
  result: z.enum(["confirmed", "declined"]),
  lane_number: z.coerce.number().int().min(1).max(24).optional(),
  conqueror_id_rsrv: z.coerce.number().int().optional(),
  conqueror_key: z.string().optional(),
  reason: z.string().optional(),
});

export async function POST(req: Request) {
  const password = process.env.RESERVATION_RECEIVER_PASSWORD;
  if (!password) {
    return NextResponse.json(
      { error: "RESERVATION_RECEIVER_PASSWORD not configured" },
      { status: 500 }
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "invalid body" },
      { status: 400 }
    );
  }
  const body = parsed.data;
  if (body.password !== password) {
    return NextResponse.json({ error: "auth" }, { status: 401 });
  }

  // Look up the reservation
  const reservation = await prisma.reservation.findUnique({
    where: { id: body.id },
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
  if (!reservation) {
    return NextResponse.json({ error: "reservation not found" }, { status: 404 });
  }

  // Idempotency: if already in a terminal state, just acknowledge.
  if (
    reservation.status === "CONFIRMED" ||
    reservation.status === "CANCELLED" ||
    reservation.status === "COMPLETED"
  ) {
    return NextResponse.json({ ok: true, status: reservation.status, note: "already terminal" });
  }

  const dateStr = formatDateLong(reservation.reservationDate);
  const timeStr = formatTime12(reservation.startTime);

  if (body.result === "confirmed") {
    if (!body.lane_number) {
      return NextResponse.json(
        { error: "lane_number required when result=confirmed" },
        { status: 400 }
      );
    }

    await prisma.reservation.update({
      where: { id: body.id },
      data: {
        status: "CONFIRMED",
        laneNumber: body.lane_number,
        confirmedAt: new Date(),
        confirmedBy: "auto-assign (FRONTDESK1)",
      },
    });

    // Notify customer — SMS first since it's the fastest reach
    if (reservation.user.smsOptIn && reservation.user.phone) {
      sendSms(
        reservation.user.phone,
        `Manor Lanes: your reservation is CONFIRMED for ${dateStr} at ${timeStr} on lane ${body.lane_number}. Family code ${reservation.user.reservationCode}.`
      ).catch((err) =>
        console.error("[auto-confirm] SMS failed:", err)
      );
    }
    {
      const confirmText = `Hi ${reservation.user.firstName},

Your Summer Strikes reservation is confirmed:

  When:        ${dateStr} at ${timeStr}
  Lane:        ${body.lane_number}
  Party size:  ${reservation.partySize}
  Family code: ${reservation.user.reservationCode}

See you at Manor Lanes!

— Manor Lanes`;
      sendEmail({
        to: reservation.user.email,
        subject: `Reservation confirmed — ${dateStr} at ${timeStr} on lane ${body.lane_number}`,
        text: confirmText,
        html: `<div style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a2744;">
  <h2 style="margin:0 0 12px;font-size:18px;">Reservation confirmed</h2>
  <p>Hi ${reservation.user.firstName},</p>
  <p>Your Summer Strikes reservation is confirmed:</p>
  <table style="border-collapse:collapse;margin:12px 0;font-size:14px;">
    <tr><td style="padding:4px 12px 4px 0;color:#1a2744;opacity:0.6;">When</td><td style="padding:4px 0;font-weight:600;">${dateStr} &middot; ${timeStr}</td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#1a2744;opacity:0.6;">Lane</td><td style="padding:4px 0;font-weight:700;">${body.lane_number}</td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#1a2744;opacity:0.6;">Party size</td><td style="padding:4px 0;font-weight:600;">${reservation.partySize}</td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#1a2744;opacity:0.6;">Family code</td><td style="padding:4px 0;font-family:monospace;font-weight:700;">${reservation.user.reservationCode ?? ""}</td></tr>
  </table>
  <p>See you at Manor Lanes!</p>
  <p style="margin-top:24px;color:#1a2744;opacity:0.6;font-size:12px;">Manor Lanes &middot; Summer Strikes 2026</p>
</div>`,
      }).catch((err) => console.error("[auto-confirm] email failed:", err));
    }

    return NextResponse.json({
      ok: true,
      status: "CONFIRMED",
      lane: body.lane_number,
    });
  }

  // result === "declined" — no lanes available at the requested time
  await prisma.reservation.update({
    where: { id: body.id },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      notes: body.reason
        ? `Auto-declined: ${body.reason}`
        : "Auto-declined: no lanes available at requested time",
    },
  });

  if (reservation.user.smsOptIn && reservation.user.phone) {
    sendSms(
      reservation.user.phone,
      `Manor Lanes: sorry — no lanes available for ${dateStr} at ${timeStr}. Try a different time at summer.manorlanes.com/dashboard.`
    ).catch((err) => console.error("[auto-confirm] decline SMS failed:", err));
  }
  {
    const declineText = `Hi ${reservation.user.firstName},

Unfortunately we couldn't confirm your reservation for ${dateStr} at ${timeStr} — all lanes are booked at that time.

Pick a different time at summer.manorlanes.com/dashboard.

— Manor Lanes`;
    sendEmail({
      to: reservation.user.email,
      subject: `Unable to confirm — ${dateStr} at ${timeStr}`,
      text: declineText,
      html: `<div style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a2744;">
  <h2 style="margin:0 0 12px;font-size:18px;">Unable to confirm</h2>
  <p>Hi ${reservation.user.firstName},</p>
  <p>Unfortunately we couldn't confirm your reservation for <strong>${dateStr} at ${timeStr}</strong> — all lanes are booked at that time.</p>
  <p><a href="https://summer.manorlanes.com/dashboard" style="display:inline-block;background:#1a2744;color:#fff;text-decoration:none;padding:10px 16px;border-radius:6px;font-weight:600;">Pick a different time</a></p>
  <p style="margin-top:24px;color:#1a2744;opacity:0.6;font-size:12px;">Manor Lanes &middot; Summer Strikes 2026</p>
</div>`,
    }).catch((err) => console.error("[auto-confirm] decline email failed:", err));
  }

  return NextResponse.json({ ok: true, status: "CANCELLED", declined: true });
}

// --- helpers ----------------------------------------------------------------

function formatTime12(time: string): string {
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
