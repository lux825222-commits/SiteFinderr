import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { History, Loader2, Repeat, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/sitefinder";

export const Route = createFileRoute("/_authenticated/_app/historico")({
  head: () => ({
    meta: [
      { title: "Histórico de pesquisas — SiteFinder" },
      { name: "description", content: "Suas pesquisas anteriores de empresas." },
      { property: "og:title", content: "Histórico de pesquisas — SiteFinder" },
      { property: "og:description", content: "Repita pesquisas e veja os leads de cada uma." },
    ],
  }),
  component: HistoricoPage,
});

function HistoricoPage() {
  const queryClient = useQueryClient();
  const searches = useQuery({
    queryKey: ["searches"],
    queryFn: async () => {
      const { data, error } = await supabase.from("searches").select("*").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data;
    },
  });

  async function remove(id: string) {
    const { error } = await supabase.from("searches").delete().eq("id", id);
    if (error) { toast.error("Não foi possível excluir."); return; }
    queryClient.invalidateQueries({ queryKey: ["searches"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    toast.success("Pesquisa removida do histórico");
  }

  return (
    <div>
      <PageHeader title="Histórico de pesquisas" description="Repita uma pesquisa ou veja os leads encontrados em cada uma." />
      {searches.isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </div>
      ) : !searches.data?.length ? (
        <div className="surface flex flex-col items-center p-10 text-center">
          <History className="h-10 w-10 text-primary-glow" />
          <h2 className="mt-3 text-lg font-semibold">Nenhuma pesquisa ainda</h2>
          <Button asChild variant="hero" className="mt-4">
            <Link to="/buscar">Fazer a primeira pesquisa</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {searches.data.map((s) => (
            <div key={s.id} className="surface flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap gap-1.5">
                  {s.segments.map((seg) => (
                    <span key={seg} className="rounded-full bg-primary/20 px-2.5 py-0.5 text-xs font-medium">
                      {seg}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-sm">
                  {[s.neighborhood, s.city, s.state, s.postal_code].filter(Boolean).join(" · ") || "Sem localização"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(s.created_at)} · {s.results_count} empresa(s)
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link to="/leads" search={{ busca: s.id }}>
                    <Users /> Ver leads
                  </Link>
                </Button>
                <Button asChild variant="soft" size="sm">
                  <Link
                    to="/buscar"
                    search={{
                      segmentos: s.segments.join("|"),
                      cidade: s.city ?? undefined,
                      uf: s.state ?? undefined,
                      bairro: s.neighborhood ?? undefined,
                      cep: s.postal_code ?? undefined,
                    }}
                  >
                    <Repeat /> Repetir
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => remove(s.id)} aria-label="Excluir do histórico">
                  <Trash2 />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
