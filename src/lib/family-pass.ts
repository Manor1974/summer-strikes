import "server-only";
import { prisma } from "./prisma";
import { stripe, FAMILY_PASS_PRICE_CENTS, appBaseUrl } from "./stripe";
import { programYear } from "./dates";

type AdultInput = { name: string; age?: number | null };

export async function createFamilyPassCheckout({
  userId,
  userEmail,
  adults,
  successPath,
  cancelPath,
}: {
  userId: string;
  userEmail: string;
  adults: AdultInput[];
  successPath: string;
  cancelPath: string;
}): Promise<{ url: string; sessionId: string }> {
  if (!stripe) {
    throw new Error("Stripe is not configured (STRIPE_SECRET_KEY missing)");
  }
  if (adults.length === 0) {
    throw new Error("No adults supplied for Family Pass checkout");
  }

  const base = appBaseUrl();
  const year = programYear();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: userEmail,
    line_items: [
      {
        quantity: adults.length,
        price_data: {
          currency: "usd",
          unit_amount: FAMILY_PASS_PRICE_CENTS,
          product_data: {
            name: `Summer Strikes Family Pass ${year}`,
            description: `Adult bowler · 2 free games/day during program hours · age 16+`,
          },
        },
      },
    ],
    metadata: {
      userId,
      programYear: String(year),
      adultCount: String(adults.length),
    },
    success_url: `${base}${successPath}`,
    cancel_url: `${base}${cancelPath}`,
  });

  // Stash the adult details against the session so the webhook can promote
  // them to Adult rows once Stripe confirms payment.
  await prisma.pendingAdult.createMany({
    data: adults.map((a) => ({
      userId,
      stripeSessionId: session.id,
      name: a.name,
      age: a.age,
      programYear: year,
    })),
  });

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL");
  }

  return { url: session.url, sessionId: session.id };
}
