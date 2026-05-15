import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addAdultsSchema } from "@/lib/schemas";
import { createFamilyPassCheckout } from "@/lib/family-pass";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = addAdultsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    const { url } = await createFamilyPassCheckout({
      userId: user.id,
      userEmail: user.email,
      adults: parsed.data.adults,
      successPath: "/dashboard?fp=1&session_id={CHECKOUT_SESSION_ID}",
      cancelPath: "/dashboard/add-member?cancelled=1",
    });
    return NextResponse.json({ ok: true, checkoutUrl: url });
  } catch (err) {
    console.error("[family-pass/checkout] failed:", err);
    return NextResponse.json(
      { error: "Couldn't start checkout. Try again or contact support." },
      { status: 500 }
    );
  }
}
