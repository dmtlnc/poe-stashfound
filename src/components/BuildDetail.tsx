"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "./AppHeader";
import { FarmList } from "./FarmList";
import { UniqueArt, UniqueIconProvider } from "./UniqueArt";
import { loadFarmWiki, loadNinja, matchOne } from "@/lib/client/data";
import { loadInventory } from "@/lib/client/store";
import { loadMatchPrefs } from "@/lib/client/prefs";
import { ninjaModeFromClusterId } from "@/lib/leagues/modes";
import type { BuildCluster, FarmHint, InventorySnapshot, MatchResult } from "@/lib/types";
import { BuildOutboundLinks } from "./BuildOutboundLinks";

export function BuildDetail({ id }: { id: string }) {
  const [cluster, setCluster] = useState<BuildCluster | null>(null);
  const [match, setMatch] = useState<MatchResult | null>(null);
  const [farm, setFarm] = useState<FarmHint[]>([]);
  const [snapshot, setSnapshot] = useState<InventorySnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [ninja, wiki, inv] = await Promise.all([
          loadNinja(ninjaModeFromClusterId(id)),
          loadFarmWiki(),
          Promise.resolve(loadInventory()),
        ]);
        if (cancelled) return;
        const found = ninja.clusters.find((c) => c.id === id);
        if (!found) {
          setError("Build not found");
          return;
        }
        const scored = matchOne(inv, found, wiki, {
          ignoreRollChase: loadMatchPrefs().ignoreRollChase,
        });
        setCluster(found);
        setMatch(scored.match);
        setFarm(scored.farm);
        setSnapshot(inv);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <UniqueIconProvider>
    <div className="flex flex-1 flex-col">
      <AppHeader accountName={snapshot?.accountName ?? "Exile"} mock={Boolean(snapshot?.mock)} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-8">
        <Link href="/app" className="label-caps text-gold hover:text-gold-bright">
          ← All builds
        </Link>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        {!cluster && !error ? <p className="text-sm text-muted">Loading…</p> : null}
        {cluster ? (
          <>
            <div>
              <h1 className="text-3xl font-semibold tracking-wide">
                <span className="text-gold-title">{cluster.mainSkill ?? "Build"}</span>{" "}
                <span className="text-muted">
                  {cluster.ascendancy || cluster.className}
                </span>
              </h1>
              <p className="mt-2 text-sm text-muted">
                {match
                  ? match.nameTotal === 0
                    ? "Roll-chase uniques only · "
                    : `${Math.round(match.score * 100)}% weighted · ${match.nameHits}/${match.nameTotal} names · `
                  : ""}
                {cluster.characterCount} ninja characters · example{" "}
                {cluster.example.name} (lvl {cluster.example.level})
              </p>
              <div className="mt-3">
                <BuildOutboundLinks cluster={cluster} />
              </div>
            </div>
            {match?.variantWarnings.length ? (
              <p className="panel px-4 py-3 text-sm text-unique">
                Roll-dependent uniques on this build: {match.variantWarnings.join(", ")}.
                Check the mods before you commit.
              </p>
            ) : null}
            <section>
              <h2 className="mb-3 text-lg font-medium tracking-wide text-gold">
                Unique checklist
              </h2>
              <ul className="space-y-2">
                {cluster.uniqueNames.map((name) => {
                  const have = match?.owned.includes(name);
                  return (
                    <li
                      key={name}
                      className="inset-row flex items-center justify-between gap-3 px-3 py-2 text-sm"
                    >
                      <span className={`flex items-center gap-2 ${have ? "text-unique" : "text-muted"}`}>
                        <UniqueArt name={name} size={28} />
                        {name}
                      </span>
                      <span className={`label-caps ${have ? "text-unique" : "text-muted"}`}>
                        {have ? "Owned" : "Missing"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
            <section>
              <h2 className="mb-3 text-lg font-medium tracking-wide text-gold">
                How to farm the rest
              </h2>
              <FarmList hints={farm} />
            </section>
          </>
        ) : null}
      </main>
    </div>
    </UniqueIconProvider>
  );
}
