import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import AddMemberForm from "./form";

export const dynamic = "force-dynamic";

export default async function AddMemberPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard/add-member");

  return (
    <main className="mx-auto max-w-xl px-4 py-6 sm:py-10">
      <Link href="/dashboard" className="text-xs text-sl-navy/60 hover:text-sl-navy">
        ← Dashboard
      </Link>
      <h1 className="mt-3 text-xl font-medium text-sl-navy">
        Add a Family Pass <span className="text-sl-gold">adult</span>
      </h1>
      <p className="mt-1 text-sm text-sl-navy/60">
        Each adult or older teen (age 16+) gets 2 free games per day during
        Summer Strikes hours — $49.95 per person, one-time. Kids you&apos;ve
        already enrolled bowl free.
      </p>

      <AddMemberForm />
    </main>
  );
}
