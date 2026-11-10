import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Clock, ExternalLink, Globe, Loader2, MapPin, Phone, RefreshCw, Star, Tag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./StatusBadge";
import { formatDateTime, isStale } from "@/lib/sitefinder";
import { refreshLead } from "@/lib/leads.functions";
import { setFavorite, type Lead } from "@/lib/leads-client";
import { cn } from "@/lib/utils";

interface Props {
  lead: Lead;
  checking?: boolean | undefined;
  onUpdate: (lead: Lead) => void;
  onRecheck: (ids: string[]) => void;
}

export function LeadCard({ lead, checking, onUpdate, onRecheck }: Props) {
  const queryClient = useQueryClient();
  const refresh = useServerFn(refreshLead);
  const [favBusy, setFavBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const stale = isStale(lead.fetched_at);

  async function toggleFavorite() {
    setFavBusy(true);
    try {
      const updated = await setFavorite(lead.id, !lead.is_favorite);
      onUpdate(updated);
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success(updated.is_favorite ? "Lead salvo nos favoritos" : "Removido dos favoritos");
    } catch {
      toast.error("Não foi possível atualizar o favorito.");
    } finally {
      setFavBusy(false);
    }
  }

  async function doRefresh() {
    setRefreshing(true);
    try {
      const res = await refresh({ data: { leadId: lead.id } });
      onUpdate(res.lead);
      toast.success("Dados atualizados com o Google Maps");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao atualizar.");
    } finally {
      setRefreshing(false);
    }
  }

  const websiteLabel = lead.website?.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return (
    <article className="surface group flex flex-col p-5 transition-all hover:-translate-y-0.5 hover:shadow-glow">
      <div className="flex items-start justify-between gap-3">
        <h3 className="line-clamp-2 text-base font-semibold leading-snug">{lead.name}</h3>
        <button
          type="button"
          onClick={toggleFavorite}
          disabled={favBusy}
          aria-label={lead.is_favorite ? "Remover dos favoritos" : "Salvar nos favoritos"}
          className={cn(
            "shrink-0 rounded-full p-1.5 transition-colors hover:bg-accent",
            lead.is_favorite ? "text-status-none" : "text-muted-foreground",
          )}
        >
          <Star className={cn("h-5 w-5", lead.is_favorite && "fill-current")} />
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <StatusBadge status={lead.site_status} checking={checking} />
        {lead.category && (
          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            <Tag className="h-3 w-3" /> {lead.category}
          </span>
        )}
      </div>

      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-glow" />
          <dd className="text-muted-foreground">{lead.address ?? "Endereço não informado"}</dd>
        </div>
        <div className="flex gap-2">
          <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary-glow" />
          <dd>
            {lead.phone ? (
              <a href={`tel:${lead.phone.replace(/\D/g, "")}`} className="hover:text-primary-glow">
                {lead.phone}
              </a>
            ) : (
              <span className="text-muted-foreground">Telefone não disponível</span>
            )}
          </dd>
        </div>
        <div className="flex gap-2">
          <Globe className="mt-0.5 h-4 w-4 shrink-0 text-primary-glow" />
          <dd className="min-w-0">
            {lead.website ? (
              <a
                href={lead.website}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="block truncate hover:text-primary-glow"
              >
                {websiteLabel}
              </a>
            ) : (
              <span className="text-muted-foreground">Nenhum site cadastrado</span>
            )}
          </dd>
        </div>
        <div className="flex gap-2">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary-glow" />
          <dd className="text-muted-foreground">
            Verificado em {formatDateTime(lead.last_checked_at)}
            {lead.check_attempts > 0 && ` · ${lead.check_attempts} tentativa(s)`}
          </dd>
        </div>
      </dl>

      {lead.site_notes && (
        <p className="mt-3 rounded-lg border border-status-check/25 bg-status-check/10 px-3 py-2 text-xs text-status-check">
          {lead.site_notes}
        </p>
      )}
      {stale && (
        <p className="mt-3 rounded-lg border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          Dados do Google com mais de 30 dias — atualize para manter as informações em dia.
        </p>
      )}

      <div className="mt-auto flex flex-wrap gap-2 pt-4">
        {lead.maps_url && (
          <Button asChild variant="soft" size="sm" className="flex-1">
            <a href={lead.maps_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink /> Abrir no Google Maps
            </a>
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => (stale ? doRefresh() : onRecheck([lead.id]))}
          disabled={checking || refreshing}
          title={stale ? "Atualizar dados e reverificar" : "Reverificar site"}
        >
          {checking || refreshing ? <Loader2 className="animate-spin" /> : <RefreshCw />}
          {stale ? "Atualizar" : "Reverificar"}
        </Button>
      </div>
    </article>
  );
}
