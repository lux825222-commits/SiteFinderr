import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { STATUS_META } from "@/lib/sitefinder";
import type { SiteStatus } from "@/lib/site-status";

export function StatusBadge({ status, checking }: { status: string; checking?: boolean }) {
  const meta = STATUS_META[(checking ? "pendente" : status) as SiteStatus] ?? STATUS_META.verificar;
  return (
    <Badge variant={meta.variant} className="gap-1.5 whitespace-nowrap" title={meta.description}>
      {checking || status === "pendente" ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <span aria-hidden>{meta.emoji}</span>
      )}
      {meta.label}
    </Badge>
  );
}
