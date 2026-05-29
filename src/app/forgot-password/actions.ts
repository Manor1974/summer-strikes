"use server";

import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail, passwordResetEmail } from "@/lib/email";
import { appBaseUrl } from "@/lib/stripe";

const TOKEN_HOURS = 1;

export async function requestPasswordReset(rawEmail: string) {
  const email = rawEmail.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    // Silently no-op on invalid email — same UX so we don't leak existence
    return { ok: true };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, firstName: true },
  });

  // ALWAYS return ok — never tell the client whether the email is registered.
  // Only actually send the email if the user exists.
  if (!user) return { ok: true };

  // Single-use token, 1-hour expiry. Stored in the Auth.js VerificationToken
  // table since we already have it set up.
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + TOKEN_HOURS * 60 * 60 * 1000);

  // Wipe any existing tokens for this identifier so old reset links die.
  await prisma.verificationToken.deleteMany({
    where: { identifier: `pw-reset:${user.id}` },
  });
  await prisma.verificationToken.create({
    data: {
      identifier: `pw-reset:${user.id}`,
      token,
      expires,
    },
  });

  const resetUrl = `${appBaseUrl()}/reset-password/${token}`;
  const { subject, text, html } = passwordResetEmail({
    firstName: user.firstName,
    resetUrl,
    expiresInHours: TOKEN_HOURS,
  });

  try {
    await sendEmail({ to: user.email, subject, text, html });
  } catch (err) {
    console.error("[password-reset] email failed:", err);
  }
  return { ok: true };
}
