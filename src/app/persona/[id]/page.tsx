import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getPerson, img } from "@/lib/tmdb";
import { getT } from "@/lib/i18n-server";
import { TitleCard } from "@/components/TitleCard";
import { Reveal } from "@/components/Reveal";
import type { DictKey } from "@/lib/dict";

type Props = { params: Promise<{ id: string }> };

function parseId(id: string) {
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = parseId((await params).id);
  if (!id) return {};
  const { lang } = await getT();
  const p = await getPerson(id, lang);
  return { title: p?.name ?? "Claqueta" };
}

function formatDate(date: string, lang: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(lang === "en" ? "en-US" : "es-ES", {
    dateStyle: "long",
    timeZone: "UTC",
  });
}

function ageOf(birthday: string, until?: string | null) {
  const b = new Date(`${birthday}T00:00:00Z`);
  const e = until ? new Date(`${until}T00:00:00Z`) : new Date();
  let age = e.getUTCFullYear() - b.getUTCFullYear();
  const m = e.getUTCMonth() - b.getUTCMonth();
  if (m < 0 || (m === 0 && e.getUTCDate() < b.getUTCDate())) age--;
  return age;
}

export default async function PersonPage({ params }: Props) {
  const { lang, t } = await getT();
  const id = parseId((await params).id);
  const p = id ? await getPerson(id, lang) : null;

  if (!p) {
    return (
      <p className="py-20 text-center text-neutral-500">
        {t("person.notFound")} <Link href="/" className="text-brand-fg underline">←</Link>
      </p>
    );
  }

  const photo = img(p.profile_path, "w500");
  const deptKey = `person.dept.${p.known_for_department}` as DictKey;
  const dept = ["Acting", "Directing", "Writing", "Production"].includes(p.known_for_department)
    ? t(deptKey)
    : p.known_for_department;

  return (
    <article className="space-y-10">
      <Reveal>
        <div className="flex flex-col gap-8 sm:flex-row">
          <div className="relative mx-auto aspect-[2/3] w-52 shrink-0 overflow-hidden rounded-2xl bg-neutral-200 shadow-lg sm:mx-0 sm:w-64 dark:bg-neutral-800">
            {photo ? (
              <Image src={photo} alt={p.name} fill priority sizes="256px" className="object-cover" />
            ) : (
              <div className="grid h-full place-items-center text-5xl text-neutral-400" aria-hidden="true">
                {p.name.charAt(0)}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              {dept && (
                <p className="text-sm font-semibold uppercase tracking-wide text-brand-fg">{dept}</p>
              )}
              <h1 className="text-3xl font-extrabold sm:text-4xl">{p.name}</h1>
            </div>

            <dl className="space-y-1 text-sm">
              {p.birthday && (
                <div className="flex gap-2">
                  <dt className="font-semibold">{t("person.born")}:</dt>
                  <dd>
                    {formatDate(p.birthday, lang)}
                    {!p.deathday && ` (${ageOf(p.birthday)} ${t("person.years")})`}
                    {p.place_of_birth ? ` · ${p.place_of_birth}` : ""}
                  </dd>
                </div>
              )}
              {p.deathday && (
                <div className="flex gap-2">
                  <dt className="font-semibold">{t("person.died")}:</dt>
                  <dd>
                    {formatDate(p.deathday, lang)}
                    {p.birthday && ` (${ageOf(p.birthday, p.deathday)} ${t("person.years")})`}
                  </dd>
                </div>
              )}
            </dl>

            <div>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
                {t("person.bio")}
              </h2>
              {p.biography ? (
                <p className="max-w-3xl whitespace-pre-line text-sm leading-relaxed">{p.biography}</p>
              ) : (
                <p className="text-sm text-neutral-500">{t("person.noBio")}</p>
              )}
            </div>
          </div>
        </div>
      </Reveal>

      {p.credits.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-bold">{t("person.knownFor")}</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {p.credits.map((c, i) => (
              <TitleCard
                key={`${c.media_type}-${c.id}`}
                id={c.id}
                type={c.media_type}
                title={c.title}
                posterPath={c.poster_path}
                year={c.year}
                index={i}
              />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
