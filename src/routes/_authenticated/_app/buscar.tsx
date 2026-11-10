import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState, type FormEvent } from "react";
import { Loader2, Plus, Search, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/PageHeader";
import { IntegrationSetup } from "@/components/IntegrationSetup";
import { LeadsBrowser } from "@/components/leads/LeadsBrowser";
import { useSiteChecker } from "@/hooks/use-site-checker";
import { getIntegrationStatus, loadMoreResults, startSearch } from "@/lib/leads.functions";
import { needsCheck, type Lead } from "@/lib/leads-client";
import { MAX_SEGMENTS_PER_SEARCH, SEGMENTS, UFS } from "@/lib/sitefinder";
import { cn } from "@/lib/utils";

interface BuscarSearch {
  segmentos?: string | undefined;
  cidade?: string | undefined;
  uf?: string | undefined;
  bairro?: string | undefined;
  cep?: string | undefined;
}

const str = (v: unknown) => (typeof v === "string" && v.length < 300 ? v : undefined);

export const Route = createFileRoute("/_authenticated/_app/buscar")({
  validateSearch: (s: Record<string, unknown>): BuscarSearch => ({
    segmentos: str(s['segmentos']),
    cidade: str(s['cidade']),
    uf: str(s['uf']),
    bairro: str(s['bairro']),
    cep: str(s['cep']),
  }),
  head: () => ({
    meta: [
      { title: "Encontrar empresas — SiteFinder" },
      { name: "description", content: "Pesquise empresas por cidade, bairro, CEP e segmento no Google Maps." },
      { property: "og:title", content: "Encontrar empresas — SiteFinder" },
      { property: "og:description", content: "Busca de empresas no Google Maps com verificação de site." },
    ],
  }),
  component: BuscarPage,
});

function BuscarPage() {
  const initial = Route.useSearch();
  const queryClient = useQueryClient();
  const integration = useServerFn(getIntegrationStatus);
  const start = useServerFn(startSearch);
  const more = useServerFn(loadMoreResults);
  const status = useQuery({ queryKey: ["integration-status"], queryFn: () => integration() });

  const [state, setState] = useState(initial.uf ?? "");
  const [city, setCity] = useState(initial.cidade ?? "");
  const [neighborhood, setNeighborhood] = useState(initial.bairro ?? "");
  const [postalCode, setPostalCode] = useState(initial.cep ?? "");
  const [segments, setSegments] = useState<string[]>(
    initial.segmentos ? initial.segmentos.split("|").filter(Boolean).slice(0, MAX_SEGMENTS_PER_SEARCH) : [],
  );
  const [custom, setCustom] = useState("");
  const [searching, setSearching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [results, setResults] = useState<Lead[]>([]);
  const [searchId, setSearchId] = useState<string | null>(null);
  const [tokens, setTokens] = useState<Record<string, string>>({});

  const upsertLocal = useCallback((lead: Lead) => {
    setResults((prev) => prev.map((l) => (l.id === lead.id ? lead : l)));
  }, []);
  const checker = useSiteChecker(upsertLocal);

  function toggleSegment(seg: string) {
    setSegments((prev) => {
      if (prev.includes(seg)) return prev.filter((s) => s !== seg);
      if (prev.length >= MAX_SEGMENTS_PER_SEARCH) {
        toast.info(`Selecione até ${MAX_SEGMENTS_PER_SEARCH} segmentos por pesquisa.`);
        return prev;
      }
      return [...prev, seg];
    });
  }

  function addCustom() {
    const v = custom.trim();
    if (v.length < 2) return;
    if (!segments.includes(v)) toggleSegment(v);
    setCustom("");
  }

  function afterResults(leads: Lead[]) {
    const ids = leads.filter((l) => needsCheck(l)).map((l) => l.id);
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["leads"] });
    queryClient.invalidateQueries({ queryKey: ["searches"] });
    void checker.run(ids).then(() => {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!segments.length) { toast.error("Selecione ao menos um segmento."); return; }
    if (!city.trim() && !postalCode.trim() && !neighborhood.trim())
      { toast.error("Informe ao menos cidade, bairro ou CEP."); return; }
    if (postalCode && !/^\d{5}-?\d{3}$/.test(postalCode.trim())) { toast.error("CEP inválido. Use 00000-000."); return; }
    setSearching(true);
    try {
      const res = await start({ data: { segments, city, state, neighborhood, postalCode } });
      setResults(res.leads);
      setSearchId(res.searchId);
      setTokens(res.tokens);
      if (!res.leads.length) toast.info("Nenhuma empresa encontrada. Tente ampliar a região ou mudar o segmento.");
      else toast.success(`${res.leads.length} empresas encontradas. Verificando os sites…`);
      afterResults(res.leads);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha na pesquisa.");
    } finally {
      setSearching(false);
    }
  }

  async function onLoadMore() {
    if (!searchId) return;
    setLoadingMore(true);
    try {
      const res = await more({ data: { searchId, tokens } });
      const known = new Set(results.map((l) => l.id));
      const fresh = res.leads.filter((l) => !known.has(l.id));
      setResults((prev) => [...prev, ...fresh]);
      setTokens(res.tokens);
      toast.success(`${fresh.length} novas empresas carregadas`);
      afterResults(fresh);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao carregar mais resultados.");
    } finally {
      setLoadingMore(false);
    }
  }

  if (status.isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
      </div>
    );
  }
  if (status.data && !status.data.googleMaps) {
    return (
      <div>
        <PageHeader title="Encontrar empresas" />
        <IntegrationSetup />
      </div>
    );
  }

  const { done, total } = checker.progress;
  const hasMore = Object.keys(tokens).length > 0;

  return (
    <div>
      <PageHeader
        title="Encontrar empresas"
        description="Busque empresas reais no Google Maps por localização e segmento. Cada site é verificado automaticamente."
      />

      <form onSubmit={onSubmit} className="surface p-5 md:p-6">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label>Estado</Label>
            <Select value={state || "any"} onValueChange={(v) => setState(v === "any" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Qualquer estado</SelectItem>
                {UFS.map((uf) => (
                  <SelectItem key={uf} value={uf}>
                    {uf}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">Cidade</Label>
            <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ex.: Campinas" maxLength={80} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bairro">Bairro</Label>
            <Input id="bairro" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} placeholder="Ex.: Centro" maxLength={80} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cep">CEP</Label>
            <Input id="cep" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="00000-000" maxLength={9} inputMode="numeric" />
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between">
            <Label>Segmentos</Label>
            <span className="text-xs text-muted-foreground">
              {segments.length}/{MAX_SEGMENTS_PER_SEARCH} selecionados
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {Array.from(new Set([...SEGMENTS, ...segments])).map((seg) => {
              const on = segments.includes(seg);
              return (
                <button
                  key={seg}
                  type="button"
                  onClick={() => toggleSegment(seg)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm transition-colors",
                    on ? "border-primary bg-primary/25 text-foreground" : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
                  )}
                >
                  {seg}
                  {on && <X className="h-3 w-3" />}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex max-w-md gap-2">
            <Input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustom();
                }
              }}
              placeholder="Outro segmento (ex.: Floriculturas)"
              maxLength={60}
            />
            <Button type="button" variant="outline" onClick={addCustom}>
              <Plus /> Adicionar
            </Button>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Cada segmento retorna até 20 empresas por página e consome cota do Google Maps.
          </p>
          <Button type="submit" variant="hero" size="lg" disabled={searching}>
            {searching ? <Loader2 className="animate-spin" /> : <Search />} Buscar empresas
          </Button>
        </div>
      </form>

      {(checker.isChecking || (total > 0 && done < total)) && (
        <div className="surface mt-5 p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary-glow" /> Verificando sites (com novas tentativas em caso de falha)…
            </span>
            <span className="text-muted-foreground">
              {done}/{total}
            </span>
          </div>
          <Progress value={total ? (done / total) * 100 : 0} />
        </div>
      )}

      <div className="mt-6">
        <LeadsBrowser
          leads={results}
          checkingIds={checker.checkingIds}
          onUpdate={upsertLocal}
          onRecheck={(ids) => void checker.run(ids)}
          exportName="sitefinder-pesquisa"
          empty={
            !searching && (
              <div className="surface p-10 text-center text-sm text-muted-foreground">
                Preencha a localização, escolha os segmentos e clique em <strong>Buscar empresas</strong>.
              </div>
            )
          }
        />
        {hasMore && results.length > 0 && (
          <div className="mt-6 flex justify-center">
            <Button variant="soft" size="lg" onClick={onLoadMore} disabled={loadingMore}>
              {loadingMore ? <Loader2 className="animate-spin" /> : <Plus />} Buscar mais resultados no Google Maps
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
