"use server";

import { createClient } from "@/lib/supabase/server";
import { fetchComments, VISIBILITIES, type CommentPage, type Visibility } from "@/lib/comments";

export type CommentError =
  | "auth"
  | "no_username"
  | "blocked"
  | "empty"
  | "too_long"
  | "duplicate"
  | "rate_limit"
  | "db";

type Result = { ok: true } | { ok: false; error: CommentError };

const isUuid = (s: unknown): s is string =>
  typeof s === "string" && /^[0-9a-f-]{36}$/i.test(s);

function mapError(error: { code?: string; message?: string }): CommentError {
  const m = error.message ?? "";
  if (m.includes("rate_limit")) return "rate_limit";
  if (m.includes("duplicate") || error.code === "23505") return "duplicate";
  if (error.code === "42501") return "blocked"; // la política de seguridad lo ha rechazado
  return "db";
}

async function getContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function listComments(
  tmdbId: number,
  mediaType: "movie" | "tv",
  offset = 0,
  limit = 20
): Promise<CommentPage | null> {
  if (!Number.isInteger(tmdbId) || (mediaType !== "movie" && mediaType !== "tv")) return null;
  const { supabase } = await getContext();
  try {
    return await fetchComments(
      supabase,
      tmdbId,
      mediaType,
      Math.max(0, Math.floor(offset)),
      Math.min(200, Math.max(1, Math.floor(limit)))
    );
  } catch {
    return null;
  }
}

function validateBody(raw: string): { body: string } | { error: CommentError } {
  const body = String(raw ?? "").trim();
  if (body.length === 0) return { error: "empty" };
  if (body.length > 1000) return { error: "too_long" };
  return { body };
}

export async function postComment(input: {
  tmdb_id: number;
  media_type: "movie" | "tv";
  body: string;
  visibility: Visibility;
  spoiler: boolean;
  parent_id?: string | null;
}): Promise<Result> {
  const { supabase, user } = await getContext();
  if (!user) return { ok: false, error: "auth" };
  if (!Number.isInteger(input.tmdb_id) || (input.media_type !== "movie" && input.media_type !== "tv")) {
    return { ok: false, error: "db" };
  }
  if (!VISIBILITIES.includes(input.visibility)) return { ok: false, error: "db" };

  const v = validateBody(input.body);
  if ("error" in v) return { ok: false, error: v.error };

  const [{ data: profile }, { data: block }] = await Promise.all([
    supabase.from("profiles").select("username").eq("id", user.id).maybeSingle(),
    supabase.from("comment_blocks").select("user_id").eq("user_id", user.id).maybeSingle(),
  ]);
  if (!profile?.username) return { ok: false, error: "no_username" };
  if (block) return { ok: false, error: "blocked" };

  // Responder a una respuesta cuelga del mensaje principal
  let parentId: string | null = null;
  if (input.parent_id) {
    if (!isUuid(input.parent_id)) return { ok: false, error: "db" };
    const { data: parent } = await supabase
      .from("comments")
      .select("id, parent_id")
      .eq("id", input.parent_id)
      .maybeSingle();
    if (!parent) return { ok: false, error: "db" };
    parentId = (parent.parent_id as string | null) ?? (parent.id as string);
  }

  const { error } = await supabase.from("comments").insert({
    user_id: user.id,
    tmdb_id: input.tmdb_id,
    media_type: input.media_type,
    parent_id: parentId,
    body: v.body,
    visibility: input.visibility,
    spoiler: !!input.spoiler,
  });
  if (error) return { ok: false, error: mapError(error) };
  return { ok: true };
}

export async function editComment(input: {
  id: string;
  body: string;
  visibility: Visibility;
  spoiler: boolean;
}): Promise<Result> {
  const { supabase, user } = await getContext();
  if (!user) return { ok: false, error: "auth" };
  if (!isUuid(input.id) || !VISIBILITIES.includes(input.visibility)) return { ok: false, error: "db" };

  const v = validateBody(input.body);
  if ("error" in v) return { ok: false, error: v.error };

  const { data, error } = await supabase
    .from("comments")
    .update({ body: v.body, visibility: input.visibility, spoiler: !!input.spoiler })
    .eq("id", input.id)
    .eq("user_id", user.id)
    .select("id");
  if (error) return { ok: false, error: mapError(error) };
  if (!data || data.length === 0) return { ok: false, error: "db" };
  return { ok: true };
}

// Borra un mensaje propio (o cualquiera, si eres administrador: lo decide la base de datos)
export async function deleteComment(id: string): Promise<Result> {
  const { supabase, user } = await getContext();
  if (!user) return { ok: false, error: "auth" };
  if (!isUuid(id)) return { ok: false, error: "db" };
  const { error } = await supabase.from("comments").delete().eq("id", id);
  return error ? { ok: false, error: "db" } : { ok: true };
}

export async function reportComment(id: string, reason: string): Promise<Result> {
  const { supabase, user } = await getContext();
  if (!user) return { ok: false, error: "auth" };
  if (!isUuid(id)) return { ok: false, error: "db" };

  const text = String(reason ?? "").trim().slice(0, 300);
  const { error } = await supabase
    .from("comment_reports")
    .insert({ comment_id: id, reporter_id: user.id, reason: text === "" ? null : text });

  // Ya lo habías denunciado: se da por bueno
  if (error && error.code !== "23505") return { ok: false, error: "db" };
  return { ok: true };
}
