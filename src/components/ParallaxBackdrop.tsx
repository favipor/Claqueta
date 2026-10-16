"use client";

import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

// Imagen de fondo de la ficha: se mueve más despacio que el contenido al hacer scroll.
// El contenedor padre debe tener "relative overflow-hidden".
export function ParallaxBackdrop({ src }: { src: string }) {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 600], [0, reduce ? 0 : 140]);

  return (
    <motion.div style={{ y }} className="absolute -top-36 -bottom-36 left-0 right-0">
      <Image src={src} alt="" fill priority sizes="100vw" className="object-cover opacity-30" />
    </motion.div>
  );
}
