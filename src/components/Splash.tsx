"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ClapperIcon } from "./ClapperIcon";

type Phase = "idle" | "clap" | "fly" | "done";

/**
 * Intro de bienvenida: el logo aparece grande, da dos "claps" y vuela hasta su sitio en el menú.
 * - Solo se muestra una vez por sesión del navegador.
 * - No se muestra si el usuario tiene activado "reducir movimiento".
 * - Se puede saltar haciendo clic.
 * La decisión de mostrarla la toma un script en <head> (data-splash en <html>) para evitar parpadeos.
 */
export function Splash() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [target, setTarget] = useState({ x: 0, y: 0 });
  const logoRef = useRef<HTMLDivElement>(null);

  function finish() {
    try {
      sessionStorage.setItem("splash", "1");
    } catch {}
    document.documentElement.removeAttribute("data-splash");
    setPhase("done");
  }

  useEffect(() => {
    if (document.documentElement.dataset.splash !== "1") {
      setPhase("done");
      return;
    }
    setPhase("clap");

    const flyTimer = setTimeout(() => {
      const nav = document.getElementById("nav-logo");
      const el = logoRef.current;
      if (nav && el) {
        const a = el.getBoundingClientRect();
        const b = nav.getBoundingClientRect();
        setTarget({
          x: b.left + b.width / 2 - (a.left + a.width / 2),
          y: b.top + b.height / 2 - (a.top + a.height / 2),
        });
      }
      setPhase("fly");
    }, 1500);
    const endTimer = setTimeout(finish, 2400);

    return () => {
      clearTimeout(flyTimer);
      clearTimeout(endTimer);
    };
  }, []);

  if (phase === "done") return null;

  return (
    <motion.div
      aria-hidden="true"
      onClick={finish}
      initial={false}
      animate={{ opacity: phase === "fly" ? 0 : 1 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="splash-overlay fixed inset-0 z-[100] cursor-pointer items-center justify-center bg-neutral-50 dark:bg-neutral-950"
    >
      <motion.div
        ref={logoRef}
        initial={false}
        animate={
          phase === "fly"
            ? { x: target.x, y: target.y, scale: 1 }
            : { x: 0, y: 0, scale: 2.6 }
        }
        transition={{ duration: 0.8, ease: [0.65, 0, 0.35, 1] }}
        className={`flex items-center gap-2 font-extrabold tracking-tight text-brand-fg ${
          phase === "clap" ? "clap-active" : ""
        }`}
      >
        <ClapperIcon className="h-8 w-8" />
        <span className="text-2xl">Claqueta</span>
      </motion.div>
    </motion.div>
  );
}
