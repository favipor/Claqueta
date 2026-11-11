import type { MetadataRoute } from "next";

// Permite instalar Claqueta como app en el móvil y en el ordenador.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Claqueta",
    short_name: "Claqueta",
    description: "Lleva el seguimiento de lo que ves, puntúalo y coméntalo con tus amigos.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a0a",
    theme_color: "#0f766e",
    lang: "es",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
