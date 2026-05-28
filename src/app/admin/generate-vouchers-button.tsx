"use client";

import { useState, useTransition } from "react";
import { generateTodayVouchers } from "./actions";

export default function GenerateVouchersButton() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  const run = (withSms: boolean) => {
    setResult(null);
    startTransition(async () => {
      try {
        const r = await generateTodayVouchers({ sendSms: withSms });
        setResult(
          `✓ Generated ${r.vouchersCreated} vouchers for ${r.families} families` +
            (withSms ? ` · sent ${r.smsQueued} SMS${r.smsFailed ? `, ${r.smsFailed} failed` : ""}` : "")
        );
      } catch (e) {
        setResult(`Error: ${e instanceof Error ? e.message : "failed"}`);
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      {result && (
        <span className={`rounded-md px-3 py-1 text-xs ${result.startsWith("✓") ? "bg-[#EAF3DE] text-[#3B6D11]" : "bg-sl-red/10 text-sl-red"}`}>
          {result}
        </span>
      )}
      <button
        onClick={() => run(false)}
        disabled={pending}
        className="rounded-md border border-black/10 px-3 py-1.5 text-xs font-medium text-sl-navy hover:bg-sl-light disabled:opacity-50"
      >
        {pending ? "…" : "Generate today's vouchers"}
      </button>
      <button
        onClick={() => run(true)}
        disabled={pending}
        title="Also sends the daily SMS reminder to opted-in families"
        className="rounded-md bg-sl-navy px-3 py-1.5 text-xs font-medium text-white hover:bg-sl-navy-light disabled:opacity-50"
      >
        + SMS
      </button>
    </div>
  );
}
