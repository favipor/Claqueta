import { getT } from "@/lib/i18n-server";
import { getLegal } from "@/lib/legal";

export async function LegalPage({ doc }: { doc: "privacy" | "cookies" | "terms" }) {
  const { lang } = await getT();
  const d = getLegal(lang)[doc];
  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-extrabold">{d.title}</h1>
        <p className="text-neutral-600 dark:text-neutral-300">{d.intro}</p>
      </header>
      {d.sections.map((s) => (
        <section key={s.title} className="space-y-2">
          <h2 className="text-lg font-bold">{s.title}</h2>
          {s.body.map((p, i) => (
            <p key={i} className="leading-relaxed text-neutral-700 dark:text-neutral-300">
              {p}
            </p>
          ))}
        </section>
      ))}
    </article>
  );
}
