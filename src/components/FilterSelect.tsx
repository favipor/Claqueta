"use client";

import type { ReactNode } from "react";

// Desplegable compacto con icono a la izquierda y flecha a la derecha. Ocupa todo el ancho
// disponible (en el móvil se colocan de dos en dos) y recorta el texto si no cabe.
export function FilterSelect({
  label,
  icon,
  value,
  onChange,
  children,
  className = "",
}: {
  label: string;
  icon: "sort" | "genre";
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label
      className={`relative flex min-w-0 items-center rounded-xl bg-neutral-100 text-sm transition-colors focus-within:ring-2 focus-within:ring-brand-fg hover:bg-neutral-200/80 dark:bg-neutral-800 dark:hover:bg-neutral-700/80 ${className}`}
    >
      <span className="sr-only">{label}</span>
      <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 h-4 w-4 shrink-0 text-brand-fg" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {icon === "sort" ? (
          <path d="M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4" />
        ) : (
          <>
            <path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z" />
            <circle cx="7.5" cy="7.5" r="1.5" />
          </>
        )}
      </svg>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        title={label}
        className="w-full min-w-0 cursor-pointer appearance-none truncate bg-transparent py-2.5 pl-9 pr-8 font-semibold text-neutral-900 outline-none dark:text-neutral-100 sm:py-2 [&>option]:bg-white [&>option]:text-neutral-900 dark:[&>option]:bg-neutral-900 dark:[&>option]:text-neutral-100"
      >
        {children}
      </select>
      <svg viewBox="0 0 24 24" className="pointer-events-none absolute right-2.5 h-4 w-4 text-neutral-500" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m6 9 6 6 6-6" />
      </svg>
    </label>
  );
}
