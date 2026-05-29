import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registrationSchema, normalizePhoneE164 } from "@/lib/schemas";
import { sendSms, smsTemplates } from "@/lib/twilio";
import { sendEmail, welcomeEmail } from "@/lib/email";
import { createFamilyPassCheckout } from "@/lib/family-pass";
import { postToFbtReceiver } from "@/lib/fbt-export";

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
  const adultCount = data.adults?.length ?? 0;

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

  // Always send the kids-registered welcome email + SMS now.
  // Adult Family Pass success will trigger a follow-up email from the webhook.
  const { subject, text, html } = welcomeEmail(
    user.firstName,
    user.children.length,
    adultCount
  );
  Promise.allSettled([
    sendEmail({ to: user.email, subject, text, html }),
    user.smsOptIn && phoneE164
      ? sendSms(phoneE164, smsTemplates.registration(user.firstName))
      : Promise.resolve(),
    // Auto-POST kids to Conqueror FBT receiver (paid adults POST from the
    // Stripe webhook after payment confirms, not here).
    postToFbtReceiver(
      user.children.map((c) => ({
        bowlerNumber: c.bowlerNumber,
        name: c.name,
        registeredAt: c.createdAt,
        kind: "child" as const,
        age: c.age,
      }))
    ),
  ]).then((results) => {
    results.forEach((r, i) => {
      if (r.status === "rejected") {
        console.error(`[register] notification ${i} failed:`, r.reason);
      }
    });
  });

  // If adults are being added, create a Stripe Checkout Session.
  if (adultCount > 0) {
    try {
      const { url } = await createFamilyPassCheckout({
        userId: user.id,
        userEmail: user.email,
        adults: data.adults,
        successPath: "/register/thanks?paid=1&session_id={CHECKOUT_SESSION_ID}",
        cancelPath: "/register/thanks?paid=0",
      });
      return NextResponse.json({ ok: true, userId: user.id, checkoutUrl: url });
    } catch (err) {
      console.error("[register] Stripe checkout failed:", err);
      // Don't fail the whole registration — kids are saved. User can retry from dashboard.
      return NextResponse.json({
        ok: true,
        userId: user.id,
        familyPassError:
          "Your family is registered, but we couldn't start the Family Pass checkout. You can complete it from your dashboard.",
      });
    }
  }

  return NextResponse.json({ ok: true, userId: user.id });
}
