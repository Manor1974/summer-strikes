import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { todayInProgramTz, daysLeftInProgram, isProgramActive } from "@/lib/dates";
import { BrandHeader } from "@/components/BrandHeader";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard");

  const userId = session.user.id;
  const { dateOnly } = todayInProgramTz();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      children: { orderBy: { createdAt: "asc" } },
      adults: { orderBy: { createdAt: "asc" } },
      vouchers: {
        where: { validDate: dateOnly },
        include: { child: true, adult: true },
      },
    },
  });

  if (!user) redirect("/login");

  const redeemedVouchers = await prisma.voucher.findMany({
    where: { userId, redeemedAt: { not: null } },
    select: {
      validDate: true,
      gamesBowled: true,
      childId: true,
      adultId: true,
    },
  });
  const gamesBowled = redeemedVouchers.reduce(
    (sum, v) => sum + (v.gamesBowled ?? 2),
    0
  );
  const visitDays = new Set(
    redeemedVouchers.map((v) => v.validDate.toISOString().slice(0, 10))
  ).size;
  const daysLeft = daysLeftInProgram();
  const programOn = isProgramActive();

  const perChild = user.children.map((c) => {
    const myVouchers = redeemedVouchers.filter((v) => v.childId === c.id);
    return {
      kind: "child" as const,
      id: c.id,
      name: c.name,
      age: c.age,
      highScore: c.highScore,
      games: myVouchers.reduce((s, v) => s + (v.gamesBowled ?? 2), 0),
      visits: new Set(myVouchers.map((v) => v.validDate.toISOString().slice(0, 10))).size,
    };
  });
  const perAdult = user.adults.map((a) => {
    const myVouchers = redeemedVouchers.filter((v) => v.adultId === a.id);
    return {
      kind: "adult" as const,
      id: a.id,
      name: a.name,
      age: a.age,
      highScore: a.highScore,
      games: myVouchers.reduce((s, v) => s + (v.gamesBowled ?? 2), 0),
      visits: new Set(myVouchers.map((v) => v.validDate.toISOString().slice(0, 10))).size,
    };
  });
  const allMembers = [...perChild, ...perAdult];

  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  const totalEnrolled = user.children.length + user.adults.length;

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
      <BrandHeader
        rightSlot={
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button className="text-xs text-sl-navy/60 hover:text-sl-navy" type="submit">
              Sign out
            </button>
          </form>
        }
      />

      {/* Family header */}
      <div className="mt-4 flex items-center gap-4 rounded-2xl bg-sl-navy px-5 py-5 text-white">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sl-red text-sm font-medium">
          {initials}
        </div>
        <div className="flex-1">
          <h2 className="text-base font-medium">
            {user.firstName} {user.lastName}
          </h2>
          <p className="text-xs opacity-70">
            {totalEnrolled} member{totalEnrolled === 1 ? "" : "s"} enrolled
            {user.adults.length > 0 && (
              <span className="ml-1.5 rounded-full bg-sl-gold/30 px-2 py-0.5 text-[10px] text-sl-gold">
                Family Pass · {user.adults.length}
              </span>
            )}
          </p>
        </div>
        <span className="rounded-full bg-sl-gold px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-black">
          {programOn ? "Active" : "Off-season"}
        </span>
      </div>

      {/* Stats row */}
      <div className="mt-3 grid grid-cols-3 gap-2.5">
        <Stat value={gamesBowled} label="Games bowled" />
        <Stat value={visitDays} label="Days visited" />
        <Stat value={daysLeft} label="Days left" />
      </div>

      {/* Today's vouchers */}
      <SectionLabel>Today&apos;s vouchers</SectionLabel>
      {!programOn ? (
        <Card>
          <p className="text-sm text-sl-navy/70">
            Summer Strikes runs June 1 – August 31. Vouchers will appear here
            each morning during the program.
          </p>
        </Card>
      ) : user.vouchers.length === 0 ? (
        <Card>
          <p className="text-sm text-sl-navy/70">
            Today&apos;s vouchers will be ready at 7am. Check back then.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {user.vouchers.map((v) => {
            const member = v.child ?? v.adult;
            const isAdult = !!v.adult;
            if (!member) return null;
            return (
              <div
                key={v.id}
                className="flex items-center gap-4 rounded-2xl border border-black/5 bg-white px-5 py-4 shadow-sm"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#EDF3FC] text-xl">
                  🎳
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-sl-navy">
                    {member.name} — 2 Free Games
                  </h4>
                  <p className="mt-0.5 text-xs text-sl-navy/60">
                    Valid today · Expires 11:59pm
                    {isAdult && <span className="ml-2 text-sl-gold">· Family Pass</span>}
                  </p>
                </div>
                {v.redeemedAt ? (
                  <span className="rounded-full bg-sl-light px-3 py-1 text-[11px] font-medium text-sl-navy/60">
                    Redeemed
                  </span>
                ) : (
                  <span className="rounded-full bg-[#EAF3DE] px-3 py-1 text-[11px] font-medium text-[#3B6D11]">
                    Available
                  </span>
                )}
              </div>
            );
          })}
          {user.vouchers.some((v) => !v.redeemedAt) && (
            <Link
              href="/dashboard/show"
              className="mt-2 block w-full rounded-md bg-sl-red px-4 py-3 text-center text-sm font-medium text-white hover:bg-sl-red-dark"
            >
              Show vouchers at the desk →
            </Link>
          )}
        </div>
      )}

      {/* Member stats + Add adult */}
      <div className="mt-5 flex items-end justify-between">
        <h3 className="text-[11px] font-medium uppercase tracking-wider text-sl-navy/60">
          Family members
        </h3>
        <Link
          href="/dashboard/add-member"
          className="text-xs font-medium text-sl-red hover:underline"
        >
          + Add Family Pass adult ($49.95)
        </Link>
      </div>
      <div className="mt-2 space-y-2">
        {allMembers.map((m) => (
          <div
            key={`${m.kind}-${m.id}`}
            className="rounded-2xl border border-black/5 bg-white px-5 py-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium ${m.kind === "adult" ? "bg-sl-gold/20 text-sl-gold" : "bg-[#EDF3FC] text-sl-navy"}`}>
                {m.name
                  .split(" ")
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-sl-navy">
                  {m.name}
                  {m.kind === "adult" && (
                    <span className="ml-2 rounded-full bg-sl-gold/20 px-2 py-0.5 text-[10px] font-medium text-sl-gold">
                      Family Pass
                    </span>
                  )}
                </h4>
                <p className="text-xs text-sl-navy/60">Age {m.age}</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <MiniStat value={m.games} label="Games" />
              <MiniStat value={m.highScore} label="High score" />
              <MiniStat value={m.visits} label="Visits" />
            </div>
          </div>
        ))}
      </div>

      {/* SMS prefs */}
      <SectionLabel>Text alerts</SectionLabel>
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-sl-navy">
              {user.smsOptIn ? "Daily voucher texts: ON" : "Text alerts: OFF"}
            </p>
            <p className="mt-0.5 text-xs text-sl-navy/60">
              {user.phone ? `Sent to ${formatUSPhone(user.phone)}` : "No phone number on file"}
            </p>
          </div>
          <Link
            href="/dashboard/sms"
            className="rounded-md border border-black/10 px-3 py-1.5 text-xs font-medium text-sl-navy hover:bg-sl-light"
          >
            Manage
          </Link>
        </div>
      </Card>

      <footer className="mt-8 pb-4 text-center text-xs text-sl-navy/40">
        Manor Lanes · Summer Strikes 2026 ·{" "}
        <Link href="/faq" className="hover:text-sl-navy">
          FAQ
        </Link>
      </footer>
    </main>
  );
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="rounded-md bg-sl-light p-4 text-center">
      <div className="text-2xl font-medium text-sl-navy">{value}</div>
      <div className="mt-1 text-[11px] text-sl-navy/60">{label}</div>
    </div>
  );
}

function MiniStat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="rounded-md bg-sl-light p-2 text-center">
      <div className="text-base font-medium text-sl-navy">{value}</div>
      <div className="mt-0.5 text-[10px] text-sl-navy/60">{label}</div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-5 mb-2.5 text-[11px] font-medium uppercase tracking-wider text-sl-navy/60">
      {children}
    </h3>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white px-5 py-4 shadow-sm">
      {children}
    </div>
  );
}

function formatUSPhone(e164: string): string {
  const m = e164.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  if (!m) return e164;
  return `(${m[1]}) ${m[2]}-${m[3]}`;
}
