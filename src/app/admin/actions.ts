"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { sendSms, smsTemplates } from "@/lib/twilio";
import { todayInProgramTz } from "@/lib/dates";
import { stripe, FAMILY_PASS_PRICE_CENTS } from "@/lib/stripe";
import { sendEmail, familyPassActiveEmail } from "@/lib/email";

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

// Add a new child to an existing family, on the spot at the desk. If today
// is a program day (or any vouchers already exist for today for this family),
// also generate today's voucher for the new child so staff can scan the QR
// immediately and the kid starts bowling.
export async function addChildToFamily(input: {
  userId: string;
  name: string;
  age: number;
  generateTodayVoucher?: boolean;
}) {
  const session = await requireAdmin();
  if (!session) throw new Error("Unauthorized");

  const name = input.name.trim();
  if (name.length < 2) throw new Error("Child's full name required");
  if (!Number.isInteger(input.age) || input.age < 2 || input.age > 15) {
    throw new Error("Age must be a whole number between 2 and 15");
  }

  const child = await prisma.child.create({
    data: { userId: input.userId, name, age: input.age },
  });

  let voucher: { id: string } | null = null;
  if (input.generateTodayVoucher) {
    const { dateOnly } = todayInProgramTz();
    voucher = await prisma.voucher.upsert({
      where: {
        childId_validDate: { childId: child.id, validDate: dateOnly },
      },
      create: {
        userId: input.userId,
        childId: child.id,
        validDate: dateOnly,
      },
      update: {},
      select: { id: true },
    });
  }

  revalidatePath(`/admin/families/${input.userId}`);
  revalidatePath("/admin/families");
  revalidatePath("/admin");
  revalidatePath("/dashboard");

  return {
    ok: true,
    childId: child.id,
    childName: child.name,
    voucherId: voucher?.id ?? null,
  };
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

// Fallback for stuck PendingAdults. Looks up the Stripe Checkout Session by
// id, verifies payment_status = 'paid' from Stripe's API directly, and if
// paid, promotes all PendingAdult rows for that session into Adult rows and
// sends the Family Pass active email — same end state as a successful webhook.
//
// Use this when:
//  - Stripe disabled the webhook endpoint due to delivery failures
//  - You want to manually reconcile a session
//  - The user paid but the Adult never appeared
export async function verifyAndPromotePendingAdult(pendingId: string) {
  const session = await requireAdmin();
  if (!session) throw new Error("Unauthorized");
  if (!stripe) throw new Error("Stripe is not configured");

  const pending = await prisma.pendingAdult.findUnique({
    where: { id: pendingId },
    include: { user: { select: { id: true, email: true, firstName: true } } },
  });
  if (!pending) throw new Error("PendingAdult not found");

  const stripeSession = await stripe.checkout.sessions.retrieve(pending.stripeSessionId);

  if (stripeSession.payment_status !== "paid") {
    return {
      ok: false,
      paymentStatus: stripeSession.payment_status,
      message: `Stripe session shows payment_status="${stripeSession.payment_status}" — not yet paid. No changes made.`,
    };
  }

  // Find ALL pending adults for this session (might be more than the one we
  // were asked about — promote them all together to avoid double-charging).
  const allPending = await prisma.pendingAdult.findMany({
    where: { stripeSessionId: pending.stripeSessionId },
  });

  const paymentIntent =
    typeof stripeSession.payment_intent === "string"
      ? stripeSession.payment_intent
      : stripeSession.payment_intent?.id ?? null;
  const paidAt = new Date();

  await prisma.$transaction(async (tx) => {
    for (const p of allPending) {
      await tx.adult.create({
        data: {
          userId: p.userId,
          name: p.name,
          age: p.age,
          paidAmountCents: FAMILY_PASS_PRICE_CENTS,
          stripeSessionId: stripeSession.id + "::" + p.id,
          stripePaymentIntentId: paymentIntent,
          paidAt,
          programYear: p.programYear,
        },
      });
    }
    await tx.pendingAdult.deleteMany({
      where: { stripeSessionId: pending.stripeSessionId },
    });
  });

  // Send the Family Pass active email (same as webhook would have)
  const totalDollars = `$${((allPending.length * FAMILY_PASS_PRICE_CENTS) / 100).toFixed(2)}`;
  const adultNames = allPending.map((p) => p.name);
  const { subject, text, html } = familyPassActiveEmail(
    pending.user.firstName,
    adultNames,
    totalDollars
  );
  try {
    await sendEmail({ to: pending.user.email, subject, text, html });
  } catch (err) {
    console.error("[verify] family-pass email failed:", err);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/families");
  revalidatePath(`/admin/families/${pending.user.id}`);

  return {
    ok: true,
    promoted: allPending.length,
    paymentStatus: stripeSession.payment_status,
    message: `✓ Promoted ${allPending.length} pending adult${allPending.length === 1 ? "" : "s"} to paid Adult rows (Stripe verified). Confirmation email sent.`,
  };
}

type StaffAccountInput = {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role: "ADMIN" | "STAFF";
};

export async function createStaffAccount(input: StaffAccountInput) {
  const session = await requireAdmin();
  if (!session) throw new Error("Unauthorized");

  const email = input.email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new Error("Invalid email format");
  }
  if (!input.firstName.trim() || !input.lastName.trim()) {
    throw new Error("First and last name are required");
  }
  if (input.password.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }
  if (input.role !== "ADMIN" && input.role !== "STAFF") {
    throw new Error("Role must be ADMIN or STAFF");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error(
      `${email} already exists (role: ${existing.role}). Use 'Change role' below instead.`
    );
  }

  // Lazy-import bcrypt to keep cold starts fast for the other actions.
  const bcrypt = (await import("bcryptjs")).default;
  const passwordHash = await bcrypt.hash(input.password, 12);

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      role: input.role,
      // Required fields on User — staff accounts don't have a real address;
      // we stash a marker so admin views can distinguish them from families.
      address: "(staff account)",
      city: "(staff)",
      state: "NY",
      zip: "00000",
      termsAcceptedAt: new Date(),
    },
  });

  revalidatePath("/admin/staff");
  return { ok: true, email };
}

export async function changeUserRole(
  userId: string,
  role: "PARENT" | "ADMIN" | "STAFF"
) {
  const session = await requireAdmin();
  if (!session) throw new Error("Unauthorized");

  // Don't allow demoting yourself by accident
  const me = await prisma.user.findUnique({
    where: { email: session.user.email!.toLowerCase() },
    select: { id: true },
  });
  if (me?.id === userId && role === "PARENT") {
    throw new Error("Refusing to demote yourself. Ask another admin.");
  }

  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/admin/staff");
  return { ok: true };
}

export async function resetUserPassword(userId: string, newPassword: string) {
  const session = await requireAdmin();
  if (!session) throw new Error("Unauthorized");
  if (newPassword.length < 6) throw new Error("Password must be at least 6 characters");

  const bcrypt = (await import("bcryptjs")).default;
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  revalidatePath("/admin/staff");
  revalidatePath("/admin/families");
  return { ok: true };
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
