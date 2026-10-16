import type { SupabaseClient } from "@supabase/supabase-js";

export type Visibility = "privado" | "amigos" | "publico";
export const VISIBILITIES: Visibility[] = ["publico", "amigos", "privado"];

export type CommentAuthor = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export type CommentView = {
  id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  visibility: Visibility;
  spoiler: boolean;
  created_at: string;
  edited_at: string | null;
  author: CommentAuthor | null;
  replies: CommentView[];
};

export type CommentPage = { items: CommentView[]; hasMore: boolean };

const COLS = "id, user_id, parent_id, body, visibility, spoiler, created_at, edited_at";

// Mensajes principales de un título (los más recientes primero) con sus respuestas (las más antiguas primero).
// La base de datos ya filtra lo que cada persona puede ver (privado / amigos / público).
export async function fetchComments(
  sb: SupabaseClient,
  tmdbId: number,
  mediaType: "movie" | "tv",
  offset = 0,
  limit = 20
): Promise<CommentPage> {
  const { data: roots, error } = await sb
    .from("comments")
    .select(COLS)
    .eq("tmdb_id", tmdbId)
    .eq("media_type", mediaType)
    .is("parent_id", null)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error || !roots) throw new Error("comments");

  const rootIds = roots.map((r) => r.id as string);
  const { data: replies } =
    rootIds.length > 0
      ? await sb
          .from("comments")
          .select(COLS)
          .in("parent_id", rootIds)
          .order("created_at", { ascending: true })
      : { data: [] as typeof roots };

  const all = [...roots, ...(replies ?? [])];
  const authorIds = [...new Set(all.map((c) => c.user_id as string))];
  const { data: people } =
    authorIds.length > 0
      ? await sb.from("profiles").select("id, username, display_name, avatar_url").in("id", authorIds)
      : { data: [] as CommentAuthor[] };
  const byId = new Map((people ?? []).map((p) => [p.id as string, p as CommentAuthor]));

  const view = (c: (typeof all)[number]): CommentView => ({
    id: c.id,
    user_id: c.user_id,
    parent_id: c.parent_id,
    body: c.body,
    visibility: c.visibility as Visibility,
    spoiler: !!c.spoiler,
    created_at: c.created_at,
    edited_at: c.edited_at,
    author: byId.get(c.user_id) ?? null,
    replies: [],
  });

  const items = roots.map(view);
  const index = new Map(items.map((i) => [i.id, i]));
  for (const r of replies ?? []) index.get(r.parent_id as string)?.replies.push(view(r));

  return { items, hasMore: roots.length === limit };
}
