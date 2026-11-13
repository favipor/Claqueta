import { getT } from "@/lib/i18n-server";
import type { DictKey } from "@/lib/dict";
import { Avatar } from "./Avatar";
import { FriendReactTile } from "./FriendReactTile";

export type FriendEntry = {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  status: string | null;
  rating: number | string | null;
};


// «Tus amigos»: qué han hecho con este título las personas a las que sigues
export async function FriendsOnTitle({ friends, meId, tmdbId, mediaType, myReactions }: { friends: FriendEntry[]; meId: string; tmdbId: number; mediaType: string; myReactions: Record<string, string> }) {
  const { t, lang } = await getT();
  const L = lang === "en";
  const rated = friends.filter((f) => f.rating !== null).map((f) => Number(f.rating));
  const avg = rated.length ? rated.reduce((a, b) => a + b, 0) / rated.length : null;
  const seen = friends.filter((f) => f.status === "visto" || f.status === "volver_a_ver").length;
  const want = friends.filter((f) => f.status === "pendiente").length;
  const fmt = (n: number) => n.toLocaleString(lang, { maximumFractionDigits: 1 });

  const parts = [
    seen && (L ? `${seen} watched it` : `${seen} ${seen === 1 ? "la ha visto" : "la han visto"}`),
    want && (L ? `${want} want to watch it` : `${want} ${want === 1 ? "la quiere ver" : "la quieren ver"}`),
  ].filter(Boolean);

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Caras apiladas */}
          <div className="flex -space-x-3">
            {friends.slice(0, 4).map((f) => (
              <span key={f.user_id} className="rounded-full ring-2 ring-white dark:ring-neutral-900">
                <Avatar url={f.avatar_url} size={36} />
              </span>
            ))}
          </div>
          <div>
            <h2 className="font-bold leading-tight">{L ? "Your friends" : "Tus amigos"}</h2>
            {parts.length > 0 && <p className="text-sm text-neutral-500">{parts.join(" · ")}</p>}
          </div>
        </div>
        {avg !== null && (
          <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 dark:bg-amber-950/30">
            <span className="text-xl text-amber-500" aria-hidden="true">
              ★
            </span>
            <span>
              <span className="block text-lg font-black leading-none tabular-nums">{fmt(avg)}</span>
              <span className="block text-[11px] font-semibold text-neutral-500">
                {L ? `friends' average · ${rated.length}` : `media de tus amigos · ${rated.length}`}
              </span>
            </span>
          </div>
        )}
      </div>

      <ul className="mt-4 flex gap-3 overflow-x-auto pb-1 no-scrollbar">
        {friends.map((f) => (
          <li key={f.user_id} className="shrink-0">
            <FriendReactTile
              f={f}
              tmdbId={tmdbId}
              mediaType={mediaType}
              meId={meId}
              initial={myReactions[f.user_id] ?? null}
              statusLabel={f.status ? t(`status.${f.status}` as DictKey) : null}
            />
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-neutral-400">{L ? "Tip: press and hold a friend to react" : "Truco: deja pulsado sobre un amigo para reaccionar"}</p>
    </section>
  );
}
