"use client";

import { useState, useTransition } from "react";
import { resyncAllBowlersToFbt } from "../actions";

export default function ResyncButton() {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const run = () => {
    setMsg(null);
    startTransition(async () => {
      try {
        const r = await resyncAllBowlersToFbt();
        setMsg(`✓ Re-POSTed ${r.posted} bowler${r.posted === 1 ? "" : "s"} to the receiver.`);
        setConfirming(false);
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "Failed");
      }
    });
  };

  return (
    <div className="flex items-center gap-3">
      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="rounded-md bg-sl-red px-3 py-2 text-sm font-medium text-white hover:bg-sl-red-dark"
        >
          Re-sync all bowlers
        </button>
      ) : (
        <>
          <span className="text-sm text-sl-navy">Resend every bowler now?</span>
          <button
            onClick={run}
            disabled={pending}
            className="rounded-md bg-sl-red px-3 py-2 text-sm font-medium text-white hover:bg-sl-red-dark disabled:opacity-50"
          >
            {pending ? "Sending…" : "Yes, resend"}
          </button>
          <button
            onClick={() => setConfirming(false)}
            disabled={pending}
            className="rounded-md border border-black/10 px-3 py-2 text-sm text-sl-navy/70"
          >
            Cancel
          </button>
        </>
      )}
      {msg && (
        <p
          className={`text-xs ${msg.startsWith("✓") ? "text-[#3B6D11]" : "text-sl-red"}`}
        >
          {msg}
        </p>
      )}
    </div>
  );
}
