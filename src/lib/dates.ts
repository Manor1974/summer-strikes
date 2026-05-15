// Summer Strikes program runs June 1 – August 31. We use America/New_York
// since Manor Lanes is in Buffalo, NY.

export const PROGRAM_TZ = "America/New_York";

export function programYear(): number {
  return new Date().getFullYear();
}

export function programStart(year: number = programYear()): Date {
  return new Date(`${year}-06-01T00:00:00-04:00`);
}

export function programEnd(year: number = programYear()): Date {
  return new Date(`${year}-08-31T23:59:59-04:00`);
}

export function todayInProgramTz(): { dateOnly: Date; isoDate: string } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PROGRAM_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  const isoDate = `${get("year")}-${get("month")}-${get("day")}`;
  return { dateOnly: new Date(`${isoDate}T00:00:00Z`), isoDate };
}

export function isProgramActive(): boolean {
  const now = new Date();
  return now >= programStart() && now <= programEnd();
}

export function daysLeftInProgram(): number {
  const now = new Date();
  const end = programEnd();
  const ms = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}
