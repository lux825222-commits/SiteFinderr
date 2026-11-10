import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Lead = Tables<"leads">;
export type Search = Tables<"searches">;

const PAGE = 1000;
const MAX_ROWS = 5000;

export async function fetchLeads(opts: { favorites?: boolean; searchId?: string } = {}): Promise<Lead[]> {
  const all: Lead[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    let q = supabase.from("leads").select("*").order("created_at", { ascending: false }).range(from, from + PAGE - 1);
    if (opts.favorites) q = q.eq("is_favorite", true);
    if (opts.searchId) q = q.eq("search_id", opts.searchId);
    const { data, error } = await q;
    if (error) throw error;
    all.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return all;
}

export async function setFavorite(id: string, value: boolean): Promise<Lead> {
  const { data, error } = await supabase.from("leads").update({ is_favorite: value }).eq("id", id).select("*").single();
  if (error) throw error;
  return data;
}

/** Leads that need a (re)check: never checked, or last check older than 7 days. */
export function needsCheck(lead: Lead, now = Date.now()): boolean {
  if (lead.site_status === "pendente" || !lead.last_checked_at) return true;
  return now - new Date(lead.last_checked_at).getTime() > 7 * 24 * 60 * 60 * 1000;
}
