import { namesToUniques } from "../import/names";
import type { InventorySnapshot } from "../types";

const KEY = "stashfound.inventory";

export function loadInventory(): InventorySnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as InventorySnapshot;
    if (!data || !Array.isArray(data.uniques)) return null;
    return data;
  } catch {
    return null;
  }
}

export function saveInventory(snapshot: InventorySnapshot): void {
  window.localStorage.setItem(KEY, JSON.stringify(snapshot));
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
}): InventorySnapshot {
  return {
    league: opts.league ?? "SSF Allflame",
    ninjaOverview: opts.ninjaOverview ?? "allflame",
    accountName: sanitizeAccount(opts.accountName),
    mock: Boolean(opts.mock),
    fetchedAt: new Date().toISOString(),
    uniques: namesToUniques(opts.names, opts.label),
    tabCount: 0,
    characterCount: 0,
  };
}

export function sanitizeAccount(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+|_+$/g, "");
  return cleaned.slice(0, 40) || "Imported";
}
