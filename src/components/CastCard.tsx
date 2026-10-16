"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { img } from "@/lib/tmdb";

export function CastCard({
  id,
  name,
  character,
  profilePath,
}: {
  id: number;
  name: string;
  character: string;
  profilePath: string | null;
}) {
  const reduce = useReducedMotion();
  const face = img(profilePath, "w185");

  return (
    <motion.li
      className="w-28 shrink-0"
      whileHover={reduce ? undefined : { y: -4, scale: 1.08 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <Link
        href={`/persona/${id}`}
        className="group block rounded-xl p-1 text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-fg"
      >
        <div className="relative mx-auto mb-2 aspect-square w-24 overflow-hidden rounded-full bg-neutral-200 ring-2 ring-transparent transition duration-300 group-hover:shadow-hover group-hover:ring-brand-fg dark:bg-neutral-800">
          {face ? (
            <Image src={face} alt={name} fill sizes="96px" className="object-cover" />
          ) : (
            <div className="grid h-full place-items-center text-2xl text-neutral-400" aria-hidden="true">
              {name.charAt(0)}
            </div>
          )}
        </div>
        <p className="line-clamp-1 text-sm font-semibold group-hover:text-brand-fg">{name}</p>
        <p className="line-clamp-1 text-xs text-neutral-500">{character}</p>
      </Link>
    </motion.li>
  );
}
