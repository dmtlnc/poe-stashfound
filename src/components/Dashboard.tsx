"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "./AppHeader";
import { FarmList } from "./FarmList";
import { ImportPanel } from "./ImportPanel";
import { UniqueChip, UniqueIconProvider } from "./UniqueArt";
import {
  loadFarmWiki,
  loadNinja,
  matchWithFarm,
  type MatchRow,
  type NinjaSnapshot,
} from "@/lib/client/data";
import { loadInventory } from "@/lib/client/store";
import type { FarmWikiIndex } from "@/lib/farm/types";
import type { InventorySnapshot } from "@/lib/types";

export function Dashboard() {
  const [snapshot, setSnapshot] = useState<InventorySnapshot | null>(null);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [threshold, setThreshold] = useState(70);
  const [status, setStatus] = useState("Loading stash…");
  const [error, setError] = useState<string | null>(null);
  const [ninjaMeta, setNinjaMeta] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [ninja, setNinja] = useState<NinjaSnapshot | null>(null);
  const [wiki, setWiki] = useState<FarmWikiIndex | null>(null);

  const applyMatches = useCallback(
    (inv: InventorySnapshot, ninjaData: NinjaSnapshot, wikiData: FarmWikiIndex, pct: number) => {
      setMatches(matchWithFarm(inv, ninjaData, wikiData, pct));
      setNinjaMeta(
        `${ninjaData.clusters.length} ${ninjaData.gggLeague ?? "Allflame"} builds from ${ninjaData.source ?? "snapshot"}`,
      );
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [inv, ninjaData, wikiData] = await Promise.all([
          Promise.resolve(loadInventory()),
          loadNinja(),
          loadFarmWiki(),
        ]);
        if (cancelled) return;
        setNinja(ninjaData);
        setWiki(wikiData);
        if (!inv) {
          setShowImport(true);
          setStatus("Import a unique list to match Allflame builds");
          setLoadingMatches(false);
          return;
        }
        setSnapshot(inv);
        applyMatches(inv, ninjaData, wikiData, threshold);
        setStatus(`${inv.uniques.length} unique names · ${inv.league}`);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        if (!cancelled) setLoadingMatches(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // initial load only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onThreshold(pct: number) {
    setThreshold(pct);
    if (snapshot && ninja && wiki) applyMatches(snapshot, ninja, wiki, pct);
  }

  async function onImported() {
    const inv = loadInventory();
    if (!inv || !ninja || !wiki) return;
    setSnapshot(inv);
    setShowImport(false);
    applyMatches(inv, ninja, wiki, threshold);
    setStatus(`${inv.uniques.length} unique names · ${inv.league}`);
  }

  return (
    <UniqueIconProvider>
    <div className="flex flex-1 flex-col">
      <AppHeader accountName={snapshot?.accountName ?? "Exile"} mock={Boolean(snapshot?.mock)} />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="label-caps mb-1">Exile stash</p>
            <h1 className="text-gold-title text-3xl font-semibold tracking-wide">
              Your SSF uniques
            </h1>
            <p className="mt-2 text-sm text-muted">{status}</p>
            {ninjaMeta ? <p className="text-sm text-muted">{ninjaMeta}</p> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowImport((v) => !v)}
              className="btn-outline"
            >
              {showImport ? "Hide import" : snapshot ? "Replace list" : "Import list"}
            </button>
          </div>
        </div>

        {showImport ? <ImportPanel compact onImported={onImported} /> : null}

        {error ? (
          <p className="panel px-4 py-3 text-sm text-danger">
            {error}
          </p>
        ) : null}

        {snapshot ? (
          <section className="panel p-4">
            <p className="label-caps mb-3">
              {snapshot.uniques.length} unique names · {snapshot.characterCount}{" "}
              characters · {snapshot.tabCount} stash tabs · {snapshot.league}
            </p>
            <div className="mt-1 flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
              {snapshot.uniques.map((u) => (
                <UniqueChip
                  key={u.name}
                  name={u.name}
                  src={u.icon}
                  count={u.count}
                  title={u.sources.map((s) => s.label).join(", ")}
                />
              ))}
            </div>
          </section>
        ) : null}

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-semibold tracking-wide text-gold">
              Builds you can finish
            </h2>
            <label className="flex items-center gap-3 text-sm text-muted">
              Match at least {threshold}%
              <input
                type="range"
                min={60}
                max={100}
                step={5}
                value={threshold}
                onChange={(e) => onThreshold(Number(e.target.value))}
                className="accent-gold"
              />
            </label>
          </div>
          {loadingMatches ? (
            <p className="text-sm text-muted">Matching builds…</p>
          ) : matches.length === 0 && snapshot ? (
            <p className="text-sm text-muted">
              No builds at this threshold. Lower the slider or import a fuller unique list.
            </p>
          ) : !snapshot ? (
            <p className="text-sm text-muted">
              Import uniques (or try the demo on the home page) to see matching Allflame builds.
            </p>
          ) : (
            <ul className="space-y-3">
              {matches.map((row) => (
                <li key={row.cluster.id} className="panel p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-lg tracking-wide">
                        <span className="text-gold-bright">
                          {row.cluster.mainSkill ?? "Unknown skill"}
                        </span>{" "}
                        <span className="text-muted">
                          {row.cluster.ascendancy || row.cluster.className}
                        </span>
                      </p>
                      <p className="text-sm text-muted">
                        {Math.round(row.score * 100)}% unique overlap ·{" "}
                        {row.owned.length}/{row.cluster.uniqueNames.length} owned ·{" "}
                        {row.cluster.characterCount} ninja characters
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenId(openId === row.cluster.id ? null : row.cluster.id)
                        }
                        className="btn-outline h-9 px-3 text-[0.7rem]"
                      >
                        {openId === row.cluster.id ? "Hide farm" : "Farm missing"}
                      </button>
                      <Link
                        href={`/app/builds/${row.cluster.id}`}
                        className="btn-gold h-9 px-3 text-[0.7rem]"
                      >
                        Details
                      </Link>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {row.cluster.uniqueNames.map((name) => (
                      <UniqueChip
                        key={name}
                        name={name}
                        owned={row.owned.includes(name)}
                      />
                    ))}
                  </div>
                  {row.variantWarnings.length > 0 ? (
                    <p className="mt-3 text-xs text-unique">
                      Roll-dependent: {row.variantWarnings.join(", ")}. Owning the
                      name is not the same as owning the right mods.
                    </p>
                  ) : null}
                  {openId === row.cluster.id ? (
                    <div className="mt-4">
                      <FarmList hints={row.farm} />
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
    </UniqueIconProvider>
  );
}
