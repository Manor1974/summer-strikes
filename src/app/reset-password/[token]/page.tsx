import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ResetPasswordForm from "./form";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const vt = await prisma.verificationToken.findUnique({ where: { token } });
  const valid =
    vt &&
    vt.identifier.startsWith("pw-reset:") &&
    vt.expires.getTime() > Date.now();

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <Link
        href="/"
        className="flex items-center gap-2 text-sm font-bold tracking-tight text-sl-navy"
      >
        MANOR LANES
        <span className="text-xs font-normal text-sl-navy/30">·</span>
        <span className="text-xs font-normal text-sl-navy/60">
          Summer <span className="text-sl-gold">Strikes</span>
        </span>
      </Link>

      <div className="mt-6 rounded-2xl border border-black/5 bg-white p-7 shadow-sm">
        {valid ? (
          <>
            <h1 className="text-xl font-medium text-sl-navy">
              Set a new <span className="text-sl-gold">password</span>
            </h1>
            <p className="mt-1 text-sm text-sl-navy/60">
              Choose something at least 6 characters. After you save,
              you&apos;ll be signed in automatically.
            </p>
            <ResetPasswordForm token={token} />
          </>
        ) : (
          <>
            <h1 className="text-xl font-medium text-sl-navy">
              Reset link expired
            </h1>
            <p className="mt-1 text-sm text-sl-navy/60">
              This link is no longer valid &mdash; password reset links last 1
              hour. Request a new one.
            </p>
            <Link
              href="/forgot-password"
              className="mt-5 block w-full rounded-md bg-sl-red px-4 py-3 text-center text-sm font-medium text-white hover:bg-sl-red-dark"
            >
              Request a new link
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
