// Single source of truth for Manor Lanes' open-bowling hours during the
// Summer Strikes program. Imported by the landing page, FAQ, staff guide,
// email templates, dashboard, and the daily-vouchers cron.
//
// When the WordPress plugin exposes a REST endpoint (e.g.,
// /wp-json/manorlanes/v1/hours), swap the implementation below to fetch and
// cache it — all consumers will pick up the change automatically.

export type DaySchedule = { day: string; hours: string | null };

// Current operating model:
//   Mon–Fri: 5:00 PM – 11:00 PM open bowling
//   Sat:     5:00 PM – 11:00 PM on the specific dates listed below.
//            These aren't a clean biweekly pattern — Manor Lanes had to skip
//            and shuffle some Saturdays for booked events. Update this list
//            (not a formula) when the calendar changes again.
//   Sun:     closed

export const OPEN_SATURDAYS_2026: ReadonlyArray<string> = [
  "2026-05-30",
  "2026-06-13",
  "2026-06-27",
  "2026-07-11",
  "2026-07-25",
  "2026-08-01",
  "2026-08-22",
];

export const PROGRAM_HOURS_BASE: DaySchedule[] = [
  { day: "Sunday", hours: null },
  { day: "Monday", hours: "5:00pm – 11:00pm" },
  { day: "Tuesday", hours: "5:00pm – 11:00pm" },
  { day: "Wednesday", hours: "5:00pm – 11:00pm" },
  { day: "Thursday", hours: "5:00pm – 11:00pm" },
  { day: "Friday", hours: "5:00pm – 11:00pm" },
  { day: "Saturday", hours: "5:00pm – 11:00pm · select Saturdays" },
];

function isoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// True if the given Date is one of the listed open Saturdays.
export function isOpenSaturday(date: Date): boolean {
  if (date.getDay() !== 6) return false;
  return OPEN_SATURDAYS_2026.includes(isoDate(date));
}

// Returns hours for a specific date, applying the Saturday list.
// null means closed.
export function hoursForDate(date: Date): string | null {
  const dow = date.getDay();
  if (dow === 0) return null;
  if (dow === 6) return isOpenSaturday(date) ? "5:00pm – 11:00pm" : null;
  return "5:00pm – 11:00pm";
}

// True if Manor Lanes is open for Summer Strikes today (i.e., we should
// generate vouchers + run normal program operations).
export function isProgramDayToday(): boolean {
  const todayET = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
  );
  return hoursForDate(todayET) !== null;
}

// Human-friendly list of open Saturdays for display in copy.
export function openSaturdaysReadable(): string {
  const fmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/New_York",
  });
  return OPEN_SATURDAYS_2026.map((iso) => fmt.format(new Date(`${iso}T12:00:00-04:00`))).join(", ");
}

// Convenience: schedule for static displays (email, FAQ, landing).
export function staticDisplaySchedule(): DaySchedule[] {
  return PROGRAM_HOURS_BASE;
}
