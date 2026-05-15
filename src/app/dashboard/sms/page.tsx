import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SmsPrefsForm from "./form";

export const dynamic = "force-dynamic";

export default async function SmsPrefsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard/sms");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { smsOptIn: true, phone: true, smsConsentAt: true },
  });
  if (!user) redirect("/login");

  return (
    <main className="mx-auto max-w-md px-4 py-6 sm:py-10">
      <Link href="/dashboard" className="text-xs text-sl-navy/60 hover:text-sl-navy">
        ← Dashboard
      </Link>
      <h1 className="mt-3 text-xl font-medium text-sl-navy">Text alerts</h1>
      <p className="mt-1 text-sm text-sl-navy/60">
        Daily voucher reminders sent to your mobile phone during program hours.
        Reply STOP to any text to opt out instantly.
      </p>

      <SmsPrefsForm initialOptIn={user.smsOptIn} initialPhone={user.phone || ""} />

      {user.smsConsentAt && (
        <p className="mt-6 text-[11px] text-sl-navy/40">
          Consent recorded on {user.smsConsentAt.toLocaleString()}.
        </p>
      )}
    </main>
  );
}
