import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildTextQuery, MAX_SEGMENTS_PER_SEARCH } from "./sitefinder";
import { isGoogleMapsConfigured, normalizePlace, placeDetails, searchText, type NormalizedPlace } from "./places.server";
import { checkWebsite } from "./site-check.server";

const optionalText = (max: number) => z.string().trim().max(max).optional().default("");

const locationSchema = z.object({
  city: optionalText(80),
  state: optionalText(2),
  neighborhood: optionalText(80),
  postalCode: z
    .string()
    .trim()
    .optional()
    .default("")
    .refine((v) => v === "" || /^\d{5}-?\d{3}$/.test(v), "CEP inválido"),
});

const startSchema = locationSchema
  .extend({
    segments: z.array(z.string().trim().min(2).max(60)).min(1).max(MAX_SEGMENTS_PER_SEARCH),
  })
  .refine((d) => d.city || d.postalCode || d.neighborhood, {
    message: "Informe ao menos cidade, bairro ou CEP.",
  });

type Ctx = { supabase: import("@supabase/supabase-js").SupabaseClient<import("@/integrations/supabase/types").Database>; userId: string };

async function upsertPlaces(ctx: Ctx, searchId: string, bySegment: Array<{ segment: string; places: NormalizedPlace[] }>) {
  const seen = new Map<string, Record<string, unknown>>();
  const now = new Date().toISOString();
  for (const { segment, places } of bySegment) {
    for (const p of places) {
      if (seen.has(p.place_id)) continue;
      seen.set(p.place_id, { ...p, user_id: ctx.userId, search_id: searchId, segment, fetched_at: now });
    }
  }
  const rows = Array.from(seen.values());
  if (!rows.length) return [];
  const { data, error } = await ctx.supabase
    .from("leads")
    .upsert(rows as never, { onConflict: "user_id,place_id" })
    .select("*");
  if (error) {
    console.error("upsert leads failed", error);
    throw new Error("Não foi possível salvar os resultados.");
  }
  return data ?? [];
}

async function refreshCount(ctx: Ctx, searchId: string) {
  const { count } = await ctx.supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("search_id", searchId);
  await ctx.supabase.from("searches").update({ results_count: count ?? 0 }).eq("id", searchId);
}

export const getIntegrationStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => ({ googleMaps: isGoogleMapsConfigured() }));

export const startSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => startSchema.parse(input))
  .handler(async ({ data, context }) => {
    const segments = Array.from(new Set(data.segments));
    const { data: search, error } = await context.supabase
      .from("searches")
      .insert({
        user_id: context.userId,
        segments,
        city: data.city || null,
        state: data.state || null,
        neighborhood: data.neighborhood || null,
        postal_code: data.postalCode || null,
      })
      .select("id")
      .single();
    if (error || !search) {
      console.error(error);
      throw new Error("Não foi possível registrar a pesquisa.");
    }

    const results = await Promise.all(
      segments.map(async (segment) => {
        const r = await searchText(buildTextQuery(segment, data));
        return {
          segment,
          places: r.places.filter((p) => p.businessStatus !== "CLOSED_PERMANENTLY").map(normalizePlace),
          token: r.nextPageToken,
        };
      }),
    );

    const leads = await upsertPlaces(context, search.id, results);
    await refreshCount(context, search.id);
    const tokens: Record<string, string> = {};
    for (const r of results) if (r.token) tokens[r.segment] = r.token;
    return { searchId: search.id, leads, tokens };
  });

export const loadMoreResults = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        searchId: z.string().uuid(),
        tokens: z.record(z.string().max(60), z.string().min(10).max(2000)),
      })
      .refine((d) => Object.keys(d.tokens).length <= MAX_SEGMENTS_PER_SEARCH)
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: search } = await context.supabase.from("searches").select("*").eq("id", data.searchId).single();
    if (!search) throw new Error("Pesquisa não encontrada.");
    const loc = {
      city: search.city ?? "",
      state: search.state ?? "",
      neighborhood: search.neighborhood ?? "",
      postalCode: search.postal_code ?? "",
    };
    const entries = Object.entries(data.tokens).filter(([segment]) => search.segments.includes(segment));
    const results = await Promise.all(
      entries.map(async ([segment, token]) => {
        const r = await searchText(buildTextQuery(segment, loc), token);
        return {
          segment,
          places: r.places.filter((p) => p.businessStatus !== "CLOSED_PERMANENTLY").map(normalizePlace),
          token: r.nextPageToken,
        };
      }),
    );
    const leads = await upsertPlaces(context, search.id, results);
    await refreshCount(context, search.id);
    const tokens: Record<string, string> = {};
    for (const r of results) if (r.token) tokens[r.segment] = r.token;
    return { leads, tokens };
  });

export const checkSites = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ leadIds: z.array(z.string().uuid()).min(1).max(3) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: leads, error } = await context.supabase
      .from("leads")
      .select("id, website, check_attempts")
      .in("id", data.leadIds);
    if (error) throw new Error("Não foi possível carregar os leads.");

    const updated = await Promise.all(
      (leads ?? []).map(async (lead) => {
        const outcome = await checkWebsite(lead.website);
        const { data: row } = await context.supabase
          .from("leads")
          .update({
            site_status: outcome.status,
            http_status: outcome.httpStatus,
            site_notes: outcome.notes || null,
            check_attempts: (lead.check_attempts ?? 0) + outcome.attempts,
            last_checked_at: new Date().toISOString(),
          })
          .eq("id", lead.id)
          .select("*")
          .single();
        return row;
      }),
    );
    return { leads: updated.filter((r): r is NonNullable<typeof r> => Boolean(r)) };
  });

export const refreshLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ leadId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: lead } = await context.supabase
      .from("leads")
      .select("id, place_id, check_attempts")
      .eq("id", data.leadId)
      .single();
    if (!lead) throw new Error("Lead não encontrado.");
    const place = normalizePlace(await placeDetails(lead.place_id));
    const outcome = await checkWebsite(place.website);
    const now = new Date().toISOString();
    const { data: row, error } = await context.supabase
      .from("leads")
      .update({
        name: place.name,
        category: place.category,
        address: place.address,
        city: place.city,
        state: place.state,
        phone: place.phone,
        maps_url: place.maps_url,
        website: place.website,
        fetched_at: now,
        site_status: outcome.status,
        http_status: outcome.httpStatus,
        site_notes: outcome.notes || null,
        check_attempts: (lead.check_attempts ?? 0) + outcome.attempts,
        last_checked_at: now,
      })
      .eq("id", lead.id)
      .select("*")
      .single();
    if (error || !row) throw new Error("Não foi possível atualizar o lead.");
    return { lead: row };
  });
