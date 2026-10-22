import { createBrowserSupabase } from "@/lib/supabase/client";

/** Máximo de buscas no radar por pessoa (o banco também barra). */
export const RADAR_LIMIT = 3;

export type Watch = {
  id: string;
  query: string;
  createdAt: string;
  checkedAt: string | null;
  found: { title: string; url: string | null; at: string } | null;
  seen: boolean;
};

export async function listWatches(): Promise<Watch[]> {
  const { data, error } = await createBrowserSupabase()
    .from("edital_watches")
    .select("id, query, created_at, checked_at, found_title, found_url, found_at, seen_at")
    .order("created_at");
  if (error) throw error;
  return (data ?? []).map((w) => ({
    id: w.id,
    query: w.query,
    createdAt: w.created_at,
    checkedAt: w.checked_at,
    found: w.found_at ? { title: w.found_title ?? w.query, url: w.found_url, at: w.found_at } : null,
    seen: Boolean(w.seen_at),
  }));
}

export async function addWatch(query: string): Promise<void> {
  const { error } = await createBrowserSupabase().from("edital_watches").insert({ query: query.trim() });
  if (error) throw error;
}

export async function removeWatch(id: string): Promise<void> {
  const { error } = await createBrowserSupabase().from("edital_watches").delete().eq("id", id);
  if (error) throw error;
}

/** Tira o aviso de edital publicado da página inicial. */
export async function dismissWatch(id: string): Promise<void> {
  const { error } = await createBrowserSupabase()
    .from("edital_watches")
    .update({ seen_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
