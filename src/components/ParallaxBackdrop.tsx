"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

// Imagen de fondo de la ficha: se mueve más despacio que el contenido al hacer scroll.
// El contenedor padre debe tener "relative overflow-hidden".
export function ParallaxBackdrop({ src }: { src: string }) {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 600], [0, reduce ? 0 : 140]);

  return (
    <motion.div style={{ y }} className="absolute -top-36 -bottom-36 left-0 right-0">
      {/* En el móvil se pide la versión de 780 px en vez de la de 1280 */}
      <picture>
        <source media="(min-width: 800px)" srcSet={src} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src.replace("/w1280/", "/w780/")} alt="" fetchPriority="high" decoding="async" className="absolute inset-0 h-full w-full object-cover opacity-30" />
      </picture>
    </motion.div>
  );
}
