import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdmin();
  if (!session) redirect("/login?callbackUrl=/admin");

  return (
    <div className="min-h-screen bg-sl-light">
      <nav className="border-b border-black/5 bg-sl-navy text-white">
        <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
          <Link href="/admin" className="text-sm font-medium">
            <span className="opacity-70">Manor Lanes ·</span> Admin
          </Link>
          <Link href="/admin" className="text-xs opacity-70 hover:opacity-100">
            Today
          </Link>
          <Link href="/admin/families" className="text-xs opacity-70 hover:opacity-100">
            Families
          </Link>
          <Link href="/admin/sms" className="text-xs opacity-70 hover:opacity-100">
            SMS
          </Link>
          <span className="ml-auto text-xs opacity-60">{session.user.email}</span>
        </div>
      </nav>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
