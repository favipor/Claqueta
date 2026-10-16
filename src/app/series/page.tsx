import type { Metadata } from "next";
import { HomeView } from "@/components/HomeView";
import { getT } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("nav.series") };
}

export default function SeriesPage() {
  return <HomeView kind="tv" />;
}
