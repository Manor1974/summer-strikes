import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { loginSchema } from "./schemas";

// Email allowlist (mirrors lib/admin.ts but inlined here to avoid the
// 'server-only' barrier — auth.ts is consumed from middleware/edge in places.)
function adminEmailSet(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // 30-day session so the front-desk iPad stays signed in all summer without
  // anyone having to re-enter the staff password mid-shift. Sessions still
  // auto-extend on each request (rolling).
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (raw) => {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        // If this email is in ADMIN_EMAILS but the DB row is still PARENT
        // (e.g. an admin who registered as a normal parent first), surface
        // ADMIN in the session so role-based UI checks work without a DB
        // mutation. Doesn't downgrade anyone — only escalates.
        const effectiveRole =
          user.role === "PARENT" && adminEmailSet().has(user.email.toLowerCase())
            ? "ADMIN"
            : user.role;

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          role: effectiveRole,
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
});
