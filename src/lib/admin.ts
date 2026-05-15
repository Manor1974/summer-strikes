import "server-only";
import { auth } from "./auth";

export function adminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS || "";
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.email) return null;
  const email = session.user.email.toLowerCase();
  const isInList = adminEmails().has(email);
  const isAdminRole =
    session.user.role === "ADMIN" || session.user.role === "STAFF";
  if (!isInList && !isAdminRole) return null;
  return session;
}
