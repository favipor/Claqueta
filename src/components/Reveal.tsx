"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

// Hace que el contenido aparezca suavemente al hacer scroll (respeta "reducir animaciones").
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay }}
    >
      {children}
    </motion.div>
  );
}
