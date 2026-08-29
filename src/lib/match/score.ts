import { MIN_BUILD_UNIQUES } from "../config";
import type { FarmWikiIndex } from "../farm/types";
import type { BuildCluster, MatchResult } from "../types";
import { usesForbiddenJewel, usesHiddenUnique, HIDE_IF_MISSING } from "./chase";
import { BASE_CLASSES, baseClassName } from "./classes";
import { isVariantUnique } from "./variants";
import { uniqueWeight } from "./weights";

export type MatchOptions = {
  hideIfMissing: Iterable<string>;
  hideForbiddenJewels: boolean;
  ignoreRollChase: boolean;
  mustUse: string | null;
  classFilter: string | null;
  skillFilter: string | null;
};

export const DEFAULT_MATCH_OPTIONS: MatchOptions = {
  hideIfMissing: [...HIDE_IF_MISSING],
  hideForbiddenJewels: true,
  ignoreRollChase: true,
  mustUse: null,
  classFilter: null,
  skillFilter: null,
};

/** Weighted % below the slider, at or above this, is a near-miss. */
export const NEAR_MISS_FLOOR = 0.5;

export function classLabel(cluster: BuildCluster): string {
  return baseClassName(cluster.ascendancy || cluster.className);
}

export function skillLabel(cluster: BuildCluster): string {
  return cluster.mainSkill?.trim() || "";
}

export function filterOptions(clusters: BuildCluster[]): { classes: string[]; skills: string[] } {
  const classes = new Set<string>();
  const skills = new Set<string>();
  for (const cluster of clusters) {
    classes.add(classLabel(cluster));
    const skill = skillLabel(cluster);
    if (skill) skills.add(skill);
  }
  const collator = new Intl.Collator();
  const known = BASE_CLASSES.filter((name) => classes.has(name));
  const extra = [...classes]
    .filter((name) => !(BASE_CLASSES as readonly string[]).includes(name))
    .sort(collator.compare);
  return {
    classes: [...known, ...extra],
    skills: [...skills].sort(collator.compare),
  };
}

export function scoringNames(uniqueNames: string[], ignoreRollChase: boolean): string[] {
  if (!ignoreRollChase) return uniqueNames;
  return uniqueNames.filter((name) => !isVariantUnique(name));
}

export function coverageScore(
  owned: Set<string>,
  names: string[],
  weightOf: (name: string) => number,
): number {
  if (names.length === 0) return 1;
  let have = 0;
  let total = 0;
  for (const name of names) {
    const w = weightOf(name);
    total += w;
    if (owned.has(name)) have += w;
  }
  return total === 0 ? 1 : have / total;
}

export function matchBuilds(
  ownedNames: Iterable<string>,
  clusters: BuildCluster[],
  wiki: FarmWikiIndex,
  options: MatchOptions = DEFAULT_MATCH_OPTIONS,
): MatchResult[] {
  const owned = ownedNames instanceof Set ? ownedNames : new Set(ownedNames);
  const mustUse = options.mustUse?.trim() || null;
  const classFilter = options.classFilter?.trim() || null;
  const skillFilter = options.skillFilter?.trim() || null;
  const results: MatchResult[] = [];

  const weightOf = (name: string) => uniqueWeight(wiki.uniques[name]?.tier);

  for (const cluster of clusters) {
    if (cluster.uniqueNames.length < MIN_BUILD_UNIQUES) continue;
    if (mustUse && !cluster.uniqueNames.includes(mustUse)) continue;
    if (classFilter && classLabel(cluster) !== classFilter) continue;
    if (skillFilter && skillLabel(cluster) !== skillFilter) continue;
    if (usesHiddenUnique(cluster.uniqueNames, options.hideIfMissing)) continue;
    if (options.hideForbiddenJewels && usesForbiddenJewel(cluster.uniqueNames)) {
      continue;
    }

    const listed = cluster.uniqueNames;
    const counted = scoringNames(listed, options.ignoreRollChase);
    const have: string[] = [];
    const missing: string[] = [];
    for (const name of listed) {
      if (owned.has(name)) have.push(name);
      else missing.push(name);
    }

    const nameHits = counted.filter((name) => owned.has(name)).length;
    const score = coverageScore(owned, counted, weightOf);

    results.push({
      cluster,
      score,
      owned: have,
      missing,
      listedNames: listed,
      nameHits,
      nameTotal: counted.length,
      variantWarnings: listed.filter(isVariantUnique),
    });
  }

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.cluster.characterCount - a.cluster.characterCount;
  });

  return results;
}

export function splitByThreshold(
  results: MatchResult[],
  threshold: number,
): { matches: MatchResult[]; almost: MatchResult[] } {
  const matches: MatchResult[] = [];
  const almost: MatchResult[] = [];
  for (const row of results) {
    if (row.score + 1e-9 >= threshold) matches.push(row);
    else if (row.score + 1e-9 >= NEAR_MISS_FLOOR) almost.push(row);
  }
  return { matches, almost };
}

export function formatPercent(score: number): string {
  return `${Math.round(score * 100)}%`;
}
