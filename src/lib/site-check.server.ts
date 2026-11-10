import {
  analyzeHtml,
  classifyAttempts,
  detectNonSiteLink,
  isSafePublicUrl,
  mapFetchError,
  MIN_ATTEMPTS_FOR_DOWN,
  normalizeWebsite,
  type AttemptResult,
  type HtmlAnalysis,
  type SiteStatus,
} from "./site-status";

export interface CheckOutcome {
  status: SiteStatus;
  httpStatus: number | null;
  notes: string;
  attempts: number;
}

const TIMEOUT_MS = 8000;
const RETRY_DELAYS_MS = [1500, 3000];
const MAX_HTML_BYTES = 200_000;

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 SiteFinderCheck/1.0",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.6",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function readLimited(res: Response): Promise<string> {
  const type = res.headers.get("content-type") ?? "";
  if (!type.includes("html") || !res.body) {
    await res.body?.cancel().catch(() => {});
    return "";
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let html = "";
  let bytes = 0;
  while (bytes < MAX_HTML_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    html += decoder.decode(value, { stream: true });
  }
  await reader.cancel().catch(() => {});
  return html;
}

async function attempt(url: string): Promise<{ result: AttemptResult; html: string }> {
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: HEADERS,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const ok = res.status >= 200 && res.status < 400;
    const html = ok ? await readLimited(res).catch(() => "") : "";
    if (!ok) await res.body?.cancel().catch(() => {});
    return { result: { kind: "response", status: res.status, finalUrl: res.url || url }, html };
  } catch (err) {
    return { result: mapFetchError(err), html: "" };
  }
}

/** Checks a public website with retries; never marks "fora do ar" after a single failure. */
export async function checkWebsite(rawWebsite: string | null): Promise<CheckOutcome> {
  const url = normalizeWebsite(rawWebsite);
  if (!rawWebsite || !rawWebsite.trim()) {
    return { status: "sem_site", httpStatus: null, notes: "", attempts: 0 };
  }
  if (!url || !isSafePublicUrl(url)) {
    return { status: "verificar", httpStatus: null, notes: "Endereço de site inválido", attempts: 0 };
  }

  const nonSite = detectNonSiteLink(url);
  if (nonSite) {
    return {
      status: "verificar",
      httpStatus: null,
      notes: `Link aponta para ${nonSite} — sem site próprio`,
      attempts: 0,
    };
  }

  const attempts: AttemptResult[] = [];
  let html: HtmlAnalysis | null = null;
  for (let i = 0; i < MIN_ATTEMPTS_FOR_DOWN; i++) {
    if (i > 0) await sleep(RETRY_DELAYS_MS[i - 1] ?? 3000);
    const { result, html: body } = await attempt(url);
    attempts.push(result);
    if (result.kind === "response" && result.status >= 200 && result.status < 400) {
      html = analyzeHtml(body, result.finalUrl, new Date().getFullYear());
      break;
    }
    // Access is explicitly blocked — retrying won't change the answer.
    if (result.kind === "response" && [401, 403, 429].includes(result.status)) break;
  }

  const c = classifyAttempts(attempts, html);
  return {
    status: c.status,
    httpStatus: c.httpStatus,
    notes: c.notes.join(" · "),
    attempts: attempts.length,
  };
}
