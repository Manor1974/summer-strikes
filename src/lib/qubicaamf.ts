import "server-only";

// QubicaAMF "qcloud" public-booking API integration.
// Same endpoint + API key used by the Manor Lanes hours widget on
// manorlanes.com — see hours-widget.html for the original implementation.
//
// We use it server-side here so we can:
//  - cache responses (no need to hit Qubica for every parent dashboard view)
//  - add fallbacks gracefully (timeouts, downtime)
//  - eventually swap to the WordPress plugin's REST endpoint when one exists.

const SYSTEM_ID = 3254;
const API_KEY = "93108f56-0825-4030-b85f-bc6a69fa502c";
const BASE = `https://qcloud.qubicaamf.com/bowler/centers/${SYSTEM_ID}/offers-availability`;

export type LaneStatus =
  | { status: "open_now"; lanesOpen: number; closesAt: string | null }
  | { status: "opens_later_today"; opensAt: string; lanesOpen?: number }
  | { status: "closed_today"; nextOpenLabel: string | null }
  | { status: "unknown" };

type QubicaItem = {
  Time?: string;
  Remaining?: number;
  Reason?: string | null;
  Alternatives?: Array<{ Time?: string; Remaining?: number }>;
};

type QubicaOffer = { Items?: QubicaItem[] };

// Pad date/time helpers (Manor Lanes is America/New_York)
function pad(n: number): string {
  return String(n).padStart(2, "0");
}
function dateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function timeStr(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Convert any Date to an equivalent Date instance whose getters reflect
// America/New_York wall-clock time. Avoids JS Date timezone weirdness.
function nowET(): Date {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
  );
}

async function fetchAvailability(
  d: string,
  t: string
): Promise<QubicaOffer[] | null> {
  const url = `${BASE}?systemId=${SYSTEM_ID}&datetime=${d}T${t}&players=1-4&page=1&itemsPerPage=50`;
  try {
    // Next 13.4+ extended fetch with revalidate: cache per (d,t) tuple for 5 min.
    const res = await fetch(url, {
      headers: {
        "ocp-apim-subscription-key": API_KEY,
        "Content-Type": "application/json",
      },
      next: { revalidate: 300, tags: ["lane-availability"] },
    });
    if (!res.ok) return null;
    return (await res.json()) as QubicaOffer[];
  } catch {
    return null;
  }
}

function maxRemaining(offers: QubicaOffer[] | null): {
  remaining: number;
  time: string | null;
} {
  if (!offers) return { remaining: 0, time: null };
  let r = 0;
  let t: string | null = null;
  for (const offer of offers) {
    for (const item of offer.Items ?? []) {
      if (item.Remaining && item.Remaining > 0 && !item.Reason) {
        if (item.Remaining > r) {
          r = item.Remaining;
          t = item.Time ?? null;
        }
      }
    }
  }
  return { remaining: r, time: t };
}

// Public surface for the dashboard.
export async function getLaneStatus(): Promise<LaneStatus> {
  const now = nowET();
  const d = dateStr(now);
  const t = timeStr(now);
  const offers = await fetchAvailability(d, t);
  if (offers === null) return { status: "unknown" };

  const { remaining, time } = maxRemaining(offers);
  if (remaining > 0) {
    return {
      status: "open_now",
      lanesOpen: remaining,
      closesAt: time,
    };
  }

  // Closed right now. Scan forward ~6h to see if we open later today.
  for (let mins = 30; mins <= 360; mins += 30) {
    const future = new Date(now.getTime() + mins * 60 * 1000);
    if (future.getDate() !== now.getDate()) break; // crossed midnight
    const futureT = timeStr(future);
    const futureOffers = await fetchAvailability(d, futureT);
    const { remaining: r, time: tt } = maxRemaining(futureOffers);
    if (r > 0) {
      return {
        status: "opens_later_today",
        opensAt: tt ?? futureT,
        lanesOpen: r,
      };
    }
  }

  return { status: "closed_today", nextOpenLabel: null };
}

// Pretty-printer for the dashboard pill.
export function laneStatusLabel(s: LaneStatus): {
  text: string;
  tone: "green" | "amber" | "red" | "gray";
} {
  switch (s.status) {
    case "open_now":
      return {
        text: `Open now · ${s.lanesOpen} lane${s.lanesOpen === 1 ? "" : "s"} available`,
        tone: "green",
      };
    case "opens_later_today":
      return { text: `Opens today at ${s.opensAt}`, tone: "amber" };
    case "closed_today":
      return { text: "Closed today", tone: "red" };
    case "unknown":
    default:
      return { text: "Availability updates every 5 min", tone: "gray" };
  }
}
