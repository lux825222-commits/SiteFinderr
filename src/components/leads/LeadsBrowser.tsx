import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Download, FileSpreadsheet, FileText, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LeadCard } from "./LeadCard";
import { matchesStatusFilter, STATUS_FILTERS, type StatusFilter } from "@/lib/sitefinder";
import { exportCsv, exportExcel } from "@/lib/export";
import type { Lead } from "@/lib/leads-client";
import { cn } from "@/lib/utils";

type SortKey = "nome" | "categoria" | "verificacao";
const PAGE_SIZE = 12;
const MAX_BULK_RECHECK = 60;

interface Props {
  leads: Lead[];
  checkingIds: Set<string>;
  onUpdate: (lead: Lead) => void;
  onRecheck: (ids: string[]) => void;
  exportName?: string;
  empty?: ReactNode;
}

export function LeadsBrowser({ leads, checkingIds, onUpdate, onRecheck, exportName, empty }: Props) {
  const [filter, setFilter] = useState<StatusFilter>("todas");
  const [sort, setSort] = useState<SortKey>("nome");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = { todas: 0, sem_site: 0, fora_do_ar: 0, funcionando: 0, verificar: 0 };
    for (const l of leads) for (const f of STATUS_FILTERS) if (matchesStatusFilter(l.site_status, f.value)) c[f.value]++;
    return c;
  }, [leads]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = leads.filter(
      (l) =>
        matchesStatusFilter(l.site_status, filter) &&
        (!q || [l.name, l.category, l.address, l.city].some((v) => v?.toLowerCase().includes(q))),
    );
    return list.sort((a, b) => {
      if (sort === "categoria") return (a.category ?? "").localeCompare(b.category ?? "", "pt-BR") || a.name.localeCompare(b.name, "pt-BR");
      if (sort === "verificacao")
        return new Date(b.last_checked_at ?? 0).getTime() - new Date(a.last_checked_at ?? 0).getTime();
      return a.name.localeCompare(b.name, "pt-BR");
    });
  }, [leads, filter, sort, query]);

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  useEffect(() => setPage(1), [filter, sort, query]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  const pageItems = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function doExport(kind: "csv" | "xlsx") {
    if (!visible.length) return toast.error("Nenhum lead para exportar com os filtros atuais.");
    try {
      if (kind === "csv") exportCsv(visible, exportName);
      else await exportExcel(visible, exportName);
      toast.success(`${visible.length} leads exportados`);
    } catch (e) {
      console.error(e);
      toast.error("Falha ao gerar o arquivo.");
    }
  }

  function recheckVisible() {
    const ids = visible.filter((l) => l.site_status !== "sem_site" && l.website).slice(0, MAX_BULK_RECHECK).map((l) => l.id);
    if (!ids.length) return toast.info("Nenhum site para reverificar neste filtro.");
    toast.info(`Reverificando ${ids.length} site(s)…`);
    onRecheck(ids);
  }

  if (!leads.length) return <>{empty}</>;

  return (
    <div>
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-1.5 text-sm transition-colors",
              filter === f.value
                ? "border-primary bg-primary/20 text-foreground shadow-glow"
                : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
            )}
          >
            {f.label}
            <span className="rounded-full bg-muted px-2 text-xs">{counts[f.value]}</span>
          </button>
        ))}
      </div>

      <div className="mb-5 flex flex-col gap-2 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filtrar por nome, categoria ou endereço" className="pl-9" />
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="md:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="nome">Ordenar por nome</SelectItem>
            <SelectItem value="categoria">Ordenar por categoria</SelectItem>
            <SelectItem value="verificacao">Data de verificação</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={recheckVisible}>
          <RefreshCw /> Reverificar
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="hero">
              <Download /> Exportar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => doExport("csv")}>
              <FileText className="mr-2 h-4 w-4" /> CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => doExport("xlsx")}>
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel (.xlsx)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {pageItems.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {pageItems.map((lead) => (
            <LeadCard key={lead.id} lead={lead} checking={checkingIds.has(lead.id)} onUpdate={onUpdate} onRecheck={onRecheck} />
          ))}
        </div>
      ) : (
        <div className="surface p-10 text-center text-sm text-muted-foreground">Nenhuma empresa neste filtro.</div>
      )}

      <div className="mt-6 flex flex-col items-center justify-between gap-3 text-sm text-muted-foreground sm:flex-row">
        <span>
          {visible.length} empresa(s) · página {page} de {totalPages}
        </span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft /> Anterior
          </Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Próxima <ChevronRight />
          </Button>
        </div>
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">Dados de empresas fornecidos pelo Google Maps.</p>
    </div>
  );
}
