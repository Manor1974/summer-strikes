import "server-only";
import { prisma } from "./prisma";

// 32-char alphabet: digits 2-9 + letters except O/I/L (humans confuse them
// with 0/1). Gives ~1 billion 6-char combinations.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function randomCode(length = 6): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

// Generate a unique reservation code, retrying on the (vanishingly rare)
// chance of collision.
export async function generateUniqueReservationCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    const taken = await prisma.user.findUnique({
      where: { reservationCode: code },
      select: { id: true },
    });
    if (!taken) return code;
  }
  throw new Error("Failed to generate unique reservation code after 5 attempts");
}
