"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import readXlsxFile, { readSheetNames } from "read-excel-file";
import { importBatch, matchBatch } from "@/app/import-actions";
import { img } from "@/lib/tmdb";
import { parseTable } from "@/lib/import-parse";
import { groupItems } from "@/lib/import-group";
import type { ImportRow, MatchQuery, MatchResult } from "@/lib/import-types";
import { useI18n } from "./I18nProvider";
import { ProgressBar } from "./ProgressBar";

type Stage = "idle" | "parsing" | "matching" | "review" | "importing" | "done";

export function ImportWizard() {
  const { t } = useI18n();
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [results, setResults] = useState<Record<string, MatchResult>>({});
  const [selection, setSelection] = useState<Record<string, number>>({});
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [showAll, setShowAll] = useState(false);
  const [summary, setSummary] = useState({ imported: 0, skipped: 0, failed: [] as string[] });

  const byKey = useMemo(() => {
    const m = new Map<string, ImportRow[]>();
    for (const r of rows) m.set(r.qkey, [...(m.get(r.qkey) ?? []), r]);
    return m;
  }, [rows]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setStage("parsing");

    let parsed: ImportRow[] | null = null;
    try {
      for (const sheet of await readSheetNames(file)) {
        const table = (await readXlsxFile(file, { sheet })) as unknown[][];
        const r = parseTable(table);
        if (r && r.length > 0) {
          parsed = r;
          break;
        }
      }
    } catch {
      parsed = null;
    }
    if (!parsed) {
      setError(t("imp.noSheet"));
      setStage("idle");
      return;
    }
    setRows(parsed);
    await match(parsed);
  }

  async function match(list: ImportRow[]) {
    const uniq = new Map<string, MatchQuery>();
    for (const r of list) {
      if (!uniq.has(r.qkey)) {
        uniq.set(r.qkey, { qkey: r.qkey, query: r.query, alt: r.alt, year: r.year, hint: r.hint });
      }
    }
    const queries = [...uniq.values()];
    setProgress({ done: 0, total: queries.length });
    setStage("matching");

    const out: Record<string, MatchResult> = {};
    const STEP = 8;
    for (let i = 0; i < queries.length; i += STEP) {
      try {
        const res = await matchBatch(queries.slice(i, i + STEP));
        for (const r of res) out[r.qkey] = r;
      } catch {
        // las que fallen quedan "sin resultado" y se pueden saltar
      }
      setProgress({ done: Math.min(i + STEP, queries.length), total: queries.length });
    }
    for (const q of queries) out[q.qkey] ??= { qkey: q.qkey, candidates: [], auto: false };

    // Selección inicial: las claras entran; las dudosas solo si la mejor se parece bastante
    const sel: Record<string, number> = {};
    for (const q of queries) {
      const r = out[q.qkey];
      sel[q.qkey] = r.auto || (r.candidates[0] && r.candidates[0].score >= 0.75) ? 0 : -1;
    }
    setResults(out);
    setSelection(sel);
    setStage("review");
  }

  const keys = [...byKey.keys()];
  const clearKeys = keys.filter((k) => results[k]?.auto);
  const reviewKeys = keys.filter((k) => !results[k]?.auto && (results[k]?.candidates.length ?? 0) > 0);
  const noneKeys = keys.filter((k) => (results[k]?.candidates.length ?? 0) === 0);
  const shownKeys = showAll ? keys : [...reviewKeys, ...noneKeys];

  const items = useMemo(
    () =>
      groupItems(rows, (qkey) => {
        const idx = selection[qkey];
        if (idx === undefined || idx < 0) return null;
        return results[qkey]?.candidates[idx] ?? null;
      }),
    [rows, selection, results]
  );

  async function runImport() {
    setStage("importing");
    setProgress({ done: 0, total: items.length });
    const total = { imported: 0, skipped: 0, failed: [] as string[] };
    const STEP = 3;
    for (let i = 0; i < items.length; i += STEP) {
      const part = items.slice(i, i + STEP);
      try {
        const r = await importBatch(part);
        total.imported += r.imported;
        total.skipped += r.skipped;
        total.failed.push(...r.failed);
      } catch {
        total.failed.push(...part.map((p) => p.title));
      }
      setProgress({ done: Math.min(i + STEP, items.length), total: items.length });
    }
    setSummary(total);
    setStage("done");
  }

  function reset() {
    setRows([]);
    setResults({});
    setSelection({});
    setStage("idle");
    setShowAll(false);
  }

  const card =
    "rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900";
  const kindLabel = (k: "movie" | "tv") => (k === "movie" ? t("kind.movie") : t("kind.tv"));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">{t("imp.title")}</h1>
        <p className="mt-1 text-sm text-neutral-500">{t("imp.intro")}</p>
      </div>

      {(stage === "idle" || stage === "parsing") && (
        <section className={`${card} space-y-4`}>
          <label
            htmlFor="xlsx"
            className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-neutral-300 p-10 text-center transition hover:border-brand-fg hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800/50"
          >
            <span className="text-3xl" aria-hidden="true">
              📄
            </span>
            <span className="font-semibold">
              {stage === "parsing" ? t("imp.parsing") : t("imp.choose")}
            </span>
            <span className="text-xs text-neutral-500">.xlsx</span>
          </label>
          <input
            id="xlsx"
            type="file"
            accept=".xlsx"
            onChange={onFile}
            disabled={stage === "parsing"}
            className="sr-only"
          />
          {error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          <details className="text-sm text-neutral-600 dark:text-neutral-400">
            <summary className="cursor-pointer font-medium">{t("imp.rulesTitle")}</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>{t("imp.rule1")}</li>
              <li>{t("imp.rule2")}</li>
              <li>{t("imp.rule3")}</li>
              <li>{t("imp.rule4")}</li>
            </ul>
          </details>
        </section>
      )}

      {(stage === "matching" || stage === "importing") && (
        <section className={`${card} space-y-3`} aria-live="polite">
          <p className="font-semibold">
            {stage === "matching" ? t("imp.matching") : t("imp.importing")}
          </p>
          <ProgressBar value={progress.done} total={progress.total} label={t("tv.progress")} />
          <p className="text-sm text-neutral-500">
            {progress.done} {t("tv.of")} {progress.total}
          </p>
        </section>
      )}

      {stage === "review" && (
        <>
          <section className={`${card} space-y-3`}>
            <p className="text-sm">
              <strong>{rows.length}</strong> {t("imp.rows")} · <strong>{clearKeys.length}</strong>{" "}
              {t("imp.clear")} · <strong>{reviewKeys.length}</strong> {t("imp.toReview")} ·{" "}
              <strong>{noneKeys.length}</strong> {t("imp.none")}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="rounded-full border border-neutral-300 px-4 py-1.5 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                {showAll ? t("imp.showReview") : t("imp.showAll")}
              </button>
              <button
                type="button"
                onClick={runImport}
                disabled={items.length === 0}
                className="rounded-full bg-brand px-6 py-2 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-hover disabled:opacity-50"
              >
                {t("imp.start")} ({items.length})
              </button>
              <button type="button" onClick={reset} className="text-sm text-neutral-500 underline">
                {t("imp.again")}
              </button>
            </div>
          </section>

          {shownKeys.length === 0 ? (
            <p className="py-6 text-center text-neutral-500">{t("imp.allClear")}</p>
          ) : (
            <ul className="space-y-3">
              {shownKeys.map((k) => {
                const res = results[k];
                const list = byKey.get(k) ?? [];
                const idx = selection[k] ?? -1;
                const chosen = idx >= 0 ? res?.candidates[idx] : undefined;
                const poster = chosen ? img(chosen.poster_path, "w92") : null;

                return (
                  <li key={k} className={`${card} flex flex-col gap-3 sm:flex-row sm:items-center`}>
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="text-xs uppercase tracking-wide text-neutral-500">
                        {t("imp.original")}
                      </p>
                      {list.map((r) => (
                        <p key={r.id} className="truncate font-medium">
                          {r.raw.name}
                          <span className="font-normal text-neutral-500">
                            {" "}
                            · {r.raw.type} · {r.raw.status}
                            {r.rating !== null ? ` · ★ ${r.rating}` : ""}
                          </span>
                        </p>
                      ))}
                    </div>

                    <div className="flex items-center gap-3 sm:w-80">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {poster ? (
                        <img src={poster} alt="" className="h-16 w-11 shrink-0 rounded object-cover" />
                      ) : (
                        <span className="grid h-16 w-11 shrink-0 place-items-center rounded bg-neutral-200 text-xs text-neutral-500 dark:bg-neutral-800">
                          —
                        </span>
                      )}
                      <select
                        aria-label={`${t("imp.original")}: ${list[0]?.raw.name ?? ""}`}
                        value={idx}
                        onChange={(e) => setSelection((s) => ({ ...s, [k]: Number(e.target.value) }))}
                        className="w-full min-w-0 rounded-lg border border-neutral-300 bg-white px-2 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950"
                      >
                        <option value={-1}>{t("imp.skip")}</option>
                        {(res?.candidates ?? []).map((c, i) => (
                          <option key={`${c.media_type}-${c.id}`} value={i}>
                            {c.title} ({c.year || "—"}) · {kindLabel(c.media_type)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {stage === "done" && (
        <section className={`${card} space-y-3 text-center`}>
          <p className="text-3xl" aria-hidden="true">
            🎬
          </p>
          <h2 className="text-xl font-bold">{t("imp.done")}</h2>
          <p className="text-sm">
            <strong>{summary.imported}</strong> {t("imp.imported")} · <strong>{summary.skipped}</strong>{" "}
            {t("imp.skipped")} · <strong>{summary.failed.length}</strong> {t("imp.failed")}
          </p>
          {summary.failed.length > 0 && (
            <p className="text-xs text-red-600 dark:text-red-400">{summary.failed.join(", ")}</p>
          )}
          <Link
            href="/mi-lista"
            className="inline-block rounded-full bg-brand px-6 py-2 text-sm font-bold text-white hover:bg-brand-dark"
          >
            {t("imp.goList")}
          </Link>
        </section>
      )}
    </div>
  );
}
