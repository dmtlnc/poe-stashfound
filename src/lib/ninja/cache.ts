import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NINJA_CACHE_MS } from "../config";
import { isChallengeTradeBuildLeague, pickCurrentTradeBuildLeague } from "../ggg/leagues";
import type { BuildCluster } from "../types";
import { buildClusterFromMeta } from "./cluster";
import { SKIP_BUILD_UNIQUES } from "./url";
import {
  fetchBuildSearch,
  fetchDictionary,
  fetchIndexState,
  fetchUniqueNameAllowlist,
  type IndexLeague,
  type IndexState,
} from "./client";
import fallback from "@/data/ninja-fallback.json";
import type { ParsedSearch } from "./protobuf";

export type NinjaCache = {
  version?: number;
  fetchedAt: string;
  gggLeague: string;
  ninjaOverview: string;
  ninjaUrlSlug: string;
  source: "ninja" | "fallback";
  clusters: BuildCluster[];
};

const cacheDir = path.join(process.cwd(), "data", "cache");
const cacheFile = path.join(cacheDir, "ninja-ssf.json");
const TOP_SKILLS = 100;
const MIN_SKILL_CHARS = 12;
const UNIQUE_USAGE = 0.2;
const MAX_UNIQUES = 12;
const CACHE_VERSION = 6;
const SKIP_SKILLS = new Set([
  "Animate Guardian",
  "Shield Charge",
  "Flame Dash",
  "Whirling Blades",
  "Leap Slam",
  "Dash",
  "Withering Step",
  "Frostblink",
  "Lightning Warp",
  "Vaal Lightning Warp",
]);

let memory: { expiresAt: number; value: NinjaCache } | null = null;

function dimMap(search: ParsedSearch, id: string) {
  return search.dimensions.find((d) => d.id === id);
}

