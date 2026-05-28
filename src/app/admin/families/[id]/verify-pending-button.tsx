"use client";

import { useState, useTransition } from "react";
import { verifyAndPromotePendingAdult } from "../../actions";

export default function VerifyPendingButton({ pendingId }: { pendingId: string }) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState<boolean | null>(null);

  const verify = () => {
    setMsg(null);
    setOk(null);
    startTransition(async () => {
      try {
        const r = await verifyAndPromotePendingAdult(pendingId);
        setMsg(r.message);
        setOk(r.ok);
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "Verification failed");
        setOk(false);
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={verify}
        disabled={pending}
        className="rounded-md bg-sl-navy px-3 py-1.5 text-xs font-medium text-white hover:bg-sl-navy-light disabled:opacity-50"
      >
        {pending ? "Verifying…" : "Verify with Stripe"}
      </button>
      {msg && (
        <p
          className={`max-w-xs text-right text-[11px] ${
            ok === true ? "text-[#3B6D11]" : ok === false ? "text-sl-red" : "text-sl-navy/60"
          }`}
        >
          {msg}
        </p>
      )}
    </div>
  );
}
