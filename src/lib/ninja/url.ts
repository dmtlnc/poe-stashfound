/** Uniques that are too roll-chase / unrealistic for SSF planning. */
export const SKIP_BUILD_UNIQUES = new Set([
  "Forbidden Flesh",
  "Forbidden Flame",
]);

/** AND-filter this many highest-usage uniques on the poe.ninja builds link. */
export const NINJA_FILTER_UNIQUES = 8;

export function usableBuildUniques(names: string[]): string[] {
  return names.filter((name) => !SKIP_BUILD_UNIQUES.has(name));
}

export function ninjaFilterUniques(names: string[]): string[] {
  return usableBuildUniques(names).slice(0, NINJA_FILTER_UNIQUES);
}

/** poe.ninja AND-filters multiple uniques via a comma-separated `items` param. */
export function ninjaBuildsUrl(opts: {
  ninjaUrlSlug: string;
  ninjaOverview: string;
  skill?: string;
  uniqueNames?: string[];
}): string {
  const params = new URLSearchParams({
    overview: opts.ninjaOverview,
    type: "exp",
  });
  if (opts.skill) params.set("skills", opts.skill);
  const items = ninjaFilterUniques(opts.uniqueNames ?? []);
  if (items.length) params.set("items", items.join(","));
  return `https://poe.ninja/poe1/builds/${opts.ninjaUrlSlug}?${params}`;
}

export function withNinjaItemFilters(ninjaUrl: string, uniqueNames: string[]): string {
  try {
    const url = new URL(ninjaUrl);
    if (url.pathname.includes("/character/")) return ninjaUrl;
    const items = ninjaFilterUniques(uniqueNames);
    if (items.length === 0) {
      url.searchParams.delete("items");
      return url.toString();
    }
    url.searchParams.set("items", items.join(","));
    return url.toString();
  } catch {
    return ninjaUrl;
  }
}
