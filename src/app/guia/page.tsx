import Link from "next/link";
import Image from "next/image";
import { getT } from "@/lib/i18n-server";
import { getGuide } from "@/lib/guide";
import { GuideVideoButton } from "@/components/GuideVideo";

export async function generateMetadata() {
  const { lang } = await getT();
  return { title: lang === "es" ? "Guía de uso" : "User guide", alternates: { canonical: "/guia" } };
}

export default async function GuidePage() {
  const { lang, t } = await getT();
  const guide = getGuide(lang);
  // El mismo índice se pinta plegado en el móvil y fijo al lado en escritorio
  const toc = (
    <ol className="grid gap-1 text-sm sm:grid-cols-2 lg:grid-cols-1">
      {guide.sections.map((s) => (
        <li key={s.id}>
          <a href={`#${s.id}`} className="block rounded-lg px-2 py-2 text-neutral-700 hover:bg-teal-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-fg dark:text-neutral-200 dark:hover:bg-neutral-800">
            {s.title}
          </a>
        </li>
      ))}
    </ol>
  );
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="space-y-4 rounded-3xl bg-gradient-to-br from-teal-700 to-teal-950 p-6 text-white sm:p-9">
        <h1 className="text-3xl font-extrabold sm:text-4xl">{t("guide.link")}</h1>
        <p className="max-w-2xl text-teal-50">{guide.intro}</p>
        <div className="flex flex-wrap gap-3">
          <GuideVideoButton />
          {/* La visita guiada también se puede hacer más tarde, aunque se saltara al registrarse */}
          <Link
            href="/empezar?directo=1"
            className="inline-flex items-center gap-2.5 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-teal-900 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <span aria-hidden="true">🧭</span>
            {lang === "es" ? "Hacer la visita guiada" : "Take the guided tour"}
          </Link>
        </div>
      </header>
      <div className="grid items-start gap-8 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <nav id="indice" aria-label={guide.contents} className="scroll-mt-32 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900 lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto">
          <details className="group lg:hidden">
            <summary className="cursor-pointer rounded-lg py-2 font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-fg">{guide.contents}</summary>
            {toc}
          </details>
          <div className="hidden lg:block">
            <h2 className="mb-3 font-bold">{guide.contents}</h2>
            {toc}
          </div>
        </nav>
        <div className="min-w-0 space-y-5">
          {guide.sections.map((s, index) => (
            <section key={s.id} id={s.id} aria-labelledby={`heading-${s.id}`} className={`scroll-mt-32 space-y-4 rounded-2xl border p-5 sm:p-6 ${index === 0 ? "border-teal-300 bg-teal-50 dark:border-teal-800 dark:bg-teal-950/40" : "border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"}`}>
              <h2 id={`heading-${s.id}`} className="text-xl font-bold">{s.title}</h2>
              {index === 0 ? (
                <ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed text-neutral-700 dark:text-neutral-200">
                  {s.text.map((p, i) => <li key={i}>{p}</li>)}
                </ol>
              ) : (
                <div className="space-y-3 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
                  <p>{s.text[0]}</p>
                  <details className="group">
                    <summary className="cursor-pointer rounded-lg py-2 font-semibold text-brand-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-fg">{lang === "es" ? "Pasos y detalles" : "Steps and details"}</summary>
                    <div className="space-y-3 pt-2">
                      {s.text.slice(1).map((p, i) => <p key={i}>{p}</p>)}
                      {(s.id === "seguimiento" || s.id === "episodios") && lang === "es" && (
                        <figure className="space-y-2">
                          <Image src={s.id === "seguimiento" ? "/guide/tracking.jpg" : "/guide/episodes.jpg"} width={896} height={s.id === "seguimiento" ? 517 : 500} loading="lazy" alt={s.id === "seguimiento" ? "Ficha de Dark con el estado Visto, una puntuación de 8,5 y el campo Notas privadas." : "Temporada de Dark con cuatro episodios marcados y el control Marcar hasta aquí."} className="h-auto w-full rounded-xl border border-neutral-200 dark:border-neutral-700" />
                          <figcaption className="text-xs text-neutral-500">Interfaz actual en español, con datos de demostración.</figcaption>
                        </figure>
                      )}
                    </div>
                  </details>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-4">
                {s.href && s.cta && <Link href={s.href} className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-fg">{s.cta} →</Link>}
                <a href="#indice" className="rounded px-1 py-2 text-xs font-medium text-brand-fg underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-fg">{guide.back} ↑</a>
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
