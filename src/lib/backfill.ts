import type { SupabaseClient } from "@supabase/supabase-js";
import { getTitleMeta, type MediaType } from "./tmdb";

// Rellena la duración y los géneros de títulos que se marcaron antes de existir las estadísticas.
// Se llama al abrir tu propio perfil; hace como mucho 15 a la vez hasta ponerlo todo al día.
export async function backfillTitleMeta(sb: SupabaseClient, userId: string) {
  try {
    const { data } = await sb
      .from("user_titles")
      .select("tmdb_id, media_type")
      .eq("user_id", userId)
      .is("genres", null)
      .in("status", ["visto", "volver_a_ver", "viendo"])
      .limit(15);
    if (!data || data.length === 0) return;

    await Promise.all(
      data.map(async (r) => {
        try {
          const m = await getTitleMeta(r.media_type as MediaType, r.tmdb_id as number);
          await sb
            .from("user_titles")
            .update({ runtime_min: m.runtime_min, genres: m.genres })
            .eq("user_id", userId)
            .eq("tmdb_id", r.tmdb_id)
            .eq("media_type", r.media_type);
        } catch {
          // se reintentará la próxima vez
        }
      })
    );
  } catch {
    // si aún no se ha ejecutado phase3.sql, simplemente no se rellena nada
  }
}
