import Link from "next/link";
import { getT } from "@/lib/i18n-server";
import { ClapperIcon } from "@/components/ClapperIcon";

export const metadata = { title: "No encontrado" };

// Página 404: título, perfil o dirección que no existe
export default async function NotFound() {
  const { t } = await getT();
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
      <span className="grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-brand to-teal-400 text-white shadow-lg">
        <ClapperIcon className="h-11 w-11" />
      </span>
      <p className="mt-6 text-6xl font-extrabold tracking-tight text-brand-fg">404</p>
      <h1 className="mt-2 text-2xl font-bold">{t("err.notFoundTitle")}</h1>
      <p className="mt-2 text-neutral-500">{t("err.notFoundText")}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/" className="rounded-full bg-brand px-6 py-2.5 text-sm font-bold text-white shadow hover:bg-brand-dark">
          {t("err.home")}
        </Link>
        <Link href="/buscar" className="rounded-full border border-neutral-300 px-6 py-2.5 text-sm font-bold hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800">
          {t("err.search")}
        </Link>
      </div>
    </div>
  );
}
