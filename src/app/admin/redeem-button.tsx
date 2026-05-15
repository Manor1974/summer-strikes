"use client";

import { useState, useTransition } from "react";
import { redeemVoucher, unredeemVoucher } from "./actions";

export default function RedeemButton({
  voucherId,
  redeemed,
}: {
  voucherId: string;
  redeemed: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [confirmingUndo, setConfirmingUndo] = useState(false);

  if (redeemed) {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirmingUndo) {
            setConfirmingUndo(true);
            setTimeout(() => setConfirmingUndo(false), 3000);
            return;
          }
          startTransition(() => unredeemVoucher(voucherId).then(() => setConfirmingUndo(false)));
        }}
        className="rounded-md border border-black/10 px-3 py-1 text-xs text-sl-navy/60 hover:border-sl-red hover:text-sl-red disabled:opacity-50"
      >
        {pending ? "…" : confirmingUndo ? "Confirm undo" : "Undo"}
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => redeemVoucher(voucherId))}
      className="rounded-md bg-sl-red px-4 py-1.5 text-xs font-medium text-white hover:bg-sl-red-dark disabled:opacity-50"
    >
      {pending ? "…" : "Mark redeemed"}
    </button>
  );
}
