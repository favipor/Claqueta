import type { ReactNode } from "react";

export const metadata = { title: "Nueva contraseña", robots: { index: false } };

export default function ResetLayout({ children }: { children: ReactNode }) {
  return children;
}
