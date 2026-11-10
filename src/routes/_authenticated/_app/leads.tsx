import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { LeadsBrowser } from "@/components/leads/LeadsBrowser";
import { useSiteChecker } from "@/hooks/use-site-checker";
import { fetchLeads, type Lead } from "@/lib/leads-client";

export const Route = createFileRoute("/_authenticated/_app/leads")({
  validateSearch: (s: Record<string, unknown>): { busca?: string } => ({
    busca: typeof s.busca === "string" && /^[0-9a-f-]{36}$/i.test(s.busca) ? s.busca : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Leads encontrados — SiteFinder" },
      { name: "description", content: "Todas as empresas encontradas nas suas pesquisas, com a situação do site." },
      { property: "og:title", content: "Leads encontrados — SiteFinder" },
      { property: "og:description", content: "Filtre, ordene e exporte seus leads em CSV ou Excel." },
    ],
  }),
  component: LeadsPage,
});

function LeadsPage() {
  const { busca } = Route.useSearch();
  const queryClient = useQueryClient();
  const key = ["leads", "all", busca ?? null];
  const leads = useQuery({ queryKey: key, queryFn: () => fetchLeads({ searchId: busca }) });

  const onUpdate = useCallback(
    (lead: Lead) => queryClient.setQueryData<Lead[]>(key, (prev) => prev?.map((l) => (l.id === lead.id ? lead : l))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient, busca],
  );
  const checker = useSiteChecker(onUpdate);

  return (
    <div>
      <PageHeader
        title="Leads encontrados"
        description="Todas as empresas das suas pesquisas. Dados do Google com mais de 30 dias são removidos automaticamente, exceto favoritos."
        actions={
          busca && (
            <Button asChild variant="outline" size="sm">
              <Link to="/leads" search={{ busca: undefined }}>
                <X /> Mostrar todas as pesquisas
              </Link>
            </Button>
          )
        }
      />
      {leads.isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando leads…
        </div>
      ) : leads.isError ? (
        <div className="surface p-6 text-sm text-destructive">Não foi possível carregar os leads.</div>
      ) : (
        <LeadsBrowser
          leads={leads.data ?? []}
          checkingIds={checker.checkingIds}
          onUpdate={onUpdate}
          onRecheck={(ids) => void checker.run(ids)}
          exportName="sitefinder-leads"
          empty={
            <div className="surface flex flex-col items-center p-10 text-center">
              <Search className="h-10 w-10 text-primary-glow" />
              <h2 className="mt-3 text-lg font-semibold">Nenhum lead ainda</h2>
              <p className="mt-1 text-sm text-muted-foreground">Faça uma pesquisa para encontrar empresas.</p>
              <Button asChild variant="hero" className="mt-4">
                <Link to="/buscar">Encontrar empresas</Link>
              </Button>
            </div>
          }
        />
      )}
    </div>
  );
}
