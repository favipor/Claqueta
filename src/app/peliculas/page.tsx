import type { Metadata } from "next";
import { HomeView } from "@/components/HomeView";
import { getT } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t("nav.movies"),
    description: "Catálogo de películas: tendencias, mejor valoradas y estrenos. Márcalas, puntúalas y compártelas en Claqueta.",
    alternates: { canonical: "/peliculas" },
  };
}

export default function MoviesPage() {
  return <HomeView kind="movie" />;
}
