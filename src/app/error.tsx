"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useI18n } from "@/components/I18nProvider";
import { ClapperIcon } from "@/components/ClapperIcon";
import { reportError } from "@/components/Telemetry";

// Si algo falla al cargar una página se muestra esto en lugar de la pantalla de error genérica
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  useEffect(() => {
    console.error(error);
    reportError(error.message || "Error al cargar la página", error.stack, error.digest);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
      <span className="grid h-20 w-20 -rotate-6 place-items-center rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg">
        <ClapperIcon className="h-11 w-11" />
      </span>
      <h1 className="mt-6 text-2xl font-bold">{t("err.title")}</h1>
      <p className="mt-2 text-neutral-500">{t("err.text")}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-brand px-6 py-2.5 text-sm font-bold text-white shadow hover:bg-brand-dark"
        >
          {t("err.retry")}
        </button>
        <Link href="/" className="rounded-full border border-neutral-300 px-6 py-2.5 text-sm font-bold hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800">
          {t("err.home")}
        </Link>
      </div>
    </div>
  );
}
