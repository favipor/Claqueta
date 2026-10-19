import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getDetail, getRelated, getTvSeasons, getUpcoming, img, type MediaType, type TvSeason } from "@/lib/tmdb";
import { readTvState } from "@/lib/tv-state";
import type { TvState } from "@/lib/series-types";
import { TvTracking } from "@/components/TvTracking";
import { TrailerPlayer } from "@/components/TrailerPlayer";
import { Conversation, type Viewer } from "@/components/Conversation";
import { fetchComments, type CommentPage } from "@/lib/comments";
import { getT } from "@/lib/i18n-server";
import { createClient } from "@/lib/supabase/server";
import { TrackPanel } from "@/components/TrackPanel";
import { AddToList } from "@/components/AddToList";
import { UpcomingInfo } from "@/components/UpcomingInfo";
import { ScrollRow } from "@/components/ScrollRow";
import { TitleCard } from "@/components/TitleCard";
import { RecommendButton } from "@/components/RecommendButton";
import { Reveal } from "@/components/Reveal";
import { CastCard } from "@/components/CastCard";
import { ParallaxBackdrop } from "@/components/ParallaxBackdrop";
import { CountUp } from "@/components/CountUp";
import type { Status } from "@/lib/dict";

type Props = { params: Promise<{ type: string; id: string }> };

function parse(type: string, id: string): { type: MediaType; id: number } | null {
  const n = Number(id);
  if ((type !== "movie" && type !== "tv") || !Number.isInteger(n) || n <= 0) return null;
  return { type, id: n };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = parse((await params).type, (await params).id);
  if (!p) return {};
  const { lang } = await getT();
  const d = await getDetail(p.type, p.id, lang);
  return { title: d?.title ?? "Claqueta" };
}

