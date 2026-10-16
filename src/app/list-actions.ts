"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { VISIBILITIES, type Visibility } from "@/lib/comments";

export type ListError = "auth" | "empty" | "too_many_lists" | "list_full" | "db";

async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

const isUuid = (s: unknown): s is string => typeof s === "string" && /^[0-9a-f-]{36}$/i.test(s);
const isType = (s: unknown): s is "movie" | "tv" => s === "movie" || s === "tv";

function mapError(message: string | undefined): ListError {
  if (message?.includes("too_many_lists")) return "too_many_lists";
  if (message?.includes("list_full")) return "list_full";
  return "db";
}

type ListInput = { name: string; description?: string; visibility: Visibility };

function clean(input: ListInput) {
  const name = String(input.name ?? "").trim().slice(0, 60);
  const description = String(input.description ?? "").trim().slice(0, 200);
  const visibility = VISIBILITIES.includes(input.visibility) ? input.visibility : "publico";
  return { name, description: description || null, visibility };
}

export async function createList(
  input: ListInput
): Promise<{ ok: true; id: string } | { ok: false; error: ListError }> {
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "auth" };
  const v = clean(input);
  if (!v.name) return { ok: false, error: "empty" };
  const { data, error } = await supabase
    .from("lists")
    .insert({ user_id: user.id, ...v })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: mapError(error?.message) };
  revalidatePath("/", "layout");
  return { ok: true, id: data.id as string };
}

export async function updateList(
  id: string,
  input: ListInput
): Promise<{ ok: boolean; error?: ListError }> {
  const { supabase, user } = await getUser();
  if (!user || !isUuid(id)) return { ok: false, error: "auth" };
  const v = clean(input);
  if (!v.name) return { ok: false, error: "empty" };
  const { error } = await supabase.from("lists").update(v).eq("id", id).eq("user_id", user.id);
  if (error) return { ok: false, error: "db" };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteList(id: string): Promise<{ ok: boolean }> {
  const { supabase, user } = await getUser();
  if (!user || !isUuid(id)) return { ok: false };
  const { error } = await supabase.from("lists").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { ok: false };
  revalidatePath("/", "layout");
  return { ok: true };
}

// Mis listas, indicando en cuáles está ya este título
export async function listsForTitle(
  tmdbId: number,
  mediaType: string
): Promise<{ id: string; name: string; has: boolean }[]> {
  const { supabase, user } = await getUser();
  if (!user || !isType(mediaType)) return [];
  const [{ data: lists }, { data: items }] = await Promise.all([
    supabase.from("lists").select("id, name").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("list_items").select("list_id").eq("tmdb_id", tmdbId).eq("media_type", mediaType),
  ]);
  const has = new Set((items ?? []).map((i) => i.list_id as string));
  return (lists ?? []).map((l) => ({ id: l.id as string, name: l.name as string, has: has.has(l.id as string) }));
}

export async function setInList(
  listId: string,
  meta: { tmdb_id: number; media_type: string; title: string; poster_path: string | null },
  add: boolean
): Promise<{ ok: boolean; error?: ListError }> {
  const { supabase, user } = await getUser();
  if (!user || !isUuid(listId) || !isType(meta.media_type) || !Number.isInteger(meta.tmdb_id)) {
    return { ok: false, error: "auth" };
  }
  if (!add) {
    const { error } = await supabase
      .from("list_items")
      .delete()
      .eq("list_id", listId)
      .eq("tmdb_id", meta.tmdb_id)
      .eq("media_type", meta.media_type);
    if (error) return { ok: false, error: "db" };
    revalidatePath("/", "layout");
    return { ok: true };
  }
  const { data: last } = await supabase
    .from("list_items")
    .select("position")
    .eq("list_id", listId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase.from("list_items").upsert(
    {
      list_id: listId,
      tmdb_id: meta.tmdb_id,
      media_type: meta.media_type,
      title: String(meta.title).slice(0, 300),
      poster_path: meta.poster_path,
      position: (last?.position ?? -1) + 1,
    },
    { onConflict: "list_id,tmdb_id,media_type", ignoreDuplicates: true }
  );
  if (error) return { ok: false, error: mapError(error.message) };
  revalidatePath("/", "layout");
  return { ok: true };
}

// Sube o baja un título dentro de la lista
export async function moveItem(
  listId: string,
  tmdbId: number,
  mediaType: string,
  dir: "up" | "down"
): Promise<{ ok: boolean }> {
  const { supabase, user } = await getUser();
  if (!user || !isUuid(listId) || !isType(mediaType)) return { ok: false };
  const { data } = await supabase
    .from("list_items")
    .select("tmdb_id, media_type, position")
    .eq("list_id", listId)
    .order("position", { ascending: true })
    .order("added_at", { ascending: true });
  const rows = data ?? [];
  const i = rows.findIndex((r) => r.tmdb_id === tmdbId && r.media_type === mediaType);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= rows.length) return { ok: true };
  [rows[i], rows[j]] = [rows[j], rows[i]];
  for (let k = 0; k < rows.length; k++) {
    if (rows[k].position === k) continue;
    const { error } = await supabase
      .from("list_items")
      .update({ position: k })
      .eq("list_id", listId)
      .eq("tmdb_id", rows[k].tmdb_id)
      .eq("media_type", rows[k].media_type);
    if (error) return { ok: false };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
