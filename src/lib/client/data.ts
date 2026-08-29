import fallback from "@/data/ninja-fallback.json";
import { farmHintsForNames } from "@/lib/farm/catalog";
import { EMPTY_FARM_WIKI, type FarmWikiIndex } from "@/lib/farm/types";
import {
  DEFAULT_NINJA_MODE,
  ninjaDataPath,
  type NinjaMode,
} from "@/lib/leagues/modes";
import {
  DEFAULT_MATCH_OPTIONS,
  matchBuilds,
  splitByThreshold,
  type MatchOptions,
} from "@/lib/match/score";
import type { BuildCluster, FarmHint, InventorySnapshot, MatchResult } from "@/lib/types";
import { publicUrl } from "./base";

export type NinjaSnapshot = {
  fetchedAt?: string;
  gggLeague?: string;
  ninjaOverview?: string;
  ninjaMode?: NinjaMode;
  source?: string;
  clusters: BuildCluster[];
};

export type MatchRow = MatchResult & { farm: FarmHint[] };

function withFarm(rows: MatchResult[], wiki: FarmWikiIndex): MatchRow[] {
  return rows.map((m) => ({ ...m, farm: farmHintsForNames(m.missing, wiki) }));
}

const ninjaMemory = new Map<NinjaMode, NinjaSnapshot>();
const ninjaInflight = new Map<NinjaMode, Promise<NinjaSnapshot>>();
let wikiMemory: FarmWikiIndex | null = null;
let wikiInflight: Promise<FarmWikiIndex> | null = null;

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(publicUrl(path));
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function fallbackSnapshot(mode: NinjaMode): NinjaSnapshot {
  if (mode !== DEFAULT_NINJA_MODE) {
    return {
      gggLeague: mode,
      ninjaOverview: mode,
      ninjaMode: mode,
      source: "unavailable",
      clusters: [],
    };
  }
  return {
    gggLeague: "Allflame",
    ninjaOverview: "allflame",
    ninjaMode: DEFAULT_NINJA_MODE,
    source: "fallback",
    clusters: fallback.clusters as BuildCluster[],
  };
}

export async function loadNinja(
  mode: NinjaMode = DEFAULT_NINJA_MODE,
): Promise<NinjaSnapshot> {
  const cached = ninjaMemory.get(mode);
  if (cached) return cached;
  let inflight = ninjaInflight.get(mode);
  if (!inflight) {
    inflight = (async () => {
      const data = await getJson<NinjaSnapshot>(ninjaDataPath(mode));
      const snapshot: NinjaSnapshot = data?.clusters?.length
        ? {
            fetchedAt: data.fetchedAt,
            gggLeague: data.gggLeague,
            ninjaOverview: data.ninjaOverview ?? mode,
            ninjaMode: data.ninjaMode ?? mode,
            source: data.source ?? "ninja",
            clusters: data.clusters,
          }
        : fallbackSnapshot(mode);
      ninjaMemory.set(mode, snapshot);
      return snapshot;
    })().finally(() => {
      ninjaInflight.delete(mode);
    });
    ninjaInflight.set(mode, inflight);
  }
  return inflight;
}

export async function loadFarmWiki(): Promise<FarmWikiIndex> {
  if (wikiMemory) return wikiMemory;
  wikiInflight ??= (async () => {
    const data = await getJson<FarmWikiIndex>("/data/farm-wiki.json");
    wikiMemory = data?.uniques ? data : EMPTY_FARM_WIKI;
    return wikiMemory;
  })();
  return wikiInflight;
}

export function matchWithFarm(
  snapshot: InventorySnapshot,
  ninja: NinjaSnapshot,
  wiki: FarmWikiIndex,
  thresholdPct: number,
  options: MatchOptions = DEFAULT_MATCH_OPTIONS,
): { matches: MatchRow[]; almost: MatchRow[] } {
  const threshold = thresholdPct > 1 ? thresholdPct / 100 : thresholdPct;
  const scored = matchBuilds(
    snapshot.uniques.map((u) => u.name),
    ninja.clusters,
    wiki,
    options,
  );
  const split = splitByThreshold(scored, threshold);
  return {
    matches: withFarm(split.matches, wiki),
    almost: withFarm(split.almost, wiki),
  };
}

export function matchOne(
  snapshot: InventorySnapshot | null,
  cluster: BuildCluster,
  wiki: FarmWikiIndex,
  options: Pick<MatchOptions, "ignoreRollChase"> = {
    ignoreRollChase: true,
  },
): { match: MatchResult | null; farm: FarmHint[] } {
  const owned = new Set(snapshot?.uniques.map((u) => u.name) ?? []);
  const match =
    matchBuilds(owned, [cluster], wiki, {
      ...DEFAULT_MATCH_OPTIONS,
      hideIfMissing: [],
      hideForbiddenJewels: false,
      ignoreRollChase: options.ignoreRollChase,
      mustUse: null,
      classFilter: null,
      skillFilter: null,
    })[0] ?? null;
  const missing = match?.missing ?? cluster.uniqueNames.filter((n) => !owned.has(n));
  return { match, farm: farmHintsForNames(missing, wiki) };
}
