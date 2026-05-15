import "server-only";
import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_FROM_NUMBER;
const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

let client: ReturnType<typeof twilio> | null = null;

function getClient() {
  if (!accountSid || !authToken) return null;
  if (!client) client = twilio(accountSid, authToken);
  return client;
}

const OPTOUT_SUFFIX = " Reply STOP to opt out.";
const DASHBOARD_URL = "manorlanes.com/summer-dashboard";

function ensureOptOutSuffix(body: string): string {
  return body.includes("STOP") ? body : `${body}${OPTOUT_SUFFIX}`;
}

export async function sendSms(toE164: string, body: string) {
  const c = getClient();
  if (!c) {
    console.warn("[twilio] No credentials set — would have sent:", { to: toE164, body });
    return { skipped: true } as const;
  }
  const message = await c.messages.create({
    to: toE164,
    body: ensureOptOutSuffix(body),
    ...(messagingServiceSid
      ? { messagingServiceSid }
      : fromNumber
      ? { from: fromNumber }
      : {}),
  });
  return { sid: message.sid } as const;
}

export const smsTemplates = {
  registration: (firstName: string) =>
    `Welcome to Summer Strikes at Manor Lanes, ${firstName}! Your kids are registered. Log in for daily vouchers: ${DASHBOARD_URL}`,
  dailyVoucher: (firstName: string, childNames: string[]) => {
    const kids = childNames.join(" & ");
    return `Good morning ${firstName}! Today's Summer Strikes vouchers for ${kids} are ready. Show your screen at the desk. ${DASHBOARD_URL}`;
  },
  weekendReminder: () =>
    `Manor Lanes reminder: Summer Strikes is available this weekend. See you on the lanes! manorlanes.com/summer`,
  programEnding: (daysLeft: number) =>
    `Only ${daysLeft} days left in Summer Strikes at Manor Lanes! Make the most of it.`,
};
