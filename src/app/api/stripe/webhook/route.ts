import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { stripe, FAMILY_PASS_PRICE_DOLLARS } from "@/lib/stripe";
import { sendEmail, familyPassActiveEmail } from "@/lib/email";
import { postToFbtReceiver } from "@/lib/fbt-export";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook secret not set" }, { status: 503 });
  }

  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, signature, secret);
  } catch (err) {
    console.error("[stripe/webhook] signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    await handleCheckoutCompleted(session);
  } else if (event.type === "checkout.session.expired") {
    const session = event.data.object;
    await prisma.pendingAdult.deleteMany({
      where: { stripeSessionId: session.id },
    });
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  if (!userId) {
    console.error("[stripe/webhook] checkout.session.completed without userId metadata");
    return;
  }

  const pending = await prisma.pendingAdult.findMany({
    where: { stripeSessionId: session.id },
  });

  if (pending.length === 0) {
    // Already processed (idempotent) or nothing to do.
    return;
  }

  const paidAt = new Date();
  const paymentIntent =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  // Promote each pending adult into an Adult row.
  const promoted: { bowlerNumber: number; name: string; age: number | null; createdAt: Date }[] = [];
  await prisma.$transaction(async (tx) => {
    for (const p of pending) {
      const a = await tx.adult.create({
        data: {
          userId: p.userId,
          name: p.name,
          age: p.age,
          paidAmountCents: 4995,
          stripeSessionId: session.id + "::" + p.id, // unique per adult
          stripePaymentIntentId: paymentIntent,
          paidAt,
          programYear: p.programYear,
        },
        select: { bowlerNumber: true, name: true, age: true, createdAt: true },
      });
      promoted.push(a);
    }
    await tx.pendingAdult.deleteMany({
      where: { stripeSessionId: session.id },
    });
  });

  // Auto-POST newly-paid adults to Conqueror FBT receiver
  postToFbtReceiver(
    promoted.map((a) => ({
      bowlerNumber: a.bowlerNumber,
      name: a.name,
      registeredAt: a.createdAt,
      kind: "adult" as const,
      age: a.age,
    }))
  ).catch((err) => console.error("[stripe/webhook] FBT POST failed:", err));

  // Send confirmation email.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, firstName: true },
  });
  if (user) {
    const totalDollars = `$${((pending.length * 4995) / 100).toFixed(2)}`;
    const adults = pending.map((p) => p.name);
    const { subject, text, html } = familyPassActiveEmail(
      user.firstName,
      adults,
      totalDollars
    );
    try {
      await sendEmail({ to: user.email, subject, text, html });
    } catch (err) {
      console.error("[stripe/webhook] family-pass email failed:", err);
    }
  }

  console.log(
    `[stripe/webhook] Activated ${pending.length} Family Pass adult(s) for user ${userId} at ${FAMILY_PASS_PRICE_DOLLARS}/adult`
  );
}
