import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useState } from "react";
import { Loader2, RefreshCw, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { LeadsBrowser } from "@/components/leads/LeadsBrowser";
import { useSiteChecker } from "@/hooks/use-site-checker";
import { fetchLeads, type Lead } from "@/lib/leads-client";
import { refreshLead } from "@/lib/leads.functions";
import { isStale } from "@/lib/sitefinder";

export const Route = createFileRoute("/_authenticated/_app/favoritos")({
  head: () => ({
    meta: [
      { title: "Favoritos — SiteFinder" },
      { name: "description", content: "Leads salvos para prospecção." },
      { property: "og:title", content: "Favoritos — SiteFinder" },
      { property: "og:description", content: "Seus leads salvos no SiteFinder." },
    ],
  }),
  component: FavoritosPage,
});

const KEY = ["leads", "favorites"];

function FavoritosPage() {
  const queryClient = useQueryClient();
  const refresh = useServerFn(refreshLead);
  const [refreshing, setRefreshing] = useState(false);
  const leads = useQuery({ queryKey: KEY, queryFn: () => fetchLeads({ favorites: true }) });

  const onUpdate = useCallback(
    (lead: Lead) =>
      queryClient.setQueryData<Lead[]>(KEY, (prev) =>
        lead.is_favorite ? prev?.map((l) => (l.id === lead.id ? lead : l)) : prev?.filter((l) => l.id !== lead.id),
      ),
    [queryClient],
  );
  const checker = useSiteChecker(onUpdate);
  const stale = (leads.data ?? []).filter((l) => isStale(l.fetched_at));

  async function refreshStale() {
    setRefreshing(true);
    let ok = 0;
    for (const l of stale.slice(0, 30)) {
      try {
        const res = await refresh({ data: { leadId: l.id } });
        onUpdate(res.lead);
        ok++;
      } catch (e) {
        console.error(e);
      }
    }
    setRefreshing(false);
    toast.success(`${ok} favorito(s) atualizados com o Google Maps`);
  }

  return (
    <div>
      <PageHeader
        title="Favoritos"
        description="Leads salvos para entrar em contato. Clique na estrela de um cartão para salvar ou remover."
        actions={
          stale.length > 0 && (
            <Button variant="soft" onClick={refreshStale} disabled={refreshing}>
              {refreshing ? <Loader2 className="animate-spin" /> : <RefreshCw />} Atualizar {stale.length} desatualizado(s)
            </Button>
          )
        }
      />
      {leads.isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </div>
      ) : (
        <LeadsBrowser
          leads={leads.data ?? []}
          checkingIds={checker.checkingIds}
          onUpdate={onUpdate}
          onRecheck={(ids) => void checker.run(ids)}
          exportName="sitefinder-favoritos"
          empty={
            <div className="surface flex flex-col items-center p-10 text-center">
              <Star className="h-10 w-10 text-status-none" />
              <h2 className="mt-3 text-lg font-semibold">Nenhum favorito ainda</h2>
              <p className="mt-1 text-sm text-muted-foreground">Salve leads clicando na estrela dos cartões.</p>
              <Button asChild variant="hero" className="mt-4">
                <Link to="/leads" search={{ busca: undefined }}>
                  Ver leads encontrados
                </Link>
              </Button>
            </div>
          }
        />
      )}
    </div>
  );
}
