import Link from "next/link";
import { existsSync } from "fs";
import { join } from "path";

// Branded top bar used across member pages: Manor Lanes logo + Summer Strikes
// wordmark. Prefers SVG for sharpness; falls back to PNG, then to text-only.
export function BrandHeader({
  rightSlot,
  homeHref = "/",
}: {
  rightSlot?: React.ReactNode;
  homeHref?: string;
}) {
  const publicDir = join(process.cwd(), "public");
  const logoSrc = existsSync(join(publicDir, "manor-lanes-logo.svg"))
    ? "/manor-lanes-logo.svg"
    : existsSync(join(publicDir, "manor-lanes-logo.png"))
    ? "/manor-lanes-logo.png"
    : null;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-black/5 pb-3">
      <Link href={homeHref} className="flex items-center gap-2 group">
        {logoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoSrc}
            alt="Manor Lanes"
            className="h-8 w-auto"
          />
        ) : (
          <span className="text-sm font-bold tracking-tight text-sl-navy">
            MANOR LANES
          </span>
        )}
        <span className="text-xs text-sl-navy/30">·</span>
        <span className="text-xs text-sl-navy/60 group-hover:text-sl-navy">
          Summer <span className="text-sl-gold">Strikes</span>
        </span>
      </Link>
      {rightSlot}
    </div>
  );
}
