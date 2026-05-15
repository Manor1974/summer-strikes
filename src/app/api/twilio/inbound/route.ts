import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { prisma } from "@/lib/prisma";

// Twilio inbound SMS webhook. Configure in Twilio Console:
// Messaging Service → Integration → "Send a webhook" →
// https://summer.manorlanes.com/api/twilio/inbound
//
// Twilio handles STOP/UNSTOP automatically at the account level (blocks the
// number from sending). We additionally flip smsOptIn in our DB so the UI
// reflects reality and the cron job skips them.

export const dynamic = "force-dynamic";

const STOP_KEYWORDS = new Set([
  "STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT",
]);
const START_KEYWORDS = new Set(["START", "YES", "UNSTOP"]);

function twiml(message?: string): NextResponse {
  const body = message
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
  return new NextResponse(body, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

async function validateTwilioSignature(req: NextRequest, raw: string): Promise<boolean> {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token) return process.env.NODE_ENV !== "production"; // allow in dev only
  const signature = req.headers.get("x-twilio-signature");
  if (!signature) return false;
  const url = req.nextUrl.toString();
  const params = Object.fromEntries(new URLSearchParams(raw));
  return twilio.validateRequest(token, signature, url, params);
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const valid = await validateTwilioSignature(req, raw);
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  const form = new URLSearchParams(raw);
  const from = form.get("From") || "";
  const bodyText = (form.get("Body") || "").trim().toUpperCase();

  if (!from) return twiml();

  if (STOP_KEYWORDS.has(bodyText)) {
    await prisma.user.updateMany({
      where: { phone: from },
      data: { smsOptIn: false },
    });
    return twiml();
  }

  if (START_KEYWORDS.has(bodyText)) {
    await prisma.user.updateMany({
      where: { phone: from },
      data: { smsOptIn: true },
    });
    return twiml(
      "You're back on the Summer Strikes text list. Reply STOP at any time to opt out."
    );
  }

  if (bodyText === "HELP") {
    return twiml(
      "Summer Strikes at Manor Lanes — daily voucher reminders. Reply STOP to opt out. Questions? Call Manor Lanes during business hours."
    );
  }

  return twiml(
    "Thanks for your message. For program questions, please call Manor Lanes during business hours."
  );
}
