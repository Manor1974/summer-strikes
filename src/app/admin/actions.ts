"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { sendSms } from "@/lib/twilio";

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
