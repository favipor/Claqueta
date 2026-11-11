import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUser } from "@/lib/push";
import { getDetail, type MediaType } from "@/lib/tmdb";
import { dictionaries, type DictKey } from "@/lib/dict";
import { SITE_URL } from "@/lib/site";

// Título del aviso según lo que ha pasado (el texto va debajo)
function titleFor(type: string) {
  switch (type) {
    case "message": return "💬 Mensaje nuevo";
    case "recommendation": return "🎬 Te han recomendado algo";
    case "reply": return "↩️ Te han respondido";
    case "mention": return "📣 Te han mencionado";
    case "follow_request": return "👤 Solicitud para seguirte";
    case "follow": return "👤 Nuevo seguidor";
    case "follow_accepted": return "✅ Solicitud aceptada";
    case "new_episode": return "📺 Capítulo nuevo";
    case "new_user": return "🆕 Nuevo registro";
    default: return "Claqueta";
  }
}

// La base de datos llama aquí cada vez que crea una notificación (phase9.sql, con la clave secreta).
// Esta ruta compone el texto y lo envía como notificación push a los móviles de esa persona.
export async function POST(request: Request) {
  const secret = process.env.PUSH_WEBHOOK_SECRET;
  if (!secret || request.headers.get("x-push-secret") !== secret) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { notification_id } = (await request.json().catch(() => ({}))) as { notification_id?: string };
  if (!notification_id || !/^[0-9a-f-]{36}$/i.test(notification_id)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "no_service_key" }, { status: 500 });

  const { data: n } = await admin
    .from("notifications")
    .select("id, user_id, actor_id, type, tmdb_id, media_type, read_at")
    .eq("id", notification_id)
    .maybeSingle();
  if (!n || n.read_at) return NextResponse.json({ ok: true, skipped: true });

  const t = (k: DictKey) => dictionaries.es[k];
  const [{ data: actor }, detail] = await Promise.all([
    n.actor_id
      ? admin.from("profiles").select("username, display_name").eq("id", n.actor_id).maybeSingle()
      : Promise.resolve({ data: null }),
    n.tmdb_id && n.media_type
      ? getDetail(n.media_type as MediaType, n.tmdb_id as number, "es").catch(() => null)
      : Promise.resolve(null),
  ]);

  const who = actor?.display_name ?? (actor?.username ? `@${actor.username}` : "Alguien");
  const titleName = detail?.title ?? "";
  const titleUrl = n.tmdb_id && n.media_type ? `/titulo/${n.media_type}/${n.tmdb_id}` : "/notificaciones";

  let body: string;
  let url: string;
  switch (n.type) {
    case "new_episode":
      body = `${t("notif.new_episode")} ${titleName}`.trim();
      url = titleUrl;
      break;
    case "message":
    case "recommendation":
      body = `${who} ${t(`notif.${n.type}` as DictKey)}${titleName ? ` ${titleName}` : ""}`;
      url = actor?.username ? `/mensajes/${actor.username}` : "/mensajes";
      break;
    case "reply":
    case "mention":
      body = `${who} ${t(`notif.${n.type}` as DictKey)} ${titleName}`.trim();
      url = `${titleUrl}#conversacion`;
      break;
    default:
      body = `${who} ${t(`notif.${n.type}` as DictKey) ?? ""}`.trim();
      url = actor?.username ? `/u/${actor.username}` : "/notificaciones";
  }

  // ?aviso=id → al abrirla se marca como leída (AppBadge)
  const [path, hash] = url.split("#");
  const withId = `${path}${path.includes("?") ? "&" : "?"}aviso=${n.id}${hash ? `#${hash}` : ""}`;
  const sent = await sendPushToUser(n.user_id as string, {
    title: titleFor(n.type as string),
    body,
    url: `${SITE_URL}${withId}`,
    tag: `${n.type}-${n.tmdb_id ?? n.actor_id ?? n.id}`,
    icon: detail?.poster_path ? `https://image.tmdb.org/t/p/w185${detail.poster_path}` : undefined,
  });
  return NextResponse.json({ ok: true, sent });
}
