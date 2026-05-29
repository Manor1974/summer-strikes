import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { buildFbtXml, type FbtBowler } from "@/lib/fbt-export";

export const dynamic = "force-dynamic";

// Streams a Conqueror-compatible FBT.xml of all Summer Strikes bowlers.
// Drop this file into Conqueror's FBT import folder on FRONTDESK1.
export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [kids, adults] = await Promise.all([
    prisma.child.findMany({
      orderBy: { bowlerNumber: "asc" },
      select: {
        bowlerNumber: true,
        name: true,
        age: true,
        createdAt: true,
      },
    }),
    prisma.adult.findMany({
      orderBy: { bowlerNumber: "asc" },
      select: {
        bowlerNumber: true,
        name: true,
        age: true,
        createdAt: true,
      },
    }),
  ]);

  const bowlers: FbtBowler[] = [
    ...kids.map((c) => ({
      bowlerNumber: c.bowlerNumber,
      name: c.name,
      registeredAt: c.createdAt,
      kind: "child" as const,
      age: c.age,
    })),
    ...adults.map((a) => ({
      bowlerNumber: a.bowlerNumber,
      name: a.name,
      registeredAt: a.createdAt,
      kind: "adult" as const,
      age: a.age,
    })),
  ].sort((a, b) => a.bowlerNumber - b.bowlerNumber);

  const xml = buildFbtXml(bowlers);
  const filename = `summer-strikes-FBT-${new Date().toISOString().slice(0, 10)}.xml`;

  return new NextResponse(xml as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/xml; charset=utf-16",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
