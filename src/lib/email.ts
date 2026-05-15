import "server-only";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = process.env.EMAIL_FROM || "Summer Strikes <onboarding@resend.dev>";

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  if (!resend) {
    console.warn("[resend] No API key set — would have sent:", { to, subject });
    return { skipped: true } as const;
  }
  const result = await resend.emails.send({ from: FROM, to, subject, html, text });
  return result;
}

export function welcomeEmail(firstName: string, kidsCount: number) {
  const subject = `Welcome to Summer Strikes, ${firstName}!`;
  const greeting = `Hi ${firstName},`;
  const intro = `You're in. ${kidsCount === 1 ? "Your child is" : `Your ${kidsCount} children are`} registered for Summer Strikes 2026 at Manor Lanes.`;
  const cta = "Log in any time at manorlanes.com to grab today's vouchers.";
  return {
    subject,
    text: `${greeting}\n\n${intro}\n\nHow it works:\n1. Vouchers refresh each morning (one per child, 2 free games)\n2. Show your phone at the desk before bowling\n3. Standard shoe rental fees still apply\n\n${cta}\n\n— Manor Lanes`,
    html: `<div style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a2744;">
  <h1 style="font-size:24px;font-weight:500;margin:0 0 16px;"><span style="color:#1a2744;">Summer </span><span style="color:#f5a623;">Strikes</span></h1>
  <p>${greeting}</p>
  <p>${intro}</p>
  <h2 style="font-size:14px;text-transform:uppercase;letter-spacing:.5px;color:#1a2744;opacity:.6;margin:24px 0 8px;">How it works</h2>
  <ol style="padding-left:20px;line-height:1.6;">
    <li>Vouchers refresh each morning — 2 free games per child, per day</li>
    <li>Show your phone at the desk before bowling</li>
    <li>Standard shoe rental fees still apply</li>
  </ol>
  <p style="margin-top:24px;"><a href="https://manorlanes.com/summer-dashboard" style="background:#c8102e;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:500;">View your dashboard →</a></p>
  <p style="margin-top:32px;color:#1a2744;opacity:.6;font-size:12px;">Manor Lanes · Summer Strikes 2026</p>
</div>`,
  };
}
