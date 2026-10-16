"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "./I18nProvider";
import type { DictKey } from "@/lib/dict";

type Prefs = { size: number; contrast: boolean; dyslexia: boolean; motion: boolean; underline: boolean };
const DEFAULTS: Prefs = { size: 0, contrast: false, dyslexia: false, motion: false, underline: false };
const SIZES = ["100%", "112.5%", "125%", "150%"];

function apply(p: Prefs) {
  const h = document.documentElement;
  h.classList.toggle("a11y-contrast", p.contrast);
  h.classList.toggle("a11y-dyslexia", p.dyslexia);
  h.classList.toggle("a11y-motion", p.motion);
  h.classList.toggle("a11y-underline", p.underline);
  h.style.fontSize = SIZES[p.size] ?? "100%";
}

export function A11yPanel() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("a11y") || "{}");
      setPrefs({ ...DEFAULTS, ...saved });
    } catch {}
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (panelRef.current && !panelRef.current.contains(target)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  function update(patch: Partial<Prefs>) {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    apply(next);
    try {
      localStorage.setItem("a11y", JSON.stringify(next));
    } catch {}
  }

  const toggles: { key: "contrast" | "dyslexia" | "motion" | "underline"; label: DictKey }[] = [
    { key: "contrast", label: "a11y.contrast" },
    { key: "dyslexia", label: "a11y.dyslexia" },
    { key: "motion", label: "a11y.motion" },
    { key: "underline", label: "a11y.underline" },
  ];

  return (
    <div ref={panelRef}>
      {open && (
        <div
          role="dialog"
          aria-label={t("a11y.title")}
          className="fixed bottom-20 right-5 z-50 w-72 space-y-4 rounded-2xl border border-neutral-200 bg-white p-4 text-neutral-900 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">{t("a11y.title")}</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t("a11y.close")}
              className="rounded-full px-2 py-0.5 text-lg leading-none hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              ×
            </button>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{t("a11y.size")}</legend>
            <div className="grid grid-cols-4 gap-1">
              {SIZES.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-pressed={prefs.size === i}
                  onClick={() => update({ size: i })}
                  className={`rounded-lg border px-1 py-1.5 font-semibold transition-colors ${
                    prefs.size === i
                      ? "border-brand bg-brand text-white"
                      : "border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                  }`}
                  style={{ fontSize: `${0.75 + i * 0.1}rem` }}
                  title={t(`a11y.size.${i}` as DictKey)}
                  aria-label={t(`a11y.size.${i}` as DictKey)}
                >
                  A
                </button>
              ))}
            </div>
          </fieldset>

          <ul className="space-y-1">
            {toggles.map(({ key, label }) => (
              <li key={key}>
                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800">
                  {t(label)}
                  <input
                    type="checkbox"
                    role="switch"
                    checked={prefs[key]}
                    onChange={(e) => update({ [key]: e.target.checked })}
                    className="h-5 w-5 accent-teal-700"
                  />
                </label>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => update(DEFAULTS)}
            className="w-full rounded-full border border-neutral-300 px-4 py-1.5 text-sm font-semibold hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            {t("a11y.reset")}
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={t("a11y.button")}
        title={t("a11y.button")}
        className="fixed bottom-5 right-5 z-50 grid h-11 w-11 place-items-center rounded-full bg-neutral-900 text-white shadow-lg transition hover:scale-110 hover:bg-neutral-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-fg dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="4.5" r="1.8" />
          <path d="M5 8.5c4.5 1.2 9.5 1.2 14 0M12 8.5v5M12 13.5l-3 6.5M12 13.5l3 6.5" />
        </svg>
      </button>
    </div>
  );
}
