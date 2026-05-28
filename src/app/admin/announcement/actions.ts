"use server";

import { requireAdmin } from "@/lib/admin";
import { sendEmail } from "@/lib/email";
import { announcementEmail } from "@/lib/announcement-email";
import { appBaseUrl } from "@/lib/stripe";

export async function sendAnnouncementTest() {
  const session = await requireAdmin();
  if (!session?.user?.email) throw new Error("Unauthorized");

  const { subject, html, text } = announcementEmail({
    registerUrl: `${appBaseUrl()}/register`,
  });
  await sendEmail({ to: session.user.email, subject, html, text });
  return { ok: true };
}

export async function broadcastAnnouncement(rawRecipients: string[]) {
  const session = await requireAdmin();
  if (!session) throw new Error("Unauthorized");

  // Dedupe + sanitize
  const emails = Array.from(
    new Set(
      rawRecipients
        .map((e) => e.trim().toLowerCase())
        .filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e))
    )
  );

  if (emails.length === 0) return { sent: 0, failed: 0, total: 0 };

  const { subject, html, text } = announcementEmail({
    registerUrl: `${appBaseUrl()}/register`,
  });

  let sent = 0;
  let failed = 0;
  // Resend allows up to 50 in a batch via their bcc field but we'll send
  // serially with light delay to avoid rate-limit hiccups and keep each
  // delivery individually trackable.
  for (const to of emails) {
    try {
      await sendEmail({ to, subject, html, text });
      sent++;
    } catch (err) {
      failed++;
      console.error(`[announcement] failed for ${to}:`, err);
    }
  }
  return { sent, failed, total: emails.length };
}
