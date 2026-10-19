"use client";

import { useState } from "react";
import { useI18n } from "./I18nProvider";

const STAR = "M12 2.5l2.94 5.96 6.58.96-4.76 4.64 1.12 6.55L12 17.52l-5.88 3.09 1.12-6.55L2.48 9.42l6.58-.96L12 2.5z";

// Nota de 0 a 10 con 10 estrellas: se puede dar una estrella entera (1 punto) o la mitad (0,5).
// Con teclado: flechas ±0,5, Inicio/Fin y Supr para quitar la nota.
export function StarRating({
  value,
  onChange,
  disabled,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value ?? 0;

  function fromPointer(e: React.PointerEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    return Math.max(0.5, Math.min(10, Math.ceil(ratio * 20) / 2));
  }

  function onKey(e: React.KeyboardEvent) {
    if (disabled) return;
    const cur = value ?? 0;
    let next: number | null | undefined;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") next = Math.min(10, cur + 0.5);
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = cur - 0.5 <= 0 ? null : cur - 0.5;
    else if (e.key === "Home") next = null;
    else if (e.key === "End") next = 10;
    else if (e.key === "Delete" || e.key === "Backspace") next = null;
    if (next !== undefined) {
      e.preventDefault();
      onChange(next);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={t("detail.myRating")}
        aria-valuemin={0}
        aria-valuemax={10}
        aria-valuenow={value ?? 0}
        aria-valuetext={value === null ? t("detail.noRating") : `${String(value).replace(".", ",")} / 10`}
        aria-disabled={disabled}
        onKeyDown={onKey}
        onPointerMove={(e) => !disabled && e.pointerType === "mouse" && setHover(fromPointer(e))}
        onPointerLeave={() => setHover(null)}
        onClick={(e) => {
          if (disabled) return;
          const v = fromPointer(e);
          // pulsar de nuevo la misma nota la quita
          onChange(v === value ? null : v);
        }}
        className="inline-flex cursor-pointer touch-manipulation select-none rounded-lg p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-fg"
      >
        {Array.from({ length: 10 }, (_, i) => {
          const fill = Math.max(0, Math.min(1, shown - i)); // 0, 0.5 o 1
          return (
            <span key={i} className="relative block h-7 w-7 sm:h-8 sm:w-8" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="absolute inset-0 h-full w-full text-neutral-300 dark:text-neutral-700">
                <path d={STAR} fill="currentColor" />
              </svg>
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <svg viewBox="0 0 24 24" className="h-7 w-7 text-amber-400 sm:h-8 sm:w-8">
                  <path d={STAR} fill="currentColor" />
                </svg>
              </span>
            </span>
          );
        })}
      </div>

      <span className="min-w-[4.5rem] text-sm font-semibold tabular-nums">
        {shown > 0 ? (
          <>
            <span className="text-lg">{String(shown).replace(".", ",")}</span>
            <span className="text-neutral-500"> / 10</span>
          </>
        ) : (
          <span className="font-normal text-neutral-500">{t("detail.noRating")}</span>
        )}
      </span>

      {value !== null && !disabled && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-semibold hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          {t("detail.clearRating")}
        </button>
      )}
    </div>
  );
}
