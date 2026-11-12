import { HomeView } from "@/components/HomeView";

export const metadata = { alternates: { canonical: "/" } };

export default function Home() {
  return <HomeView kind="all" />;
}
