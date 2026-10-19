import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildXlsx } from "@/lib/xlsx-write";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  viendo: "Viendo",
  visto: "Visto",
  volver_a_ver: "Volver a ver",
};

// Descarga tu lista en Excel (.xlsx) con las mismas columnas que se usan al importar.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("No autorizado", { status: 401 });

  const { data, error } = await supabase
    .from("user_titles")
    .select("title, media_type, status, rating, private_note, tmdb_id, updated_at")
    .eq("user_id", user.id)
    .order("title", { ascending: true })
    .limit(5000);
  if (error) return new NextResponse("No se pudo exportar", { status: 500 });

  const rows: (string | number | null)[][] = [["NOMBRE", "TIPO", "VISUALIZACION", "NOTA", "NOTA PRIVADA", "ID TMDB", "ACTUALIZADO"]];
  for (const r of data ?? []) {
    rows.push([
      r.title as string,
      r.media_type === "tv" ? "Serie" : "Película",
      r.status ? STATUS_LABEL[r.status as string] ?? "" : "",
      r.rating === null ? null : Number(r.rating),
      (r.private_note as string | null) ?? "",
      r.tmdb_id as number,
      (r.updated_at as string).slice(0, 10),
    ]);
  }

  const file = buildXlsx("Mi lista", rows, [44, 12, 16, 8, 40, 10, 14]);
  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="claqueta-mi-lista-${day}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
