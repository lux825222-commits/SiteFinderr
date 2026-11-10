import type { SiteStatus } from "./site-status";

export const SEGMENTS = [
  "Restaurantes",
  "Barbearias",
  "Salões de beleza",
  "Oficinas mecânicas",
  "Clínicas",
  "Dentistas",
  "Academias",
  "Lojas de roupas",
  "Imobiliárias",
  "Empresas de construção",
  "Pet shops",
  "Padarias",
  "Advogados",
  "Contabilidade",
  "Hotéis e pousadas",
  "Escolas",
];

export const MAX_SEGMENTS_PER_SEARCH = 5;

export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

export type StatusVariant = "ok" | "down" | "none" | "check" | "pending";

export const STATUS_META: Record<
  SiteStatus,
  { label: string; emoji: string; variant: StatusVariant; description: string }
> = {
  funcionando: {
    label: "Site funcionando",
    emoji: "🟢",
    variant: "ok",
    description: "O site respondeu normalmente.",
  },
  fora_do_ar: {
    label: "Site fora do ar",
    emoji: "🔴",
    variant: "down",
    description: "O endereço falhou em todas as novas tentativas de verificação.",
  },
  sem_site: {
    label: "Sem site",
    emoji: "🟡",
    variant: "none",
    description: "A empresa não possui endereço de site cadastrado.",
  },
  verificar: {
    label: "Verificar",
    emoji: "🟠",
    variant: "check",
    description: "Resposta inconclusiva — vale conferir manualmente.",
  },
  pendente: {
    label: "Verificando…",
    emoji: "⏳",
    variant: "pending",
    description: "Verificação em andamento.",
  },
};

export type StatusFilter = "todas" | "sem_site" | "fora_do_ar" | "funcionando" | "verificar";

export const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: "todas", label: "Todas" },
  { value: "sem_site", label: "Sem site" },
  { value: "fora_do_ar", label: "Fora do ar" },
  { value: "funcionando", label: "Funcionando" },
  { value: "verificar", label: "Verificar" },
];

export function matchesStatusFilter(status: string, filter: StatusFilter): boolean {
  if (filter === "todas") return true;
  if (filter === "verificar") return status === "verificar" || status === "pendente";
  return status === filter;
}

/** Google Maps Platform content may be cached for at most 30 days. */
export const CACHE_DAYS = 30;

export function isStale(fetchedAt: string | null | undefined, now = Date.now()): boolean {
  if (!fetchedAt) return true;
  return now - new Date(fetchedAt).getTime() > CACHE_DAYS * 24 * 60 * 60 * 1000;
}

export function buildTextQuery(
  segment: string,
  loc: { neighborhood?: string; city?: string; state?: string; postalCode?: string },
): string {
  const place = [loc.neighborhood, loc.city, loc.state, loc.postalCode]
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(", ");
  return `${segment.trim()} em ${place}, Brasil`;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "Nunca";
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
