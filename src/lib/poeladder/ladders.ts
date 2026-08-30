import type { LadderMode } from "../leagues/modes";

const API = "https://poeladder.com/api/v1";

/** Anonymous stashfound league row. `standard` means softcore, not the eternal league. */
export type StashfoundLeague = {
  name: string;
  identifier: string;
  ssf: boolean;
  temporaryLeague: boolean;
  standard: boolean;
  hardcore: boolean;
  ruthless: boolean;
  isPoe2: boolean;
  url: string;
};

export function stashfoundLeaguesUrl(user: string): string {
  return `${API}/users/${encodeURIComponent(user)}/stashfound`;
}

export function stashfoundUniquesUrl(user: string, identifier: string): string {
  return `${API}/users/${encodeURIComponent(user)}/leagues/${encodeURIComponent(identifier)}/stashfound`;
}

function flag(row: Record<string, unknown>, key: string): boolean {
  return row[key] === true;
}

export function parseStashfoundLeagues(raw: unknown): StashfoundLeague[] {
  if (!Array.isArray(raw)) return [];
  const out: StashfoundLeague[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const identifier = String(row.identifier ?? "").trim();
    const name = String(row.name ?? "").trim();
    if (!identifier || !name) continue;
    out.push({
      identifier,
      name,
      url: String(row.url ?? "").trim(),
      ssf: flag(row, "ssf"),
      temporaryLeague: flag(row, "temporaryLeague"),
      standard: flag(row, "standard"),
      hardcore: flag(row, "hardcore"),
      ruthless: flag(row, "ruthless"),
      isPoe2: flag(row, "isPoe2"),
    });
  }
  return out;
}

export function parseStashfoundNames(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const names: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const name = String((item as { name?: unknown }).name ?? "").trim();
    if (name.length < 3 || name.length > 80 || seen.has(name)) continue;
    seen.add(name);
    names.push(name);
  }
  return names;
}

function usable(l: StashfoundLeague): boolean {
  return Boolean(l.identifier) && !l.ruthless && !l.isPoe2;
}

export function pickCurrentSsfLadder(
  leagues: StashfoundLeague[],
): StashfoundLeague | null {
  return pickLadderByMode(leagues, "ssf-allflame");
}

export function pickLadderByMode(
  leagues: StashfoundLeague[],
  mode: LadderMode,
): StashfoundLeague | null {
  const list = leagues.filter(usable);
  if (mode === "ssf-standard") {
    return (
      list.find((l) => l.ssf && l.standard && !l.hardcore && !l.temporaryLeague) ??
      null
    );
  }
  if (mode === "standard") {
    return list.find((l) => !l.ssf && l.standard && !l.hardcore) ?? null;
  }
  if (mode === "hcssf-allflame") {
    const hc = list.filter((l) => l.ssf && l.hardcore);
    return hc.find((l) => l.temporaryLeague) ?? hc[0] ?? null;
  }
  return (
    list.find((l) => l.ssf && !l.hardcore && l.temporaryLeague) ?? null
  );
}

export function pickStashfoundLeague(
  leagues: StashfoundLeague[],
  mode: LadderMode,
  identifier?: string,
): StashfoundLeague | null {
  if (identifier) {
    const hit = leagues.filter(usable).find((l) => l.identifier === identifier);
    if (hit) return hit;
  }
  return pickLadderByMode(leagues, mode);
}
