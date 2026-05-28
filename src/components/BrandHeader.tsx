import Link from "next/link";
import { existsSync } from "fs";
import { join } from "path";

// Branded top bar used across member pages: Manor Lanes logo + Summer Strikes
// wordmark. If /public/manor-lanes-logo.png exists, the logo image renders.
// Otherwise the text wordmark stands on its own.
export function BrandHeader({
  rightSlot,
  homeHref = "/",
}: {
  rightSlot?: React.ReactNode;
  homeHref?: string;
}) {
  const hasLogo = existsSync(join(process.cwd(), "public", "manor-lanes-logo.png"));

  return (
    <div className="flex items-center justify-between gap-3 border-b border-black/5 pb-3">
      <Link href={homeHref} className="flex items-center gap-2 group">
        {hasLogo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/manor-lanes-logo.png"
            alt="Manor Lanes"
            className="h-7 w-auto"
          />
        )}
        <span className="text-sm font-bold tracking-tight text-sl-navy">
          MANOR LANES
        </span>
        <span className="text-xs text-sl-navy/30">·</span>
        <span className="text-xs text-sl-navy/60 group-hover:text-sl-navy">
          Summer <span className="text-sl-gold">Strikes</span>
        </span>
      </Link>
      {rightSlot}
    </div>
  );
}
