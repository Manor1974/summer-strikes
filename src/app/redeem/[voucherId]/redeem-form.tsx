"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { redeemVoucher } from "@/app/admin/actions";

export default function RedeemForm({
  voucherId,
  memberName,
}: {
  voucherId: string;
  memberName: string;
}) {
  const router = useRouter();
  const [games, setGames] = useState(2);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const redeem = () => {
    setError(null);
    startTransition(async () => {
      try {
        await redeemVoucher(voucherId, games);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't redeem");
      }
    });
  };

  return (
    <div className="mt-5">
      <label className="block text-[11px] uppercase tracking-wider text-sl-navy/60">
        Games bowled
      </label>
      <div className="mt-2 flex gap-2">
        {[1, 2].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setGames(n)}
            className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium ${
              games === n
                ? "border-sl-red bg-sl-red text-white"
                : "border-black/10 bg-white text-sl-navy/70 hover:border-sl-navy"
            }`}
          >
            {n} game{n === 1 ? "" : "s"}
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-3 rounded-md bg-sl-red/10 px-3 py-2 text-sm text-sl-red">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={redeem}
        disabled={pending}
        className="mt-4 w-full rounded-md bg-sl-red px-4 py-4 text-base font-medium text-white hover:bg-sl-red-dark disabled:opacity-50"
      >
        {pending ? "Redeeming…" : `Mark ${memberName}'s voucher redeemed →`}
      </button>
    </div>
  );
}