export default async function TitlePage({ params }: Props) {
  const raw = await params;
  const { lang, t } = await getT();
  const p = parse(raw.type, raw.id);
  const d = p ? await getDetail(p.type, p.id, lang) : null;

  if (!p || !d) {
    return (
      <p className="py-20 text-center text-neutral-500">
        {t("detail.notFound")} <Link href="/" className="text-brand-fg underline">←</Link>
      </p>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Qué viene después (próxima temporada o secuela) y títulos parecidos, en paralelo
  const [upcoming, related] = await Promise.all([
    getUpcoming(p.type, p.id, lang),
    getRelated(p.type, p.id, lang),
  ]);

  let initial: { status: Status | null; rating: number | null; private_note: string | null } = {
    status: null,
    rating: null,
    private_note: null,
  };
  let community: { average: number | null; votes: number } = { average: null, votes: 0 };

  if (user) {
    const [{ data: mine }, { data: comm }] = await Promise.all([
      supabase
        .from("user_titles")
        .select("status, rating, private_note")
        .eq("user_id", user.id)
        .eq("tmdb_id", p.id)
        .eq("media_type", p.type)
        .maybeSingle(),
      supabase.rpc("community_rating", { p_tmdb_id: p.id, p_media_type: p.type }),
    ]);
    if (mine) {
      initial = {
        status: mine.status as Status | null,
        rating: mine.rating === null ? null : Number(mine.rating),
        private_note: mine.private_note,
      };
    }
    const row = Array.isArray(comm) ? comm[0] : null;
    if (row) community = { average: row.average === null ? null : Number(row.average), votes: Number(row.votes) };
  }

  // Series: temporadas de TMDB + lo que el usuario lleva visto.
  let tv: { seasons: TvSeason[]; state: TvState } | null = null;
  if (user && p.type === "tv") {
    try {
      const [seasons, state] = await Promise.all([
        getTvSeasons(p.id, lang),
        readTvState(supabase, user.id, p.id),
      ]);
      tv = { seasons, state };
    } catch {
      tv = null; // si falla (p. ej. falta ejecutar phase2.sql) se muestra el panel normal
    }
  }

  // Conversación del título (lo que cada persona puede ver lo decide la base de datos)
  let comments: CommentPage | null = null;
  try {
    comments = await fetchComments(supabase, p.id, p.type);
  } catch {
    comments = null; // si aún no se ha ejecutado phase4.sql no se muestra la conversación
  }
  let viewer: Viewer | null = null;
  if (user) {
    const [{ data: prof }, { data: block }, { data: admin }] = await Promise.all([
      supabase.from("profiles").select("username").eq("id", user.id).maybeSingle(),
      supabase.from("comment_blocks").select("user_id").eq("user_id", user.id).maybeSingle(),
      supabase.rpc("is_admin"),
    ]);
    viewer = {
      id: user.id,
      username: prof?.username ?? null,
      isAdmin: admin === true,
      blocked: !!block,
    };
  }

  const backdrop = img(d.backdrop_path, "w1280");
  const poster = img(d.poster_path, "w500");

  return (
    <article className="space-y-12">
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl bg-neutral-900">
          {backdrop && <ParallaxBackdrop src={backdrop} />}
          <div className="relative flex flex-col gap-6 p-6 text-white sm:flex-row sm:p-10">
            <div className="relative mx-auto aspect-[2/3] w-44 shrink-0 overflow-hidden rounded-xl shadow-2xl sm:mx-0 sm:w-56">
              {poster ? (
                <Image src={poster} alt={d.title} fill sizes="224px" priority className="object-cover" />
              ) : (
                <div className="grid h-full place-items-center bg-neutral-700 p-3 text-center">{d.title}</div>
              )}
            </div>
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-wide text-teal-300">
                {t(`kind.${d.kind}` as const)}
                {d.year ? ` · ${d.year}` : ""}
              </p>
              <h1 className="text-3xl font-extrabold sm:text-4xl">{d.title}</h1>
              {d.tagline && <p className="italic text-white/70">{d.tagline}</p>}
              <div className="flex flex-wrap gap-2">
                {d.genres.map((g) => (
                  <span key={g.id} className="rounded-full bg-white/15 px-3 py-0.5 text-xs">
                    {g.name}
                  </span>
                ))}
              </div>
              <p className="max-w-2xl text-sm leading-relaxed text-white/90">{d.overview}</p>
              <p className="text-sm text-white/70">
                {d.runtime ? `${d.runtime} min` : ""}
                {d.seasons ? ` · ${d.seasons} ${t("detail.seasons")} · ${d.episodes} ${t("detail.episodes")}` : ""}
              </p>

              <div className="flex flex-wrap gap-6 pt-2">
                <div>
                  <p className="text-xs uppercase text-white/60">{t("detail.tmdbRating")}</p>
                  <p className="text-2xl font-bold">
                    ★ {d.vote_average ? <CountUp value={d.vote_average} decimals={1} /> : "—"}
                  </p>
                </div>
                {user && (
                  <div>
                    <p className="text-xs uppercase text-white/60">{t("detail.communityRating")}</p>
                    <p className="text-2xl font-bold">
                      {community.average !== null ? (
                        <>
                          ★ <CountUp value={community.average} decimals={1} />
                        </>
                      ) : (
                        "—"
                      )}
                    </p>
                    <p className="text-xs text-white/60">
                      {community.votes > 0 ? (
                        <>
                          <CountUp value={community.votes} /> {t("detail.votes")}
                        </>
                      ) : (
                        t("detail.noVotes")
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal>
        {user && tv ? (
          <TvTracking
            meta={{ tmdb_id: d.id, title: d.title, poster_path: d.poster_path }}
            seasons={tv.seasons}
            initialState={tv.state}
            initial={initial}
          />
        ) : user ? (
          <TrackPanel
            tmdbId={d.id}
            mediaType={d.media_type}
            title={d.title}
            posterPath={d.poster_path}
            initial={initial}
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-neutral-300 p-6 text-center dark:border-neutral-700">
            <p className="mb-3">{t("detail.loginToTrack")}</p>
            <Link href="/login" className="rounded-lg bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-dark">
              {t("nav.login")}
            </Link>
          </div>
        )}
        {user && (
          <div className="mt-4 flex flex-wrap gap-3">
            <AddToList
              meta={{ tmdb_id: d.id, media_type: d.media_type, title: d.title, poster_path: d.poster_path }}
            />
            <RecommendButton
              meta={{ tmdb_id: d.id, media_type: d.media_type, title: d.title, poster_path: d.poster_path }}
            />
          </div>
        )}
      </Reveal>

      {upcoming && (
        <Reveal>
          <UpcomingInfo info={upcoming} />
        </Reveal>
      )}

      {d.providers.length > 0 && (
        <Reveal>
          <section>
            <h2 className="mb-3 text-lg font-bold">{t("detail.whereToWatch")}</h2>
            <ul className="flex flex-wrap gap-3">
              {d.providers.map((pr) => {
                const logo = img(pr.logo_path, "w92");
                const inner = (
                  <>
                    {logo && <Image src={logo} alt="" width={28} height={28} className="rounded" />}
                    {pr.name}
                  </>
                );
                const cls =
                  "flex items-center gap-2 rounded-lg bg-neutral-100 px-3 py-2 text-sm dark:bg-neutral-900";
                return (
                  <li key={pr.name}>
                    {d.providersLink ? (
                      <a
                        href={d.providersLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${cls} transition hover:-translate-y-0.5 hover:shadow-hover hover:ring-2 hover:ring-brand-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-fg`}
                      >
                        {inner}
                      </a>
                    ) : (
                      <span className={cls}>{inner}</span>
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-xs text-neutral-500">{t("detail.justwatch")}</p>
          </section>
        </Reveal>
      )}

      {d.cast.length > 0 && (
        <Reveal>
          <section>
            <h2 className="mb-3 text-lg font-bold">{t("detail.cast")}</h2>
            <ul className="-mx-3 -my-5 flex gap-4 overflow-x-auto px-5 py-9">
              {d.cast.map((c) => (
                <CastCard
                  key={c.id}
                  id={c.id}
                  name={c.name}
                  character={c.character}
                  profilePath={c.profile_path}
                />
              ))}
            </ul>
          </section>
        </Reveal>
      )}

      {d.trailerKey && (
        <Reveal>
          <section>
            <h2 className="mb-4 text-center text-lg font-bold">{t("detail.trailer")}</h2>
            <TrailerPlayer videoKey={d.trailerKey} title={d.title} />
          </section>
        </Reveal>
      )}

      {comments && (
        <Reveal>
          <div id="conversacion" className="scroll-mt-24" />
          <Conversation tmdbId={d.id} mediaType={d.media_type} initial={comments} viewer={viewer} />
        </Reveal>
      )}

      {related.length > 0 && (
        <section>
          <h2 className="mb-1 text-lg font-bold">{t("rel.title")}</h2>
          <ScrollRow label={t("rel.title")}>
            {related.map((it) => (
              <div key={`${it.media_type}-${it.id}`} className="w-36 shrink-0 snap-start sm:w-44">
                <TitleCard
                  id={it.id}
                  type={it.media_type}
                  title={it.title}
                  posterPath={it.poster_path}
                  year={it.year}
                  reveal={false}
                />
              </div>
            ))}
          </ScrollRow>
        </section>
      )}
    </article>
  );
}
