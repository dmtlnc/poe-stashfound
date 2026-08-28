import { normalizeClassFilter } from "../match/classes";

export type MatchPrefs = {
  threshold: number;
  hideChaseMissing: boolean;
  ignoreRollChase: boolean;
  mustUse: string;
  classFilter: string;
  skillFilter: string;
};

const KEY = "stashfound.matchPrefs";

export const DEFAULT_MATCH_PREFS: MatchPrefs = {
  threshold: 70,
  hideChaseMissing: true,
  ignoreRollChase: true,
  mustUse: "",
  classFilter: "",
  skillFilter: "",
};

export function loadMatchPrefs(): MatchPrefs {
  if (typeof window === "undefined") return DEFAULT_MATCH_PREFS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_MATCH_PREFS;
    const data = JSON.parse(raw) as Partial<MatchPrefs>;
    const threshold = Number(data.threshold);
    return {
      threshold: Number.isFinite(threshold)
        ? Math.min(100, Math.max(50, Math.round(threshold / 5) * 5))
        : DEFAULT_MATCH_PREFS.threshold,
      hideChaseMissing: data.hideChaseMissing !== false,
      ignoreRollChase: data.ignoreRollChase !== false,
      mustUse: typeof data.mustUse === "string" ? data.mustUse : "",
      classFilter:
        typeof data.classFilter === "string"
          ? normalizeClassFilter(data.classFilter)
          : "",
      skillFilter: typeof data.skillFilter === "string" ? data.skillFilter : "",
    };
  } catch {
    return DEFAULT_MATCH_PREFS;
  }
}

export function saveMatchPrefs(prefs: MatchPrefs): void {
  window.localStorage.setItem(KEY, JSON.stringify(prefs));
}
