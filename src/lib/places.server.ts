// Google Maps Platform — Places API (New) via the Lovable connector gateway. Server-only.

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

export const SEARCH_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.nationalPhoneNumber",
  "places.websiteUri",
  "places.googleMapsUri",
  "places.primaryTypeDisplayName",
  "places.addressComponents",
  "places.businessStatus",
  "nextPageToken",
].join(",");

const DETAILS_FIELD_MASK = SEARCH_FIELD_MASK.split(",")
  .filter((f) => f !== "nextPageToken")
  .map((f) => f.replace(/^places\./, ""))
  .join(",");

interface AddressComponent {
  longText?: string;
  shortText?: string;
  types?: string[];
}

export interface GooglePlace {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  primaryTypeDisplayName?: { text?: string };
  addressComponents?: AddressComponent[];
  businessStatus?: string;
}

export interface NormalizedPlace {
  place_id: string;
  name: string;
  category: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  maps_url: string | null;
  website: string | null;
}

export function isGoogleMapsConfigured(): boolean {
  return Boolean(process.env["LOVABLE_API_KEY"] && process.env["GOOGLE_MAPS_API_KEY"]);
}

function credentials() {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const mapsKey = process.env["GOOGLE_MAPS_API_KEY"];
  if (!lovableKey || !mapsKey) {
    throw new Error("A integração com o Google Maps não está configurada. Veja Configurações.");
  }
  return { lovableKey, mapsKey };
}

async function handleError(res: Response): Promise<never> {
  const body = await res.text();
  console.error(`Google Maps request failed [${res.status}]: ${body}`);
  if (res.status === 403) {
    let reason: string | undefined;
    try {
      reason = (JSON.parse(body)?.error?.details ?? []).find((d: { reason?: string }) => d.reason)?.reason;
    } catch {
      /* ignore */
    }
    if (reason === "API_KEY_HTTP_REFERRER_BLOCKED")
      throw new Error("A chave do Google Maps está restrita por domínio. Ajuste as restrições da chave de servidor no Google Cloud.");
    if (reason === "API_KEY_SERVICE_BLOCKED")
      throw new Error("A chave do Google Maps não permite a Places API (New). Habilite-a no Google Cloud.");
    throw new Error("O Google Maps recusou a solicitação (403). Verifique a chave em Configurações.");
  }
  if (res.status === 429) throw new Error("Limite de uso do Google Maps atingido. Tente novamente mais tarde.");
  if (res.status === 400) throw new Error("A busca não pôde ser processada pelo Google Maps. Revise os filtros.");
  throw new Error(`Falha ao consultar o Google Maps (HTTP ${res.status}).`);
}

export async function searchText(textQuery: string, pageToken?: string) {
  const { lovableKey, mapsKey } = credentials();
  const res = await fetch(`${GATEWAY_URL}/places/v1/places:searchText`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": mapsKey,
      "Content-Type": "application/json",
      "X-Goog-FieldMask": SEARCH_FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery,
      pageSize: 20,
      languageCode: "pt-BR",
      regionCode: "BR",
      ...(pageToken ? { pageToken } : {}),
    }),
  });
  if (!res.ok) await handleError(res);
  const data = (await res.json()) as { places?: GooglePlace[]; nextPageToken?: string };
  return { places: data.places ?? [], nextPageToken: data.nextPageToken ?? null };
}

export async function placeDetails(placeId: string): Promise<GooglePlace> {
  const { lovableKey, mapsKey } = credentials();
  const res = await fetch(`${GATEWAY_URL}/places/v1/places/${encodeURIComponent(placeId)}?languageCode=pt-BR&regionCode=BR`, {
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": mapsKey,
      "X-Goog-FieldMask": DETAILS_FIELD_MASK,
    },
  });
  if (!res.ok) await handleError(res);
  return (await res.json()) as GooglePlace;
}

export function normalizePlace(p: GooglePlace): NormalizedPlace {
  const comp = (type: string) => p.addressComponents?.find((c) => c.types?.includes(type));
  return {
    place_id: p.id,
    name: p.displayName?.text?.trim() || "Sem nome",
    category: p.primaryTypeDisplayName?.text ?? null,
    address: p.formattedAddress ?? null,
    city: comp("administrative_area_level_2")?.longText ?? comp("locality")?.longText ?? null,
    state: comp("administrative_area_level_1")?.shortText ?? null,
    phone: p.nationalPhoneNumber ?? null,
    maps_url: p.googleMapsUri ?? null,
    website: p.websiteUri ?? null,
  };
}
