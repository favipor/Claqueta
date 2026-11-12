"use client";

import { useState, type ReactNode } from "react";
import type { DictKey } from "@/lib/dict";
import { useI18n } from "./I18nProvider";

export const authInput =
  "w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-[15px] outline-none transition placeholder:text-neutral-400 focus:border-brand-fg focus:ring-4 focus:ring-brand/15 dark:border-neutral-700 dark:bg-neutral-950";

// 0–4 según longitud y variedad de caracteres
export function passwordScore(p: string) {
  if (!p) return 0;
  let s = 0;
  if (p.length >= 8) s++;
  if (p.length >= 12) s++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  if (p.length < 6) return 0;
  return Math.min(4, s);
}
const BAR = ["bg-red-500", "bg-orange-500", "bg-amber-400", "bg-lime-500", "bg-emerald-500"];

// Campo de contraseña con botón para verla y, si se pide, barra de seguridad
export function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  strength = false,
  state,
  hint,
  aside,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  strength?: boolean;
  state?: "ok" | "bad";
  hint?: ReactNode;
  aside?: ReactNode;
}) {
  const { t } = useI18n();
  const [show, setShow] = useState(false);
  const score = passwordScore(value);
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-semibold">
          {label}
        </label>
        {aside}
      </div>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          required
          minLength={6}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={state === "bad" || undefined}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className={`${authInput} pr-11 ${state === "bad" ? "!border-red-500 focus:!ring-red-500/15" : state === "ok" ? "!border-emerald-500" : ""}`}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? t("auth.hide") : t("auth.show")}
          aria-pressed={show}
          className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-xl text-neutral-500 hover:text-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-fg dark:hover:text-white"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {show ? (
              <>
                <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 4.2A9.8 9.8 0 0 1 12 4c5 0 9 4.5 10 8a12.7 12.7 0 0 1-3 4.6M6.6 6.6C4.3 8 2.7 10.2 2 12c1 3.5 5 8 10 8a9.7 9.7 0 0 0 5.4-1.6" />
              </>
            ) : (
              <>
                <path d="M2 12c1-3.5 5-8 10-8s9 4.5 10 8c-1 3.5-5 8-10 8S3 15.5 2 12z" />
                <circle cx="12" cy="12" r="3" />
              </>
            )}
          </svg>
        </button>
      </div>
      {strength && (
        <div className="mt-2 flex items-center gap-3" aria-live="polite">
          <div className="flex flex-1 gap-1" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${value && i < Math.max(1, score) ? BAR[score] : "bg-neutral-200 dark:bg-neutral-800"}`} />
            ))}
          </div>
          <span className="w-24 text-right text-xs font-medium text-neutral-500">{value ? t(`auth.strength${score}` as DictKey) : t("auth.minChars")}</span>
        </div>
      )}
      {hint && (
        <p id={`${id}-hint`} className={`mt-1.5 text-xs font-medium ${state === "bad" ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`} role="status">
          {hint}
        </p>
      )}
    </div>
  );
}
