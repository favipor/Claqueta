import Link from "next/link";
import { getT } from "@/lib/i18n-server";

// Pestañas de la sección Amigos: actividad, ver juntos y descubrir gente
export async function FriendsTabs({ current }: { current: "feed" | "together" | "challenges" | "people" }) {
  const { t } = await getT();
  const tabs = [
    { id: "feed", href: "/actividad", label: t("act.tabFeed") },
    { id: "together", href: "/juntos", label: t("together.tab") },
    { id: "challenges", href: "/retos", label: t("together.retos") },
    { id: "people", href: "/descubrir", label: t("act.tabPeople") },
  ] as const;
  return (
    <nav className="no-scrollbar flex max-w-full overflow-x-auto rounded-xl bg-neutral-100 p-1 text-sm font-semibold dark:bg-neutral-800" aria-label={t("nav.friends")}>
      {tabs.map((tab) =>
        tab.id === current ? (
          <span key={tab.id} aria-current="page" className="shrink-0 rounded-lg bg-white px-3 py-1.5 shadow ring-1 ring-black/5 dark:bg-neutral-950 dark:ring-white/10">
            {tab.label}
          </span>
        ) : (
          <Link key={tab.id} href={tab.href} className="shrink-0 rounded-lg px-3 py-1.5 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200">
            {tab.label}
          </Link>
        )
      )}
    </nav>
  );
}
