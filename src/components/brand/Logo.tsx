import logoAsset from "@/assets/sitefinder-logo.png.asset.json";
import { cn } from "@/lib/utils";

export const LOGO_URL = logoAsset.url;

export function Logo({ className, withText = false }: { className?: string; withText?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <img src={logoAsset.url} alt="SiteFinder" className={cn("h-9 w-9 shrink-0 rounded-full", className)} />
      {withText && (
        <span className="font-display text-lg font-bold tracking-tight">
          Site<span className="text-primary-glow">Finder</span>
        </span>
      )}
    </span>
  );
}
