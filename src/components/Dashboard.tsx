"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppHeader } from "./AppHeader";
import { BuildMatchList } from "./BuildMatchList";
import { ImportPanel } from "./ImportPanel";
import { UniqueArt, UniqueChip, UniqueIconProvider } from "./UniqueArt";
import {
  loadFarmWiki,
  loadNinja,
  matchWithFarm,
  type MatchRow,
  type NinjaSnapshot,
} from "@/lib/client/data";
import {
  DEFAULT_MATCH_PREFS,
  loadMatchPrefs,
  saveMatchPrefs,
  type MatchPrefs,
} from "@/lib/client/prefs";
import { importUniques } from "@/lib/client/import";
import {
  DEFAULT_LADDER_MODE,
  DEFAULT_NINJA_MODE,
  LADDER_LABEL,
  ninjaModeForStashSwitch,
  parseLadderMode,
  parseNinjaMode,
  type LadderMode,
  type NinjaMode,
} from "@/lib/leagues/modes";
import { loadInventory, saveInventory } from "@/lib/client/store";
import type { FarmWikiIndex } from "@/lib/farm/types";
import { HIDE_IF_MISSING, hideIfMissingNames } from "@/lib/match/chase";
import { isMustUseUnique } from "@/lib/match/mustUse";
import { filterOptions, NEAR_MISS_FLOOR, type MatchOptions } from "@/lib/match/score";
import type { InventorySnapshot } from "@/lib/types";
import { LeagueSelects } from "./LeagueSelects";

function prefsToOptions(prefs: MatchPrefs): MatchOptions {
  return {
    hideIfMissing: hideIfMissingNames(prefs.hideIfMissing),
    hideForbiddenJewels: prefs.hideForbiddenJewels,
    ignoreRollChase: prefs.ignoreRollChase,
    mustUse: prefs.mustUse || null,
    classFilter: prefs.classFilter || null,
    skillFilter: prefs.skillFilter || null,
  };
}

function HideRow({
  name,
  icon,
  checked,
  onChange,
}: {
  name: string;
  icon: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="hide-row">
      <UniqueArt name={icon} size={26} />
      <span className="min-w-0 flex-1 truncate">
        <span className="text-muted">Hide </span>
        {name}
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="hide-switch" aria-hidden />
    </label>
  );
}

