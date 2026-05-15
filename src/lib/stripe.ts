import "server-only";
import Stripe from "stripe";

const stripeKey = process.env.STRIPE_SECRET_KEY;

export const stripe = stripeKey
  ? new Stripe(stripeKey, { apiVersion: "2026-04-22.dahlia" })
  : null;

export const FAMILY_PASS_PRICE_CENTS = 4995;
export const FAMILY_PASS_PRICE_DOLLARS = "$49.95";

export function appBaseUrl(): string {
  const url = process.env.AUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (url) return url.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3030";
}
