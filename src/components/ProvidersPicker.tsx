"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { saveProviders } from "@/app/profile-actions";
import { img, type Provider } from "@/lib/tmdb";
import { useI18n } from "./I18nProvider";

// Ajustes → tus plataformas: logos que se encienden al pulsarlos. Se guarda solo.
export function ProvidersPicker({ providers, initial }: { providers: Provider[]; initial: number[] }) {
  const { t } = useI18n();
  const [selected, setSelected] = useState<Set<number>>(new Set(initial));
  const [state, setState] = useState<"idle" | "saved" | "error">("idle");
  const [pending, start] = useTransition();

  function toggle(id: number) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
    start(async () => {
      const res = await saveProviders([...next]);
      setState(res.ok ? "saved" : "error");
      if (res.ok) setTimeout(() => setState("idle"), 1800);
    });
  }

  return (
    <section
      id="plataformas"
      className="mx-auto mt-6 max-w-xl scroll-mt-24 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
    >
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">{t("prov.title")}</h2>
        <span className="text-xs text-neutral-500" aria-live="polite">
          {pending ? t("detail.saving") : state === "saved" ? `${t("prov.saved")} ✓` : state === "error" ? t("tv.errorSave") : `${selected.size} ${t("prov.count")}`}
        </span>
      </div>
      <p className="mb-4 text-sm text-neutral-500">{t("prov.hint")}</p>
      <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
        {providers.map((p) => {
          const on = selected.has(p.id);
          const logo = img(p.logo_path, "w92");
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => toggle(p.id)}
                aria-pressed={on}
                title={p.name}
                className={`group relative flex w-full flex-col items-center gap-1.5 rounded-xl border-2 p-2 text-center transition ${
                  on
                    ? "border-brand bg-brand/10 shadow-sm"
                    : "border-transparent bg-neutral-100 opacity-70 grayscale hover:opacity-100 hover:grayscale-0 dark:bg-neutral-800"
                }`}
              >
                <span className="relative h-12 w-12 overflow-hidden rounded-xl bg-white shadow-sm">
                  {logo && <Image src={logo} alt="" fill sizes="48px" className="object-cover" />}
                </span>
                <span className="line-clamp-1 text-[11px] font-semibold">{p.name}</span>
                {on && (
                  <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-brand text-white shadow">
                    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="m5 12 5 5L20 7" />
                    </svg>
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
