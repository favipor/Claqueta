import Link from "next/link";
import { getT } from "@/lib/i18n-server";
import type { DictKey } from "@/lib/dict";
import { Avatar } from "./Avatar";

export type FriendEntry = {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  status: string | null;
  rating: number | string | null;
};

const PILL: Record<string, string> = {
  pendiente: "bg-orange-500",
  viendo: "bg-amber-500",
  visto: "bg-emerald-600",
  volver_a_ver: "bg-sky-600",
};

// «Tus amigos»: qué han hecho con este título las personas a las que sigues
export async function FriendsOnTitle({ friends }: { friends: FriendEntry[] }) {
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
            <Link
              href={`/u/${f.username}`}
              className="flex w-28 flex-col items-center rounded-xl p-2 text-center transition hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <span className="relative">
                <Avatar url={f.avatar_url} size={56} />
                {f.rating !== null && (
                  <span className="absolute -bottom-1 -right-2 inline-flex items-center gap-0.5 rounded-full bg-black/85 px-1.5 py-0.5 text-[11px] font-bold text-white ring-2 ring-white dark:ring-neutral-900">
                    <span className="text-amber-400">★</span>
                    {fmt(Number(f.rating))}
                  </span>
                )}
              </span>
              <span className="mt-2 w-full truncate text-sm font-semibold">{f.display_name ?? `@${f.username}`}</span>
              {f.status && (
                <span className={`mt-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-white ${PILL[f.status] ?? "bg-neutral-500"}`}>
                  {t(`status.${f.status}` as DictKey)}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
