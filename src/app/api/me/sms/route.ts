import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizePhoneE164 } from "@/lib/schemas";
import { z } from "zod";

const updateSchema = z.object({
  smsOptIn: z.boolean(),
  phone: z.string().optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = updateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { smsOptIn, phone } = parsed.data;
  const phoneE164 = phone ? normalizePhoneE164(phone) : null;

  if (smsOptIn && !phoneE164) {
    return NextResponse.json(
      { error: "Phone number is required to enable text alerts" },
      { status: 400 }
    );
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      smsOptIn,
      ...(phoneE164 ? { phone: phoneE164 } : {}),
      ...(smsOptIn
        ? { smsConsentAt: new Date(), smsConsentIp: ip }
        : {}),
    },
    select: { smsOptIn: true, phone: true },
  });

  return NextResponse.json({ ok: true, ...updated });
}