function nameAt(dict: string[], key: number): string | undefined {
  const name = dict[key];
  return name?.trim() ? name : undefined;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function readDisk(): Promise<NinjaCache | null> {
  try {
    const raw = await readFile(cacheFile, "utf8");
    return JSON.parse(raw) as NinjaCache;
  } catch {
    return null;
  }
}

async function writeDisk(value: NinjaCache) {
  await mkdir(cacheDir, { recursive: true });
  await writeFile(cacheFile, JSON.stringify(value));
}

function fallbackCache(gggLeague: string, overview: string): NinjaCache {
  return {
    version: CACHE_VERSION,
    fetchedAt: new Date().toISOString(),
    gggLeague,
    ninjaOverview: overview,
    ninjaUrlSlug: "allflame",
    source: "fallback",
    clusters: fallback.clusters as BuildCluster[],
  };
}

function isGearSlotName(name: string): boolean {
  return /^(Rare|Magic|Normal)\b/.test(name);
}

function pickUniques(
  search: ParsedSearch,
  itemDict: string[],
  allow: Set<string>,
): string[] {
  const items = dimMap(search, "items");
  if (!items || search.total === 0) return [];
  const ranked = items.counts
    .map((c) => {
      const name = nameAt(itemDict, c.key);
      if (!name || isGearSlotName(name)) return null;
      if (SKIP_BUILD_UNIQUES.has(name)) return null;
      if (allow.size > 0 && !allow.has(name)) return null;
      return { name, rate: c.count / search.total };
    })
    .filter((x): x is { name: string; rate: number } => Boolean(x))
    .sort((a, b) => b.rate - a.rate);

  const core = ranked.filter((x) => x.rate >= UNIQUE_USAGE).slice(0, MAX_UNIQUES);
  const names = (core.length >= 3 ? core : ranked.slice(0, MAX_UNIQUES)).map(
    (x) => x.name,
  );
  return [...new Set(names)];
}

function dominantClass(search: ParsedSearch, classDict: string[]): string {
  const dim = dimMap(search, "class") ?? dimMap(search, "secondascendancy");
  if (!dim?.counts.length) return "Unknown";
  const top = [...dim.counts].sort((a, b) => b.count - a.count)[0];
  return nameAt(classDict, top.key) ?? "Unknown";
}

function pickLeague(idx: IndexState): IndexLeague | null {
  const overrideOverview = process.env.POE_NINJA_OVERVIEW;
  const all = [...idx.buildLeagues, ...(idx.oldBuildLeagues ?? [])];
  if (overrideOverview) {
    const snap = idx.snapshotVersions.find(
      (s) => s.snapshotName === overrideOverview || s.url === overrideOverview,
    );
    if (snap) {
      return (
        all.find((l) => l.url === snap.url) ?? {
          name: snap.name,
          url: snap.url,
        }
      );
    }
  }
  return (
    pickCurrentTradeBuildLeague(idx.buildLeagues) ??
    pickCurrentTradeBuildLeague(idx.oldBuildLeagues ?? [])
  );
}

async function buildLiveCache(): Promise<NinjaCache> {
  const idx = await fetchIndexState();
  const league = pickLeague(idx);
  if (!league || !isChallengeTradeBuildLeague(league.name, league.url)) {
    throw new Error("No current challenge league on poe.ninja");
  }

  const snap = idx.snapshotVersions.find(
    (s) => s.url === league.url && s.type === "exp",
  );
  if (!snap) throw new Error(`No exp snapshot for ${league.url}`);

  const tradeLeague =
    idx.economyLeagues?.find(
      (l) =>
        !/hardcore|standard/i.test(l.name) && !/^ssf /i.test(l.name),
    )?.name ?? league.name.replace(/^SSF\s+/i, "");

  const overview = snap.snapshotName;
  const base = await fetchBuildSearch(snap.version, overview);

  const dictById = new Map<string, string[]>();
  async function dict(id: string): Promise<string[]> {
    const hit = dictById.get(id);
    if (hit) return hit;
    const hash = base.dictionaries.find((d) => d.id === id)?.hash;
    if (!hash) return [];
    const names = await fetchDictionary(hash);
    dictById.set(id, names);
    return names;
  }

  const gemDict = await dict("gem");
  const classDict = await dict("class");
  const itemDict = await dict("item");
  const allow = await fetchUniqueNameAllowlist(tradeLeague);

  const skillsDim = dimMap(base, "skills");
  const skillRanks = (skillsDim?.counts ?? [])
    .map((c) => ({ name: nameAt(gemDict, c.key), count: c.count }))
    .filter((s): s is { name: string; count: number } => Boolean(s.name))
    .filter((s) => s.count >= MIN_SKILL_CHARS && !SKIP_SKILLS.has(s.name))
    .sort((a, b) => b.count - a.count)
    .slice(0, TOP_SKILLS);

  const clusters: BuildCluster[] = [];
  for (const skill of skillRanks) {
    await sleep(80);
    const filtered = await fetchBuildSearch(snap.version, overview, {
      skills: skill.name,
    });
    const uniques = pickUniques(filtered, itemDict, allow);
    const cluster = buildClusterFromMeta({
      className: dominantClass(filtered, classDict),
      skill: skill.name,
      uniqueNames: uniques,
      characterCount: filtered.total,
      ninjaOverview: overview,
      ninjaUrlSlug: league.url,
    });
    if (cluster) clusters.push(cluster);
  }

  if (clusters.length === 0) {
    throw new Error("ninja search returned no skill clusters");
  }

  return {
    version: CACHE_VERSION,
    fetchedAt: new Date().toISOString(),
    gggLeague: league.name,
    ninjaOverview: overview,
    ninjaUrlSlug: league.url,
    source: "ninja",
    clusters,
  };
}

export async function getNinjaCache(force = false): Promise<NinjaCache> {
  const now = Date.now();
  if (
    !force &&
    memory &&
    memory.expiresAt > now &&
    memory.value.version === CACHE_VERSION
  ) {
    return memory.value;
  }

  if (!force) {
    const disk = await readDisk();
    if (
      disk &&
      disk.version === CACHE_VERSION &&
      now - Date.parse(disk.fetchedAt) < NINJA_CACHE_MS
    ) {
      memory = {
        expiresAt: Date.parse(disk.fetchedAt) + NINJA_CACHE_MS,
        value: disk,
      };
      return disk;
    }
  }

  try {
    const value = await buildLiveCache();
    await writeDisk(value);
    memory = { expiresAt: now + NINJA_CACHE_MS, value };
    return value;
  } catch (err) {
    console.error("poe.ninja cluster fetch failed", err);
    const value = fallbackCache("Allflame", "allflame");
    memory = { expiresAt: now + 30 * 60 * 1000, value };
    return value;
  }
}

export async function getClustersForUser(_mock: boolean): Promise<NinjaCache> {
  return getNinjaCache();
}

export async function getClusterById(
  id: string,
  mock: boolean,
): Promise<BuildCluster | undefined> {
  const cache = await getClustersForUser(mock);
  return cache.clusters.find((c) => c.id === id);
}
