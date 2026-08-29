import { normalizeClassFilter } from "../match/classes";
import {
  DEFAULT_HIDE_IF_MISSING,
  HIDE_IF_MISSING,
  type HideIfMissingName,
} from "../match/chase";

export type MatchPrefs = {
  threshold: number;
  hideIfMissing: Record<HideIfMissingName, boolean>;
  hideForbiddenJewels: boolean;
  ignoreRollChase: boolean;
  mustUse: string;
  classFilter: string;
  skillFilter: string;
};

type StoredPrefs = Partial<Omit<MatchPrefs, "hideIfMissing">> & {
  hideIfMissing?: Partial<Record<HideIfMissingName, boolean>>;
  hideChaseMissing?: boolean;
  hideMetaChaseMissing?: boolean;
  ignoreForbiddenJewels?: boolean;
};

const KEY = "stashfound.matchPrefs";

export const DEFAULT_MATCH_PREFS: MatchPrefs = {
  threshold: 70,
  hideIfMissing: { ...DEFAULT_HIDE_IF_MISSING },
  hideForbiddenJewels: true,
  ignoreRollChase: true,
  mustUse: "",
  classFilter: "",
  skillFilter: "",
};

function parseHideIfMissing(data: StoredPrefs): Record<HideIfMissingName, boolean> {
  const next = { ...DEFAULT_HIDE_IF_MISSING };
  const stored = data.hideIfMissing;
  if (stored && typeof stored === "object") {
    for (const name of HIDE_IF_MISSING) {
      if (typeof stored[name] === "boolean") next[name] = stored[name];
    }
    return next;
  }
  next["Defiance of Destiny"] = data.hideChaseMissing !== false;
  const meta = data.hideMetaChaseMissing !== false;
  next.Headhunter = meta;
  next.Mageblood = meta;
  next["Original Sin"] = meta;
  return next;
}

export function loadMatchPrefs(): MatchPrefs {
  if (typeof window === "undefined") return DEFAULT_MATCH_PREFS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_MATCH_PREFS;
    const data = JSON.parse(raw) as StoredPrefs;
    const threshold = Number(data.threshold);
    return {
      threshold: Number.isFinite(threshold)
        ? Math.min(100, Math.max(50, Math.round(threshold / 5) * 5))
        : DEFAULT_MATCH_PREFS.threshold,
      hideIfMissing: parseHideIfMissing(data),
      hideForbiddenJewels:
        typeof data.hideForbiddenJewels === "boolean"
          ? data.hideForbiddenJewels
          : data.ignoreForbiddenJewels !== false,
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
