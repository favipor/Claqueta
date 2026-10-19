import Link from "next/link";
import { getT } from "@/lib/i18n-server";
import { getGuide } from "@/lib/guide";
import { GuideVideoButton } from "@/components/GuideVideo";

export const metadata = { title: "Claqueta" };

export default async function GuidePage() {
  const { lang, t } = await getT();
  const guide = getGuide(lang);

  return (
    <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[14rem_1fr]">
      <nav aria-label={t("guide.link")} className="hidden lg:block">
        <ul className="sticky top-24 space-y-1 text-sm">
          {guide.sections.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="block rounded-lg px-3 py-1.5 text-neutral-600 hover:bg-neutral-200/70 hover:text-neutral-950 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white"
              >
                {s.title.replace(/^\d+\.\s*/, "")}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-extrabold">{t("guide.link")}</h1>
          <p className="max-w-2xl text-neutral-600 dark:text-neutral-300">{guide.intro}</p>
          <GuideVideoButton className="!bg-brand !ring-0 hover:!bg-brand-dark" />
        </header>

        {guide.sections.map((s) => (
          <section
            key={s.id}
            id={s.id}
            className="scroll-mt-24 space-y-3 rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <h2 className="text-xl font-bold">{s.title}</h2>
            {s.text.map((p, i) => (
              <p key={i} className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
                {p}
              </p>
            ))}
            {s.href && s.cta && (
              <Link
                href={s.href}
                className="inline-block rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-hover"
              >
                {s.cta} →
              </Link>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
