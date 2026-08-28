import { saveInventory } from "../inventory-store";
import { getNinjaCache } from "../ninja/cache";
import type { InventorySnapshot } from "../types";
import { namesToUniques } from "./names";

export { namesToUniques } from "./names";

export async function saveImportedUniques(opts: {
  accountName: string;
  names: string[];
  label: string;
}): Promise<InventorySnapshot> {
  const ninja = await getNinjaCache();
  const snapshot: InventorySnapshot = {
    league: ninja.gggLeague.startsWith("SSF ")
      ? ninja.gggLeague
      : `SSF ${ninja.gggLeague}`,
    ninjaOverview: ninja.ninjaOverview,
    accountName: opts.accountName,
    mock: false,
    fetchedAt: new Date().toISOString(),
    uniques: namesToUniques(opts.names, opts.label),
    tabCount: 0,
    characterCount: 0,
  };
  await saveInventory(snapshot);
  return snapshot;
}
