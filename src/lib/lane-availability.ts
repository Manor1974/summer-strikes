import "server-only";

// Manor Lanes' own lane-availability feed, published by
// lane-availability-poller.ps1 on FRONTDESK1 every minute. The poller writes
// /lm/data/lane-availability.json on manorlanes.com via
// lane-availability-receiver.php. We read that JSON directly — single source
// of truth shared with the main Manor Lanes hours widget.
//
// Format published by the poller:
// {
//   "updated_at": "2026-05-28T20:59:13-04:00",
//   "lanes_total": 24,
//   "lanes_available_now": 23,
//   "lanes_in_use": 1,
//   "currently_open": true
// }

const FEED_URL = "https://manorlanes.com/lm/data/lane-availability.json";

export type LaneStatus =
  | { status: "open_now"; lanesOpen: number; lanesTotal: number; updatedAt: string }
  | { status: "closed_now"; updatedAt: string }
  | { status: "unknown" };

type Feed = {
  updated_at?: string;
  lanes_total?: number;
  lanes_available_now?: number;
  lanes_in_use?: number;
  currently_open?: boolean;
};

export async function getLaneStatus(): Promise<LaneStatus> {
  try {
    const res = await fetch(FEED_URL, {
      // Match the poller's ~60s cadence — no point caching longer than that.
      next: { revalidate: 60, tags: ["lane-availability"] },
    });
    if (!res.ok) return { status: "unknown" };
    const feed = (await res.json()) as Feed;
    if (typeof feed.lanes_available_now !== "number") {
      return { status: "unknown" };
    }
    const updatedAt = feed.updated_at ?? new Date().toISOString();
    if (!feed.currently_open) {
      return { status: "closed_now", updatedAt };
    }
    return {
      status: "open_now",
      lanesOpen: feed.lanes_available_now,
      lanesTotal: feed.lanes_total ?? 24,
      updatedAt,
    };
  } catch {
    return { status: "unknown" };
  }
}

// Pretty-printer for the dashboard pill.
export function laneStatusLabel(s: LaneStatus): {
  text: string;
  sub: string | null;
  tone: "green" | "amber" | "red" | "gray";
} {
  if (s.status === "open_now") {
    const tone: "green" | "amber" =
      s.lanesOpen === 0 ? "amber" : "green";
    const text =
      s.lanesOpen === 0
        ? "Open · no lanes free right now"
        : `Open now · ${s.lanesOpen} of ${s.lanesTotal} lane${s.lanesTotal === 1 ? "" : "s"} available`;
    return { text, sub: relativeAgo(s.updatedAt), tone };
  }
  if (s.status === "closed_now") {
    return {
      text: "Closed right now",
      sub: relativeAgo(s.updatedAt),
      tone: "red",
    };
  }
  return {
    text: "Lane availability unavailable",
    sub: null,
    tone: "gray",
  };
}

function relativeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "live";
  const seconds = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (seconds < 90) return "updated just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `updated ${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return `updated ${hours} hr ago`;
}
