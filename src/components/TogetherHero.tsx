import Image from "next/image";
import Link from "next/link";
import { getT } from "@/lib/i18n-server";
import { genreName } from "@/lib/genres";
import { img } from "@/lib/tmdb";
import { Avatar } from "./Avatar";

type Pick = { tmdb_id: number; media_type: string; title: string; poster_path: string | null; me: number; them: number };
export type Compat = { common: number; rated: number; percent: number; genres: number[]; best: Pick | null; clash: Pick | null };

const fmt = (n: number, lang: string) => Number(n).toLocaleString(lang, { maximumFractionDigits: 1 });

// Cabecera de pareja en «Juntos»: vuestras fotos, compatibilidad, géneros, favorita común y la que más discrepáis
export async function TogetherHero({
  me,
  friend,
  compat,
}: {
  me: { avatar_url: string | null };
  friend: { username: string; display_name: string | null; avatar_url: string | null };
  compat: Compat | null;
}) {
  const { lang } = await getT();
  const L = lang === "en";
  const name = friend.display_name ?? `@${friend.username}`;
  const pct = compat?.percent ?? null;
  const ring = pct === null ? 0 : (pct / 100) * 2 * Math.PI * 44;
  const mood =
    pct === null ? "" : pct >= 80 ? (L ? "Soulmates 🍿" : "Almas gemelas 🍿") : pct >= 60 ? (L ? "Great match" : "Muy compatibles") : pct >= 40 ? (L ? "Good vibes" : "Buen rollo") : L ? "Opposites attract" : "Polos opuestos";

  const film = (p: Pick, label: string, tone: string, line: string) => (
    <Link href={`/titulo/${p.media_type}/${p.tmdb_id}`} className={`group flex items-center gap-3 rounded-2xl p-3 ring-1 transition hover:-translate-y-0.5 ${tone}`}>
      <span className="relative h-16 w-11 shrink-0 overflow-hidden rounded-lg bg-black/20">
        {p.poster_path && <Image src={img(p.poster_path, "w92")!} alt="" fill sizes="44px" className="object-cover" />}
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] font-bold uppercase tracking-wider opacity-80">{label}</span>
        <span className="block truncate font-bold group-hover:underline">{p.title}</span>
        <span className="block text-xs opacity-90">{line}</span>
      </span>
    </Link>
  );

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-500 via-fuchsia-700 to-indigo-950 p-6 text-white shadow-xl sm:p-8">
      <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-amber-300/25 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-24 right-0 h-64 w-64 rounded-full bg-sky-400/20 blur-3xl" aria-hidden="true" />
      <div className="relative grid items-center gap-6 md:grid-cols-[auto_1fr]">
        {/* Las dos caras y el anillo de compatibilidad */}
        <div className="flex items-center justify-center gap-5">
          <div className="flex items-center">
            <span className="rounded-full ring-4 ring-white/80">
              <Avatar url={me.avatar_url} size={64} />
            </span>
            <span className="z-10 -mx-3 grid h-10 w-10 place-items-center rounded-full bg-white text-xl shadow-lg" aria-hidden="true">
              💞
            </span>
            <span className="rounded-full ring-4 ring-white/80">
              <Avatar url={friend.avatar_url} size={64} />
            </span>
          </div>
          {pct !== null && (
            <div className="relative h-28 w-28 shrink-0">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
                <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="9" />
                <circle cx="50" cy="50" r="44" fill="none" stroke="url(#cg)" strokeWidth="9" strokeLinecap="round" strokeDasharray={`${ring} 999`} />
                <defs>
                  <linearGradient id="cg" x1="0" x2="1">
                    <stop offset="0" stopColor="#fde68a" />
                    <stop offset="1" stopColor="#f9a8d4" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 grid place-content-center text-center">
                <span className="text-3xl font-black leading-none">{pct}%</span>
                <span className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-white/80">{L ? "match" : "compatibles"}</span>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-white/80">{L ? `You and ${name}` : `Tú y ${name}`}</p>
            <p className="text-2xl font-black sm:text-3xl">{compat ? mood : L ? "Your movie duo" : "Vuestro dúo de cine"}</p>
            {compat && (
              <p className="mt-1 text-sm text-white/85">
                {L ? `${compat.common} titles in common` : `${compat.common} títulos en común`}
                {compat.rated ? (L ? ` · ${compat.rated} rated by both` : ` · ${compat.rated} puntuados por los dos`) : ""}
              </p>
            )}
          </div>
          {compat && compat.genres.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {compat.genres.map((g) => (
                <span key={g} className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold ring-1 ring-white/25">
                  ❤️ {genreName(g, lang)}
                </span>
              ))}
            </div>
          )}
          {compat && (compat.best || compat.clash) && (
            <div className="grid gap-3 sm:grid-cols-2">
              {compat.best &&
                film(compat.best, L ? "Your shared favourite" : "Vuestra favorita", "bg-white/15 ring-white/25 hover:bg-white/20", L ? `You ${fmt(compat.best.me, lang)} · ${name} ${fmt(compat.best.them, lang)}` : `Tú un ${fmt(compat.best.me, lang)} · ${name} un ${fmt(compat.best.them, lang)}`)}
              {compat.clash &&
                film(compat.clash, L ? "You disagree on…" : "Aquí no coincidís", "bg-black/25 ring-white/15 hover:bg-black/30", L ? `You ${fmt(compat.clash.me, lang)} · ${name} ${fmt(compat.clash.them, lang)} 😂` : `Tú un ${fmt(compat.clash.me, lang)} · ${name} un ${fmt(compat.clash.them, lang)} 😂`)}
            </div>
          )}
          {!compat && <p className="text-sm text-white/80">{L ? `${name} keeps their activity private, but you can still cross your watchlists below.` : `${name} no comparte su actividad, pero podéis cruzar vuestros pendientes aquí debajo.`}</p>}
        </div>
      </div>
    </section>
  );
}
