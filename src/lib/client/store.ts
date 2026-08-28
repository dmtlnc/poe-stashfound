import { namesToUniques } from "../import/names";
import {
  DEFAULT_LADDER_MODE,
  DEFAULT_NINJA_MODE,
  LADDER_LABEL,
  LADDER_TO_NINJA,
  parseLadderMode,
  parseNinjaMode,
  type LadderMode,
  type NinjaMode,
} from "../leagues/modes";
import type { InventorySnapshot } from "../types";

const KEY = "stashfound.inventory";

export function hydrateInventory(data: InventorySnapshot): InventorySnapshot {
  const ladderMode = parseLadderMode(data.ladderMode);
  const ninjaMode = parseNinjaMode(data.ninjaMode ?? data.ninjaOverview);
  return {
    ...data,
    ladderMode,
    ninjaMode,
    league: data.league || LADDER_LABEL[ladderMode],
    ninjaOverview: data.ninjaOverview || ninjaMode,
    ladderAccount: data.ladderAccount?.trim() || undefined,
  };
}

export function loadInventory(): InventorySnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as InventorySnapshot;
    if (!data || !Array.isArray(data.uniques)) return null;
    return hydrateInventory(data);
  } catch {
    return null;
  }
}

export function saveInventory(snapshot: InventorySnapshot): void {
  window.localStorage.setItem(KEY, JSON.stringify(hydrateInventory(snapshot)));
}

export function clearInventory(): void {
  window.localStorage.removeItem(KEY);
}

export function snapshotFromNames(opts: {
  names: string[];
  accountName: string;
  label: string;
  league?: string;
  ninjaOverview?: string;
  mock?: boolean;
  ladderMode?: LadderMode;
  ninjaMode?: NinjaMode;
  ladderAccount?: string;
}): InventorySnapshot {
  const ladderMode = parseLadderMode(opts.ladderMode ?? DEFAULT_LADDER_MODE);
  const ninjaMode = parseNinjaMode(
    opts.ninjaMode ?? LADDER_TO_NINJA[ladderMode] ?? DEFAULT_NINJA_MODE,
  );
  return hydrateInventory({
    league: opts.league ?? LADDER_LABEL[ladderMode],
    ninjaOverview: opts.ninjaOverview ?? ninjaMode,
    accountName: sanitizeAccount(opts.accountName),
    mock: Boolean(opts.mock),
    fetchedAt: new Date().toISOString(),
    uniques: namesToUniques(opts.names, opts.label),
    tabCount: 0,
    characterCount: 0,
    ladderMode,
    ninjaMode,
    ladderAccount: opts.ladderAccount,
  });
}

export function sanitizeAccount(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+|_+$/g, "");
  return cleaned.slice(0, 40) || "Imported";
}
