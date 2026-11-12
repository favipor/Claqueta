"use client";

import { useState, useTransition } from "react";
import { setShareActivity } from "@/app/profile-actions";
import { useI18n } from "./I18nProvider";

// Ajustes → si lo que marcas (visto, viendo, notas...) sale en «Actividad» de quien te sigue
export function ActivityToggle({ initial }: { initial: boolean }) {
  const { t } = useI18n();
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();

  function toggle() {
    const next = !on;
    setOn(next);
    start(async () => {
      const res = await setShareActivity(next);
      if (!res.ok) setOn(!next);
    });
  }

  return (
    <section className="mx-auto mt-6 max-w-xl rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <span aria-hidden="true">👀</span> {t("act.settingTitle")}
          </h2>
          <p className="mt-1 text-sm text-neutral-500">{on ? t("act.settingOn") : t("act.settingOff")}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={t("act.settingTitle")}
          disabled={pending}
          onClick={toggle}
          className={`relative mt-1 h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-fg disabled:opacity-60 ${
            on ? "bg-brand" : "bg-neutral-300 dark:bg-neutral-700"
          }`}
        >
          <span className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${on ? "translate-x-5" : ""}`} />
        </button>
      </div>
    </section>
  );
}
