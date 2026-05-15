import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { todayInProgramTz, isProgramActive } from "@/lib/dates";
import { sendSms, smsTemplates } from "@/lib/twilio";

// Triggered by Vercel Cron at 07:00 ET daily (see vercel.json).
// Generates one voucher per child per registered family, then sends an SMS
// alert to opted-in parents.
//
// Auth: Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`. We also
// accept a query-string token so it can be triggered manually for testing.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const header = req.headers.get("authorization");
  if (header === `Bearer ${expected}`) return true;
  const token = req.nextUrl.searchParams.get("token");
  if (token === expected) return true;
  return false;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isProgramActive()) {
    return NextResponse.json({ ok: true, skipped: "off-season" });
  }

  const { dateOnly, isoDate } = todayInProgramTz();
  const startedAt = Date.now();

  const users = await prisma.user.findMany({
    where: { role: "PARENT" },
    select: {
      id: true,
      firstName: true,
      phone: true,
      smsOptIn: true,
      children: { select: { id: true, name: true } },
    },
  });

  let vouchersCreated = 0;
  let smsQueued = 0;
  let smsFailed = 0;

  for (const user of users) {
    if (user.children.length === 0) continue;

    // Create vouchers (skip if one already exists for this child+date)
    const created = await prisma.$transaction(
      user.children.map((child) =>
        prisma.voucher.upsert({
          where: {
            childId_validDate: { childId: child.id, validDate: dateOnly },
          },
          create: {
            userId: user.id,
            childId: child.id,
            validDate: dateOnly,
          },
          update: {}, // no-op if already exists
        })
      )
    );
    vouchersCreated += created.length;

    // SMS notification
    if (user.smsOptIn && user.phone) {
      const childNames = user.children.map((c) => c.name.split(" ")[0]);
      try {
        await sendSms(user.phone, smsTemplates.dailyVoucher(user.firstName, childNames));
        smsQueued++;
      } catch (err) {
        smsFailed++;
        console.error(`[cron/daily-vouchers] SMS failed for ${user.id}:`, err);
      }
    }
  }

  const durationMs = Date.now() - startedAt;
  return NextResponse.json({
    ok: true,
    date: isoDate,
    families: users.length,
    vouchersCreated,
    smsQueued,
    smsFailed,
    durationMs,
  });
}
