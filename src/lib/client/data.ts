import fallback from "@/data/ninja-fallback.json";
import { farmHintsForNames } from "@/lib/farm/catalog";
import { EMPTY_FARM_WIKI, type FarmWikiIndex } from "@/lib/farm/types";
import { matchBuilds } from "@/lib/match/score";
import type { BuildCluster, FarmHint, InventorySnapshot, MatchResult } from "@/lib/types";
import { publicUrl } from "./base";

export type NinjaSnapshot = {
  fetchedAt?: string;
  gggLeague?: string;
  ninjaOverview?: string;
  source?: string;
  clusters: BuildCluster[];
};

export type MatchRow = MatchResult & { farm: FarmHint[] };

let ninjaMemory: NinjaSnapshot | null = null;
let ninjaInflight: Promise<NinjaSnapshot> | null = null;
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

export async function loadNinja(): Promise<NinjaSnapshot> {
  if (ninjaMemory) return ninjaMemory;
  ninjaInflight ??= (async () => {
    const data = await getJson<NinjaSnapshot>("/data/ninja.json");
    const clusters = data?.clusters?.length ? data.clusters : (fallback.clusters as BuildCluster[]);
    ninjaMemory = {
      fetchedAt: data?.fetchedAt,
      gggLeague: data?.gggLeague ?? "SSF Allflame",
      ninjaOverview: data?.ninjaOverview ?? "allflame",
      source: data?.source ?? "fallback",
      clusters,
    };
    return ninjaMemory;
  })();
  return ninjaInflight;
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
): MatchRow[] {
  const threshold = thresholdPct > 1 ? thresholdPct / 100 : thresholdPct;
  return matchBuilds(
    snapshot.uniques.map((u) => u.name),
    ninja.clusters,
    threshold,
  ).map((m) => ({ ...m, farm: farmHintsForNames(m.missing, wiki) }));
}

export function matchOne(
  snapshot: InventorySnapshot | null,
  cluster: BuildCluster,
  wiki: FarmWikiIndex,
): { match: MatchResult | null; farm: FarmHint[] } {
  const owned = new Set(snapshot?.uniques.map((u) => u.name) ?? []);
  const match = matchBuilds(owned, [cluster], 0)[0] ?? null;
  const missing = match?.missing ?? cluster.uniqueNames.filter((n) => !owned.has(n));
  return { match, farm: farmHintsForNames(missing, wiki) };
}
