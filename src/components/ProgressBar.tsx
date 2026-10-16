"use client";

import { motion, useReducedMotion } from "framer-motion";

// Barra de progreso con los colores de la página y bordes redondeados.
export function ProgressBar({
  value,
  total,
  label,
  className = "",
}: {
  value: number;
  total: number;
  label: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={Math.min(value, total)}
      className={`h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700 ${className}`}
    >
      <motion.div
        className="h-full rounded-full bg-gradient-to-r from-brand to-teal-400"
        initial={reduce ? false : { width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: reduce ? 0 : 0.6, ease: "easeOut" }}
      />
    </div>
  );
}
