/** Chase uniques that warp ninja meta and are not an SSF plan. */
export const CHASE_UNIQUES = [
  "Mageblood",
  "Headhunter",
  "Defiance of Destiny",
  "Original Sin",
  "Progenesis",
] as const;

export const CHASE_UNIQUE_SET = new Set<string>(CHASE_UNIQUES);

export function needsMissingChase(missing: Iterable<string>): boolean {
  for (const name of missing) {
    if (CHASE_UNIQUE_SET.has(name)) return true;
  }
  return false;
}
