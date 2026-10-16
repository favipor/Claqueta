"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { followUser, unfollowUser } from "@/app/profile-actions";
import { useI18n } from "./I18nProvider";

type Rel = "none" | "pending" | "accepted";

export function FollowButton({
  targetId,
  initial,
  loggedIn,
}: {
  targetId: string;
  initial: Rel;
  loggedIn: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [rel, setRel] = useState<Rel>(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);

  const base =
    "rounded-full px-5 py-2 text-sm font-bold transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-fg disabled:opacity-60";

  if (!loggedIn) {
    return (
      <Link href="/login" className={`${base} bg-brand text-white hover:bg-brand-dark`}>
        {t("profile.follow")}
      </Link>
    );
  }

  function click() {
    setError(false);
    const prev = rel;
    startTransition(async () => {
      if (prev === "none") {
        const res = await followUser(targetId);
        if (res.ok && res.status) setRel(res.status);
        else setError(true);
      } else {
        const res = await unfollowUser(targetId);
        if (res.ok) setRel("none");
        else setError(true);
      }
      router.refresh();
    });
  }

  const label =
    rel === "none"
      ? t("profile.follow")
      : rel === "pending"
        ? t("profile.requested")
        : t("profile.followingBtn");

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={click}
        disabled={pending}
        aria-pressed={rel !== "none"}
        title={rel === "none" ? undefined : t("profile.unfollow")}
        className={`${base} ${
          rel === "none"
            ? "bg-brand text-white hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-hover"
            : "border border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
        }`}
      >
        {label}
      </button>
      {error && (
        <span role="alert" className="text-xs text-red-600 dark:text-red-400">
          {t("profile.actionError")}
        </span>
      )}
    </span>
  );
}
