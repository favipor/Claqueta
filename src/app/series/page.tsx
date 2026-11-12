import type { Metadata } from "next";
import { HomeView } from "@/components/HomeView";
import { getT } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t("nav.series"),
    description: "Catálogo de series: tendencias, mejor valoradas y estrenos. Lleva tus capítulos al día en Claqueta.",
    alternates: { canonical: "/series" },
  };
}

export default function SeriesPage() {
  return <HomeView kind="tv" />;
}
