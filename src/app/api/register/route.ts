import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registrationSchema, normalizePhoneE164 } from "@/lib/schemas";
import { sendSms, smsTemplates } from "@/lib/twilio";
import { sendEmail, welcomeEmail } from "@/lib/email";

function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = registrationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const ip = getClientIp(req);

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists. Try logging in." },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(data.password, 12);
  const phoneE164 = data.phone ? normalizePhoneE164(data.phone) : null;
  const now = new Date();

  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      address: data.address,
      city: data.city,
      state: data.state.toUpperCase(),
      zip: data.zip,
      phone: phoneE164,
      smsOptIn: data.smsOptIn && !!phoneE164,
      smsConsentAt: data.smsOptIn && phoneE164 ? now : null,
      smsConsentIp: data.smsOptIn && phoneE164 ? ip : null,
      termsAcceptedAt: now,
      children: {
        create: data.children.map((c) => ({ name: c.name, age: c.age })),
      },
    },
    include: { children: true },
  });

  // Fire-and-forget notifications. Failures here shouldn't break registration.
  const childNames = user.children.map((c) => c.name.split(" ")[0]);
  const { subject, text, html } = welcomeEmail(user.firstName, user.children.length);
  Promise.allSettled([
    sendEmail({ to: user.email, subject, text, html }),
    user.smsOptIn && phoneE164
      ? sendSms(phoneE164, smsTemplates.registration(user.firstName))
      : Promise.resolve(),
  ]).then((results) => {
    results.forEach((r, i) => {
      if (r.status === "rejected") {
        console.error(`[register] notification ${i} failed:`, r.reason);
      }
    });
  });

  return NextResponse.json({
    ok: true,
    userId: user.id,
    childNames,
  });
}
