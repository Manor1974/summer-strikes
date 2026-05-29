"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function resetPassword(
  token: string,
  newPassword: string
): Promise<{ ok: true; email: string } | { ok: false; error: string }> {
  if (newPassword.length < 6) {
    return { ok: false, error: "Password must be at least 6 characters" };
  }
  const vt = await prisma.verificationToken.findUnique({ where: { token } });
  if (!vt || !vt.identifier.startsWith("pw-reset:") || vt.expires.getTime() <= Date.now()) {
    return { ok: false, error: "This reset link is no longer valid" };
  }
  const userId = vt.identifier.replace(/^pw-reset:/, "");
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });
  if (!user) {
    return { ok: false, error: "Account no longer exists" };
  }
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
    prisma.verificationToken.delete({ where: { token } }),
  ]);
  return { ok: true, email: user.email };
}
