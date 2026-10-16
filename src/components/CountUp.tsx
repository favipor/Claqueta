"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";
import { useI18n } from "./I18nProvider";

// Número que "cuenta" desde 0 hasta su valor cuando aparece en pantalla.
// Los lectores de pantalla leen siempre el valor final.
export function CountUp({
  value,
  decimals = 0,
  duration = 1.2,
}: {
  value: number;
  decimals?: number;
  duration?: number;
}) {
  const { lang } = useI18n();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();

  const fmt = (v: number) =>
    v.toLocaleString(lang === "en" ? "en-US" : "es-ES", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

  const [shown, setShown] = useState(fmt(0));

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setShown(fmt(value));
      return;
    }
    const controls = animate(0, value, {
      duration,
      ease: "easeOut",
      onUpdate: (v) => setShown(fmt(v)),
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, value, reduce, lang]);

  return (
    <span ref={ref}>
      <span aria-hidden="true">{shown}</span>
      <span className="sr-only">{fmt(value)}</span>
    </span>
  );
}
