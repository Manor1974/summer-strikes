// Single source of truth for Manor Lanes' open-bowling hours during the
// Summer Strikes program. Imported by the landing page, FAQ, staff guide,
// email templates, and dashboard.
//
// When the WordPress plugin exposes a REST endpoint (e.g.,
// /wp-json/manorlanes/v1/hours), swap the implementation below to fetch and
// cache it — all consumers will pick up the change automatically.

export type DaySchedule = { day: string; hours: string | null };

// Current operating model:
//   Mon–Fri: 5:00 PM – 11:00 PM open bowling
//   Sat:     5:00 PM – 11:00 PM every OTHER Saturday starting May 30, 2026
//   Sun:     closed
//
// Alternating Saturday math: anchor = 2026-05-30 (open). Subsequent open
// Saturdays = 2 weeks later. (May 30, Jun 13, Jun 27, Jul 11, …)

const SATURDAY_ANCHOR_ISO = "2026-05-30"; // first OPEN summer Saturday

export const PROGRAM_HOURS_BASE: DaySchedule[] = [
  { day: "Sunday", hours: null },
  { day: "Monday", hours: "5:00pm – 11:00pm" },
  { day: "Tuesday", hours: "5:00pm – 11:00pm" },
  { day: "Wednesday", hours: "5:00pm – 11:00pm" },
  { day: "Thursday", hours: "5:00pm – 11:00pm" },
  { day: "Friday", hours: "5:00pm – 11:00pm" },
  { day: "Saturday", hours: "5:00pm – 11:00pm · every other Sat" },
];

// Returns true if the given JS Date falls on an "open" Saturday given the
// alternating-Saturday rule.
export function isOpenSaturday(date: Date): boolean {
  const anchor = new Date(`${SATURDAY_ANCHOR_ISO}T00:00:00-04:00`);
  // Find the most recent Saturday at midnight ET.
  const dayMs = 24 * 60 * 60 * 1000;
  const diffWeeks = Math.floor(
    (date.getTime() - anchor.getTime()) / (7 * dayMs)
  );
  return diffWeeks >= 0 && diffWeeks % 2 === 0;
}

// Returns hours for a specific date, applying the alternating Saturday rule.
export function hoursForDate(date: Date): string | null {
  const dow = date.getDay();
  if (dow === 0) return null;
  if (dow === 6) return isOpenSaturday(date) ? "5:00pm – 11:00pm" : null;
  return "5:00pm – 11:00pm";
}

// Convenience: schedule with a note appended to the Saturday row explaining
// the alternation. Used in static displays (email, FAQ, landing).
export function staticDisplaySchedule(): DaySchedule[] {
  return PROGRAM_HOURS_BASE;
}
