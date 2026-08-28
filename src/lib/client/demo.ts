import {
  MOCK_ACCOUNT,
  MOCK_CHARACTERS,
  MOCK_LEAGUE,
  MOCK_NINJA_OVERVIEW,
  MOCK_STASH_ITEMS,
  MOCK_STASH_TABS,
} from "../ggg/mock";
import { collectUniques } from "../ggg/uniques";
import type { InventorySnapshot, UniqueItem } from "../types";

export function buildDemoSnapshot(): InventorySnapshot {
  const acc = new Map<string, UniqueItem>();
  for (const ch of MOCK_CHARACTERS) {
    const src = { type: "character" as const, label: ch.name };
    collectUniques(ch.equipment, src, acc);
    collectUniques(ch.inventory, src, acc);
    collectUniques(ch.jewels, src, acc);
  }
  for (const tab of MOCK_STASH_TABS) {
    collectUniques(MOCK_STASH_ITEMS[tab.id], { type: "stash", label: tab.name }, acc);
  }
  return {
    league: MOCK_LEAGUE,
    ninjaOverview: MOCK_NINJA_OVERVIEW,
    accountName: MOCK_ACCOUNT,
    mock: true,
    fetchedAt: new Date().toISOString(),
    uniques: [...acc.values()].sort((a, b) => a.name.localeCompare(b.name)),
    tabCount: MOCK_STASH_TABS.length,
    characterCount: MOCK_CHARACTERS.length,
  };
}
