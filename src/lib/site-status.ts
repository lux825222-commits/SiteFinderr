// Pure website classification rules (shared by server checker and tests).

export type SiteStatus = "funcionando" | "fora_do_ar" | "sem_site" | "verificar" | "pendente";

export type AttemptResult =
  | { kind: "response"; status: number; finalUrl: string }
  | { kind: "error"; error: "dns" | "refused" | "tls" | "timeout" | "other"; message?: string };

export interface HtmlAnalysis {
  notes: string[];
  parked: boolean;
  placeholder: boolean;
}

export interface Classification {
  status: SiteStatus;
  httpStatus: number | null;
  notes: string[];
}

/** Attempts required before a site can be declared "fora do ar". */
export const MIN_ATTEMPTS_FOR_DOWN = 3;

/** HTTP codes treated as a real access failure (when repeated on every attempt). */
export const HARD_HTTP_STATUS = new Set([
  404, 410, 500, 502, 503, 504, 520, 521, 522, 523, 524, 525, 526, 530,
]);

const NON_SITE_HOSTS: Array<[RegExp, string]> = [
  [/(^|\.)wa\.me$|(^|\.)whatsapp\.com$|(^|\.)api\.whatsapp\.com$/, "WhatsApp"],
  [/(^|\.)instagram\.com$/, "Instagram"],
  [/(^|\.)facebook\.com$|(^|\.)fb\.com$|(^|\.)m\.facebook\.com$/, "Facebook"],
  [/(^|\.)linktr\.ee$|(^|\.)linkr\.bio$|(^|\.)beacons\.ai$/, "página de links"],
  [/(^|\.)tiktok\.com$/, "TikTok"],
  [/(^|\.)ifood\.com\.br$/, "iFood"],
  [/(^|\.)trinks\.com$|(^|\.)booksy\.com$|(^|\.)agendakit\.com\.br$/, "plataforma de agendamento"],
  [/(^|\.)business\.site$|(^|\.)negocio\.site$/, "site gratuito do Google"],
  [/(^|\.)wixsite\.com$|(^|\.)webnode\.page$|(^|\.)blogspot\.com$/, "subdomínio gratuito"],
];

export function normalizeWebsite(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withProto);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Blocks loopback / private / link-local targets so the checker can't probe internal hosts. */
export function isSafePublicUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  if (url.username || url.password) return false;
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host.includes(".") && !host.includes(":")) return false;
  if (host === "localhost" || host.endsWith(".localhost")) return false;
  if (/\.(local|internal|lan|home|corp)$/.test(host)) return false;
  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if (a === 10 || a === 127 || a === 0) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
    if (a >= 224) return false;
  }
  if (host.includes(":")) {
    if (host === "::1" || host === "::" || /^f[cd]/.test(host) || /^fe80/.test(host)) return false;
    if (host.startsWith("::ffff:")) return false;
  }
  return true;
}

/** Returns a label when the "website" is really a social profile / chat / booking link. */
export function detectNonSiteLink(raw: string): string | null {
  try {
    const host = new URL(raw).hostname.toLowerCase();
    for (const [re, label] of NON_SITE_HOSTS) if (re.test(host)) return label;
  } catch {
    return null;
  }
  return null;
}

