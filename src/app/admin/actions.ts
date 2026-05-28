"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { sendSms, smsTemplates } from "@/lib/twilio";
import { todayInProgramTz } from "@/lib/dates";

export async function redeemVoucher(voucherId: string, gamesBowled: number = 2) {
  const session = await requireAdmin();
  if (!session) throw new Error("Unauthorized");

  const voucher = await prisma.voucher.findUnique({
    where: { id: voucherId },
  });
  if (!voucher) throw new Error("Voucher not found");
  if (voucher.redeemedAt) throw new Error("Already redeemed");

  await prisma.voucher.update({
    where: { id: voucherId },
    data: {
      redeemedAt: new Date(),
      redeemedByStaff: session.user.email,
      gamesBowled,
    },
  });

  revalidatePath("/admin");
  revalidatePath(`/admin/families`);
}

export async function unredeemVoucher(voucherId: string) {
  const session = await requireAdmin();
  if (!session) throw new Error("Unauthorized");

  await prisma.voucher.update({
    where: { id: voucherId },
    data: { redeemedAt: null, redeemedByStaff: null, gamesBowled: null },
  });

  revalidatePath("/admin");
  revalidatePath(`/admin/families`);
}

export async function updateChildScore(childId: string, highScore: number) {
  const session = await requireAdmin();
  if (!session) throw new Error("Unauthorized");

  await prisma.child.update({
    where: { id: childId },
    data: { highScore },
  });

  revalidatePath("/admin/families");
}

// Manually trigger today's voucher generation. Same logic as the daily cron,
// but bypasses the program-window check so you can test the flow before June 1.
export async function generateTodayVouchers(opts: { sendSms: boolean } = { sendSms: false }) {
  const session = await requireAdmin();
  if (!session) throw new Error("Unauthorized");

  const { dateOnly } = todayInProgramTz();

  const users = await prisma.user.findMany({
    where: { role: "PARENT" },
    select: {
      id: true,
      firstName: true,
      phone: true,
      smsOptIn: true,
      children: { select: { id: true, name: true } },
      adults: { select: { id: true, name: true } },
    },
  });

  let vouchersCreated = 0;
  let smsQueued = 0;
  let smsFailed = 0;

  for (const user of users) {
    const memberCount = user.children.length + user.adults.length;
    if (memberCount === 0) continue;
    const ops = [
      ...user.children.map((child) =>
        prisma.voucher.upsert({
          where: { childId_validDate: { childId: child.id, validDate: dateOnly } },
          create: { userId: user.id, childId: child.id, validDate: dateOnly },
          update: {},
        })
      ),
      ...user.adults.map((adult) =>
        prisma.voucher.upsert({
          where: { adultId_validDate: { adultId: adult.id, validDate: dateOnly } },
          create: { userId: user.id, adultId: adult.id, validDate: dateOnly },
          update: {},
        })
      ),
    ];
    const created = await prisma.$transaction(ops);
    vouchersCreated += created.length;

    if (opts.sendSms && user.smsOptIn && user.phone) {
      const names = [
        ...user.children.map((c) => c.name.split(" ")[0]),
        ...user.adults.map((a) => a.name.split(" ")[0]),
      ];
      try {
        await sendSms(user.phone, smsTemplates.dailyVoucher(user.firstName, names));
        smsQueued++;
      } catch {
        smsFailed++;
      }
    }
  }

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { families: users.length, vouchersCreated, smsQueued, smsFailed };
}

export async function broadcastSms(message: string) {
  const session = await requireAdmin();
  if (!session) throw new Error("Unauthorized");

  const recipients = await prisma.user.findMany({
    where: { smsOptIn: true, phone: { not: null } },
    select: { id: true, phone: true },
  });

  let sent = 0;
  let failed = 0;
  for (const r of recipients) {
    if (!r.phone) continue;
    try {
      await sendSms(r.phone, message);
      sent++;
    } catch (err) {
      failed++;
      console.error(`[admin/broadcast] failed for ${r.id}:`, err);
    }
  }

  return { sent, failed, total: recipients.length };
}
