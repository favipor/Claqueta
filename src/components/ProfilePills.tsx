import Link from "next/link";
import { BellIcon, ListIcon } from "./NavIcons";

type Item = { href: string; label: string; Icon: typeof BellIcon; badge?: number };

// Accesos del perfil con el mismo estilo de pastilla que el menú superior (Películas · Series · Mi lista).
export function ProfilePills({ items }: { items: Item[] }) {
  return (
    <nav
      className="flex items-center gap-0.5 self-center rounded-full bg-neutral-200/70 p-1 sm:self-start dark:bg-neutral-800/80"
      aria-label="Perfil"
    >
      {items.map(({ href, label, Icon, badge }) => (
        <Link
          key={href}
          href={href}
          className="relative flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold text-neutral-700 transition-colors hover:bg-white hover:text-neutral-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-fg dark:text-neutral-200 dark:hover:bg-neutral-700 dark:hover:text-white"
        >
          <Icon className="h-4 w-4" />
          <span>{label}</span>
          {badge ? (
            <span className="min-w-[1.25rem] rounded-full bg-red-500 px-1.5 py-0.5 text-center text-xs font-bold leading-none text-white">
              {badge > 99 ? "99+" : badge}
            </span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}

export { BellIcon, ListIcon };
