"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { STATUSES } from "@/lib/dict";
import { getTitleMeta } from "@/lib/tmdb";

type EntryInput = {
  tmdb_id: number;
  media_type: "movie" | "tv";
  title: string;
  poster_path: string | null;
  patch: {
    status?: string | null;
    rating?: number | null;
    private_note?: string | null;
  };
};

export async function updateEntry(input: EntryInput): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { tmdb_id, media_type, title, poster_path, patch } = input;
  if (!Number.isInteger(tmdb_id) || (media_type !== "movie" && media_type !== "tv")) {
    return { ok: false };
  }

  const row: Record<string, unknown> = {
    user_id: user.id,
    tmdb_id,
    media_type,
    title: String(title).slice(0, 300),
    poster_path,
  };

  if ("status" in patch) {
    if (patch.status !== null && !STATUSES.includes(patch.status as never)) return { ok: false };
    row.status = patch.status;
  }
  if ("rating" in patch) {
    const r = patch.rating;
    if (r !== null && r !== undefined) {
      if (typeof r !== "number" || r < 0 || r > 10 || (r * 2) % 1 !== 0) return { ok: false };
    }
    row.rating = r ?? null;
  }
  if ("private_note" in patch) {
    const note = (patch.private_note ?? "").slice(0, 5000);
    row.private_note = note.trim() === "" ? null : note;
  }

  // Al marcar un estado se guardan también la duración y los géneros (estadísticas del perfil).
  if ("status" in patch && patch.status) {
    try {
      const { data: cur } = await supabase
        .from("user_titles")
        .select("genres")
        .eq("user_id", user.id)
        .eq("tmdb_id", tmdb_id)
        .eq("media_type", media_type)
        .maybeSingle();
      if (!cur || cur.genres === null) {
        const meta = await getTitleMeta(media_type, tmdb_id);
        row.runtime_min = meta.runtime_min;
        row.genres = meta.genres;
      }
    } catch {
      // si TMDB falla, se guarda igualmente sin esos datos (se rellenan más tarde)
    }
  }

  const { error } = await supabase
    .from("user_titles")
    .upsert(row, { onConflict: "user_id,tmdb_id,media_type" });
  if (error) return { ok: false };

  // Si la fila queda totalmente vacía, se elimina para no acumular basura.
  await supabase
    .from("user_titles")
    .delete()
    .eq("user_id", user.id)
    .eq("tmdb_id", tmdb_id)
    .eq("media_type", media_type)
    .is("status", null)
    .is("rating", null)
    .is("private_note", null);

  revalidatePath("/mi-lista");
  revalidatePath(`/titulo/${media_type}/${tmdb_id}`);
  return { ok: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
