/** Hide every build that uses this unique, owned or not. */
export const HIDE_IF_MISSING = [
  "Defiance of Destiny",
  "Headhunter",
  "Mageblood",
  "Original Sin",
] as const;

export type HideIfMissingName = (typeof HIDE_IF_MISSING)[number];

export const FORBIDDEN_JEWELS = ["Forbidden Flesh", "Forbidden Flame"] as const;

export const HIDE_IF_MISSING_SET = new Set<string>(HIDE_IF_MISSING);
export const FORBIDDEN_JEWEL_SET = new Set<string>(FORBIDDEN_JEWELS);

export const DEFAULT_HIDE_IF_MISSING: Record<HideIfMissingName, boolean> = {
  "Defiance of Destiny": true,
  Headhunter: true,
  Mageblood: true,
  "Original Sin": true,
};

export function isForbiddenJewel(name: string): boolean {
  return FORBIDDEN_JEWEL_SET.has(name);
}

export function hideIfMissingNames(
  flags: Record<HideIfMissingName, boolean>,
): HideIfMissingName[] {
  return HIDE_IF_MISSING.filter((name) => flags[name]);
}

/** True if the build uses any unique the hide switches are targeting. */
export function usesHiddenUnique(
  uniqueNames: Iterable<string>,
  hide: Iterable<string>,
): boolean {
  const set = hide instanceof Set ? hide : new Set(hide);
  if (set.size === 0) return false;
  for (const name of uniqueNames) {
    if (set.has(name)) return true;
  }
  return false;
}

export function usesForbiddenJewel(uniqueNames: Iterable<string>): boolean {
  for (const name of uniqueNames) {
    if (isForbiddenJewel(name)) return true;
  }
  return false;
}
