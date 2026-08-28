import { DEFAULT_MATCH_THRESHOLD, MIN_BUILD_UNIQUES } from "../config";
import type { BuildCluster, MatchResult } from "../types";
import { isVariantUnique } from "./variants";

export function coverageScore(owned: Set<string>, buildUniques: string[]): number {
  if (buildUniques.length === 0) return 0;
  let hit = 0;
  for (const name of buildUniques) {
    if (owned.has(name)) hit += 1;
  }
  return hit / buildUniques.length;
}

export function matchBuilds(
  ownedNames: Iterable<string>,
  clusters: BuildCluster[],
  threshold = DEFAULT_MATCH_THRESHOLD,
): MatchResult[] {
  const owned = new Set(ownedNames);
  const results: MatchResult[] = [];

  for (const cluster of clusters) {
    if (cluster.uniqueNames.length < MIN_BUILD_UNIQUES) continue;
    const score = coverageScore(owned, cluster.uniqueNames);
    if (score + 1e-9 < threshold) continue;

    const have: string[] = [];
    const missing: string[] = [];
    for (const name of cluster.uniqueNames) {
      if (owned.has(name)) have.push(name);
      else missing.push(name);
    }

    const variantWarnings = cluster.uniqueNames.filter(isVariantUnique);

    results.push({
      cluster,
      score,
      owned: have,
      missing,
      variantWarnings,
    });
  }

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.cluster.characterCount - a.cluster.characterCount;
  });

  return results;
}

export function formatPercent(score: number): string {
  return `${Math.round(score * 100)}%`;
}