export function Dashboard() {
  const [snapshot, setSnapshot] = useState<InventorySnapshot | null>(null);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [almost, setAlmost] = useState<MatchRow[]>([]);
  const [prefs, setPrefs] = useState<MatchPrefs>(DEFAULT_MATCH_PREFS);
  const [prefsReady, setPrefsReady] = useState(false);
  const [status, setStatus] = useState("Loading stash…");
  const [error, setError] = useState<string | null>(null);
  const [ninjaMeta, setNinjaMeta] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [leagueBusy, setLeagueBusy] = useState(false);
  const [ninja, setNinja] = useState<NinjaSnapshot | null>(null);
  const [wiki, setWiki] = useState<FarmWikiIndex | null>(null);

  const filters = useMemo(
    () => filterOptions(ninja?.clusters ?? []),
    [ninja],
  );

  const applyMatches = useCallback(
    (
      inv: InventorySnapshot,
      ninjaData: NinjaSnapshot,
      wikiData: FarmWikiIndex,
      next: MatchPrefs,
    ) => {
      const split = matchWithFarm(
        inv,
        ninjaData,
        wikiData,
        next.threshold,
        prefsToOptions(next),
      );
      setMatches(split.matches);
      setAlmost(split.almost);
      setNinjaMeta(
        `${ninjaData.clusters.length} ${ninjaData.gggLeague ?? "Allflame"} builds from ${ninjaData.source ?? "snapshot"}`,
      );
    },
    [],
  );

  useEffect(() => {
    setPrefs(loadMatchPrefs());
    setPrefsReady(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const inv = loadInventory();
        const mode = parseNinjaMode(inv?.ninjaMode ?? DEFAULT_NINJA_MODE);
        const [ninjaData, wikiData] = await Promise.all([
          loadNinja(mode),
          loadFarmWiki(),
        ]);
        if (cancelled) return;
        setNinja(ninjaData);
        setWiki(wikiData);
        if (!inv) {
          setShowImport(true);
          setStatus("Import a unique list to match poe.ninja builds");
          setLoadingMatches(false);
          return;
        }
        setSnapshot(inv);
        setStatus(`${inv.uniques.length} unique names · ${inv.league}`);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
          setLoadingMatches(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!prefsReady || !snapshot || !ninja || !wiki) return;
    const expected = parseNinjaMode(snapshot.ninjaMode);
    const loaded = parseNinjaMode(ninja.ninjaMode);
    if (expected !== loaded) return;
    applyMatches(snapshot, ninja, wiki, prefs);
    setLoadingMatches(false);
  }, [prefsReady, snapshot, ninja, wiki, prefs, applyMatches]);

  function updatePrefs(patch: Partial<MatchPrefs>) {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      saveMatchPrefs(next);
      return next;
    });
  }

  async function onImported() {
    const inv = loadInventory();
    if (!inv || !wiki) return;
    setSnapshot(inv);
    setShowImport(false);
    setStatus(`${inv.uniques.length} unique names · ${inv.league}`);
    const ninjaData = await loadNinja(parseNinjaMode(inv.ninjaMode));
    setNinja(ninjaData);
  }

  async function onStashLeague(mode: LadderMode) {
    if (!snapshot || snapshot.ladderMode === mode || leagueBusy) return;
    const ninjaMode = ninjaModeForStashSwitch(mode, snapshot.ninjaMode);
    setError(null);
    if (snapshot.ladderAccount && !snapshot.mock) {
      setLeagueBusy(true);
      setLoadingMatches(true);
      try {
        const inv = await importUniques({
          url: snapshot.ladderAccount,
          ladderMode: mode,
          ninjaMode,
        });
        setSnapshot(inv);
        setStatus(`${inv.uniques.length} unique names · ${inv.league}`);
        setNinja(await loadNinja(ninjaMode));
      } catch (err) {
        setError(err instanceof Error ? err.message : "League switch failed");
      } finally {
        setLeagueBusy(false);
      }
      return;
    }
    const next = {
      ...snapshot,
      ladderMode: mode,
      ninjaMode,
      league: LADDER_LABEL[mode],
      ninjaOverview: ninjaMode,
    };
    setLoadingMatches(true);
    saveInventory(next);
    setSnapshot(next);
    setStatus(`${next.uniques.length} unique names · ${next.league}`);
    setNinja(await loadNinja(ninjaMode));
  }

  async function onNinjaBuilds(mode: NinjaMode) {
    if (!snapshot || snapshot.ninjaMode === mode || leagueBusy) return;
    const next = { ...snapshot, ninjaMode: mode, ninjaOverview: mode };
    setLoadingMatches(true);
    saveInventory(next);
    setSnapshot(next);
    setNinja(await loadNinja(mode));
  }

  const ladderMode = parseLadderMode(snapshot?.ladderMode ?? DEFAULT_LADDER_MODE);
  const ninjaMode = parseNinjaMode(snapshot?.ninjaMode ?? ninja?.ninjaMode ?? DEFAULT_NINJA_MODE);

  const mustUseOptions = useMemo(() => {
    const names = snapshot?.uniques.map((u) => u.name) ?? [];
    if (!wiki) return prefs.mustUse ? [prefs.mustUse] : [];
    const filtered = names.filter((name) => isMustUseUnique(name, wiki));
    if (prefs.mustUse && !filtered.includes(prefs.mustUse)) {
      return [prefs.mustUse, ...filtered];
    }
    return filtered;
  }, [snapshot, wiki, prefs.mustUse]);

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
            {leagueBusy ? (
              <p className="text-sm text-muted">Re-importing that league…</p>
            ) : null}
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

        {snapshot ? (
          <LeagueSelects
            ladderMode={ladderMode}
            ninjaMode={ninjaMode}
            onLadderMode={onStashLeague}
            onNinjaMode={onNinjaBuilds}
            disabled={leagueBusy}
          />
        ) : null}

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
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-xl font-semibold tracking-wide text-gold">
              Builds you can finish
            </h2>
            <label className="flex items-center gap-3 text-sm text-muted">
              Match at least {prefs.threshold}% weighted
              <input
                type="range"
                min={50}
                max={100}
                step={5}
                value={prefs.threshold}
                onChange={(e) => updatePrefs({ threshold: Number(e.target.value) })}
                className="accent-gold"
              />
            </label>
          </div>

          <div className="panel overflow-hidden p-0 lg:grid lg:grid-cols-[minmax(18rem,22rem)_1fr]">
            <div className="border-b border-border lg:border-b-0 lg:border-r lg:border-border">
              {HIDE_IF_MISSING.map((name) => (
                <HideRow
                  key={name}
                  name={name}
                  icon={name}
                  checked={prefs.hideIfMissing[name]}
                  onChange={(checked) =>
                    updatePrefs({
                      hideIfMissing: { ...prefs.hideIfMissing, [name]: checked },
                    })
                  }
                />
              ))}
              <HideRow
                name="Forbidden jewels"
                icon="Forbidden Flesh"
                checked={prefs.hideForbiddenJewels}
                onChange={(checked) => updatePrefs({ hideForbiddenJewels: checked })}
              />
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-2">
            <label className="flex items-start gap-2 text-sm text-foreground sm:col-span-2">
              <input
                type="checkbox"
                checked={prefs.ignoreRollChase}
                onChange={(e) => updatePrefs({ ignoreRollChase: e.target.checked })}
                className="mt-1 accent-gold"
              />
              <span>
                Ignore roll-chase uniques in the %
                <span className="mt-0.5 block text-xs text-muted">
                  Watcher&apos;s Eye, clusters, timeless jewels, and similar. They
                  still show on the build.
                </span>
              </span>
            </label>
            <label className="label-caps block">
              Must-use unique
              <select
                value={prefs.mustUse}
                onChange={(e) => updatePrefs({ mustUse: e.target.value })}
                className="field"
              >
                <option value="">Any unique</option>
                {mustUseOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <span className="mt-0.5 block text-xs font-normal normal-case tracking-normal text-muted">
                T0–T2 and pinnacle boss drops you own.
              </span>
            </label>
            <label className="label-caps block">
              Class
              <select
                value={prefs.classFilter}
                onChange={(e) => updatePrefs({ classFilter: e.target.value })}
                className="field"
              >
                <option value="">All classes</option>
                {filters.classes.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="label-caps block sm:col-span-2">
              Skill
              <select
                value={prefs.skillFilter}
                onChange={(e) => updatePrefs({ skillFilter: e.target.value })}
                className="field"
              >
                <option value="">All skills</option>
                {filters.skills.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            </div>
          </div>

          {loadingMatches ? (
            <p className="text-sm text-muted">Matching builds…</p>
          ) : !snapshot ? (
            <p className="text-sm text-muted">
              Import uniques (or try the demo on the home page) to see matching builds.
            </p>
          ) : ninja && ninja.clusters.length === 0 ? (
            <p className="text-sm text-muted">
              No poe.ninja build snapshot for {ninja.gggLeague ?? ninjaMode} right now.
              Switch to another build league, or wait for the next site refresh.
            </p>
          ) : matches.length === 0 && almost.length === 0 ? (
            <p className="text-sm text-muted">
              No builds at this threshold. Lower the slider, turn off a filter, or
              import a fuller unique list.
            </p>
          ) : (
            <>
              {matches.length === 0 ? (
                <p className="text-sm text-muted">
                  No builds at {prefs.threshold}% weighted. Near-misses are below.
                </p>
              ) : (
                <BuildMatchList
                  rows={matches}
                  openId={openId}
                  onToggleFarm={(id) => setOpenId(openId === id ? null : id)}
                />
              )}
              {almost.length > 0 ? (
                <div className="space-y-3 pt-4">
                  <h3 className="text-lg font-semibold tracking-wide text-gold">
                    Almost ({Math.round(NEAR_MISS_FLOOR * 100)}–{prefs.threshold - 1}% weighted)
                  </h3>
                  <p className="text-sm text-muted">
                    Below the slider, still at least 50%. Same filters as above.
                  </p>
                  <BuildMatchList
                    rows={almost}
                    openId={openId}
                    onToggleFarm={(id) => setOpenId(openId === id ? null : id)}
                  />
                </div>
              ) : null}
            </>
          )}
        </section>
      </main>
    </div>
    </UniqueIconProvider>
  );
}