export function analyzeHtml(html: string, finalUrl: string, currentYear: number): HtmlAnalysis {
  const notes: string[] = [];
  const lower = html.toLowerCase();

  const parked =
    /(domain|domínio|dominio)[^<]{0,40}(is for sale|está à venda|esta a venda|pode estar à venda|for sale)/i.test(
      html,
    ) ||
    /(sedoparking|parkingcrew|bodis\.com|hugedomains|dan\.com\/buy|afternic|godaddy\.com\/domainsearch|parklogic)/i.test(
      html,
    );
  if (parked) notes.push("Domínio estacionado ou à venda");

  const placeholder =
    !parked &&
    (/<title>\s*(index of \/|apache2? (ubuntu |debian )?default page|welcome to nginx|it works!|site em construção|em construção|under construction|coming soon|default web site page)/i.test(
      html,
    ) ||
      /account suspended|conta suspensa|this account has been suspended|site suspenso/i.test(lower));
  if (placeholder) notes.push("Página padrão, suspensa ou em construção");

  if (!parked && !placeholder) {
    if (!/<meta[^>]+name=["']?viewport/i.test(html)) notes.push("Sem versão para celular");
    const years = Array.from(html.matchAll(/(?:©|&copy;|copyright)\s*(?:\d{4}\s*[-–]\s*)?((?:19|20)\d{2})/gi))
      .map((m) => Number(m[1]))
      .filter((y) => y <= currentYear);
    if (years.length) {
      const latest = Math.max(...years);
      if (latest <= currentYear - 3) notes.push(`Copyright de ${latest}`);
    }
    if (/<(embed|object)[^>]+\.swf/i.test(html)) notes.push("Usa Flash");
    if (/<frameset/i.test(html)) notes.push("Usa frames antigos");
    if (finalUrl.startsWith("http://")) notes.push("Sem HTTPS (cadeado)");
  }

  return { notes, parked, placeholder };
}

function isHardFailure(a: AttemptResult): boolean {
  if (a.kind === "response") return HARD_HTTP_STATUS.has(a.status);
  return a.error === "dns" || a.error === "refused" || a.error === "tls";
}

/**
 * Classify after one or more attempts.
 * - Any 2xx/3xx response → funcionando (unless parked → fora_do_ar, placeholder → verificar).
 * - Every attempt a hard failure AND at least MIN_ATTEMPTS_FOR_DOWN attempts → fora_do_ar.
 * - Anything else (timeouts, 401/403/429, mixed errors) → verificar.
 */
export function classifyAttempts(
  attempts: AttemptResult[],
  html?: HtmlAnalysis | null,
): Classification {
  const lastResponse = [...attempts].reverse().find((a) => a.kind === "response");
  const httpStatus = lastResponse && lastResponse.kind === "response" ? lastResponse.status : null;
  const success = attempts.find((a) => a.kind === "response" && a.status >= 200 && a.status < 400);

  if (success && success.kind === "response") {
    const notes = html?.notes ?? [];
    if (html?.parked) return { status: "fora_do_ar", httpStatus: success.status, notes };
    if (html?.placeholder) return { status: "verificar", httpStatus: success.status, notes };
    return { status: "funcionando", httpStatus: success.status, notes };
  }

  const notes: string[] = [];
  const last = attempts[attempts.length - 1];
  if (last) notes.push(describeAttempt(last));

  if (attempts.length >= MIN_ATTEMPTS_FOR_DOWN && attempts.every(isHardFailure)) {
    return { status: "fora_do_ar", httpStatus, notes };
  }
  return { status: "verificar", httpStatus, notes };
}

export function describeAttempt(a: AttemptResult): string {
  if (a.kind === "response") {
    if (a.status === 401 || a.status === 403) return `Acesso bloqueado (HTTP ${a.status})`;
    if (a.status === 429) return "Muitas requisições (HTTP 429)";
    if (a.status === 404) return "Página inicial não encontrada (HTTP 404)";
    if (a.status >= 500) return `Erro no servidor (HTTP ${a.status})`;
    return `Resposta HTTP ${a.status}`;
  }
  switch (a.error) {
    case "dns":
      return "Domínio não encontrado (DNS)";
    case "refused":
      return "Servidor recusou a conexão";
    case "tls":
      return "Erro de certificado SSL";
    case "timeout":
      return "Tempo de resposta esgotado";
    default:
      return "Falha de conexão";
  }
}

export function mapFetchError(err: unknown): AttemptResult {
  const e = err as { name?: string; message?: string; cause?: { code?: string; message?: string } };
  const name = e?.name ?? "";
  const code = e?.cause?.code ?? "";
  const msg = `${e?.message ?? ""} ${e?.cause?.message ?? ""}`.toLowerCase();
  if (name === "TimeoutError" || name === "AbortError" || /timeout|timed out/.test(msg) || code === "UND_ERR_CONNECT_TIMEOUT")
    return { kind: "error", error: "timeout", message: msg };
  if (code === "ENOTFOUND" || /enotfound|getaddrinfo|dns|could not resolve|name not resolved/.test(msg))
    return { kind: "error", error: "dns", message: msg };
  if (code === "ECONNREFUSED" || /econnrefused|connection refused/.test(msg))
    return { kind: "error", error: "refused", message: msg };
  if (/cert|ssl|tls|handshake/.test(msg) || code.startsWith("ERR_TLS") || code.includes("CERT"))
    return { kind: "error", error: "tls", message: msg };
  return { kind: "error", error: "other", message: msg };
}
