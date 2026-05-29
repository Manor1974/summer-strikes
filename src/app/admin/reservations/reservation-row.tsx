"use client";

import { useState, useTransition } from "react";
import {
  adminConfirmReservation,
  adminCancelReservation,
} from "@/app/dashboard/reserve/actions";

type Reservation = {
  id: string;
  reservationDate: Date;
  startTime: string;
  partySize: number;
  notes: string | null;
  status: "REQUESTED" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
  laneNumber: number | null;
  confirmedBy: string | null;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    reservationCode: string | null;
  };
};

function formatTime12(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${display}:${String(m).padStart(2, "0")} ${period}`;
}

export default function ReservationRow({
  r,
  pending,
}: {
  r: Reservation;
  pending?: boolean;
}) {
  const [busy, startTransition] = useTransition();
  const [laneInput, setLaneInput] = useState<string>(
    r.laneNumber ? String(r.laneNumber) : ""
  );
  const [msg, setMsg] = useState<string | null>(null);

  const dateLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(r.reservationDate);

  const handleConfirm = () => {
    const lane = parseInt(laneInput, 10);
    if (!Number.isFinite(lane) || lane < 1 || lane > 24) {
      setMsg("Lane must be 1-24");
      return;
    }
    setMsg(null);
    startTransition(async () => {
      try {
        await adminConfirmReservation(r.id, lane);
        setMsg("✓ Confirmed & family notified");
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "Failed");
      }
    });
  };

  const handleCancel = () => {
    if (!window.confirm(`Cancel ${r.user.firstName}'s reservation?`)) return;
    startTransition(async () => {
      try {
        await adminCancelReservation(r.id);
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "Failed");
      }
    });
  };

  return (
    <tr className="hover:bg-sl-light/40">
      <td className="px-4 py-3 align-top">
        <p className="font-medium text-sl-navy">{dateLabel}</p>
        <p className="text-xs text-sl-navy/60">{formatTime12(r.startTime)}</p>
      </td>
      <td className="px-4 py-3 align-top">
        <p className="text-sl-navy">
          {r.user.firstName} {r.user.lastName}
        </p>
        <p className="text-xs text-sl-navy/60">{r.user.email}</p>
        {r.user.reservationCode && (
          <p className="mt-0.5 font-mono text-[11px] text-sl-gold">
            {r.user.reservationCode}
          </p>
        )}
      </td>
      <td className="px-4 py-3 align-top text-sl-navy/80">
        <p>
          Party of {r.partySize}
          {r.laneNumber ? ` · Lane ${r.laneNumber}` : ""}
        </p>
        {r.notes && (
          <p className="mt-0.5 text-xs italic text-sl-navy/60">{r.notes}</p>
        )}
      </td>
      <td className="px-4 py-3 align-top text-right">
        {pending ? (
          <div className="flex items-center justify-end gap-2">
            <input
              type="number"
              min={1}
              max={24}
              value={laneInput}
              onChange={(e) => setLaneInput(e.target.value)}
              placeholder="Lane #"
              className="h-8 w-20 rounded border border-black/10 bg-sl-light px-2 text-sm"
            />
            <button
              onClick={handleConfirm}
              disabled={busy}
              className="rounded bg-sl-red px-3 py-1.5 text-xs font-medium text-white hover:bg-sl-red-dark disabled:opacity-50"
            >
              Confirm
            </button>
            <button
              onClick={handleCancel}
              disabled={busy}
              className="rounded border border-black/10 px-3 py-1.5 text-xs text-sl-navy/70 hover:border-sl-red hover:text-sl-red"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={handleCancel}
            disabled={busy}
            className="rounded border border-black/10 px-3 py-1.5 text-xs text-sl-navy/70 hover:border-sl-red hover:text-sl-red"
          >
            Cancel
          </button>
        )}
        {msg && (
          <p
            className={`mt-1 text-[11px] ${msg.startsWith("✓") ? "text-[#3B6D11]" : "text-sl-red"}`}
          >
            {msg}
          </p>
        )}
      </td>
    </tr>
  );
}
