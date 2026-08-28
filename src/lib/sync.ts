import {
  flattenStashTabs,
  getCharacter,
  getStash,
  listAccountLeagues,
  listCharacters,
  listStashes,
  sleep,
} from "./ggg/api";
import { pickSsfLeague } from "./ggg/leagues";
import {
  MOCK_ACCOUNT,
  MOCK_CHARACTERS,
  MOCK_LEAGUE,
  MOCK_NINJA_OVERVIEW,
  MOCK_STASH_ITEMS,
  MOCK_STASH_TABS,
} from "./ggg/mock";
import { collectUniques } from "./ggg/uniques";
import { saveInventory } from "./inventory-store";
import { getNinjaCache } from "./ninja/cache";
import { fetchNinjaLeagues } from "./ninja/client";
import { setProgress } from "./sync-progress";
import type { GggCharacter, InventorySnapshot, UniqueItem } from "./types";

function snapshotFromMap(
  acc: Map<string, UniqueItem>,
  meta: Omit<InventorySnapshot, "uniques">,
): InventorySnapshot {
  return {
    ...meta,
    uniques: [...acc.values()].sort((a, b) => a.name.localeCompare(b.name)),
  };
}

export async function syncMock(): Promise<InventorySnapshot> {
  setProgress(MOCK_ACCOUNT, {
    status: "running",
    current: 0,
    total: 4,
    message: "Loading demo characters…",
  });
  await sleep(250);
  const acc = new Map<string, UniqueItem>();
  for (const ch of MOCK_CHARACTERS) {
    const src = { type: "character" as const, label: ch.name };
    collectUniques(ch.equipment, src, acc);
    collectUniques(ch.inventory, src, acc);
    collectUniques(ch.jewels, src, acc);
  }
  setProgress(MOCK_ACCOUNT, {
    status: "running",
    current: 2,
    total: 4,
    message: "Loading demo stash tabs…",
  });
  await sleep(250);
  for (const tab of MOCK_STASH_TABS) {
    collectUniques(MOCK_STASH_ITEMS[tab.id], { type: "stash", label: tab.name }, acc);
  }
  const snapshot = snapshotFromMap(acc, {
    league: MOCK_LEAGUE,
    ninjaOverview: MOCK_NINJA_OVERVIEW,
    accountName: MOCK_ACCOUNT,
    mock: true,
    fetchedAt: new Date().toISOString(),
    tabCount: MOCK_STASH_TABS.length,
    characterCount: MOCK_CHARACTERS.length,
  });
  await saveInventory(snapshot);
  setProgress(MOCK_ACCOUNT, {
    status: "done",
    current: 4,
    total: 4,
    message: `Found ${snapshot.uniques.length} unique names`,
  });
  return snapshot;
}

export async function syncLive(
  token: string,
  accountName: string,
): Promise<InventorySnapshot> {
  setProgress(accountName, {
    status: "running",
    current: 0,
    total: 3,
    message: "Detecting current SSF league…",
  });

  const ninja = await getNinjaCache();
  let ninjaLeagues: { id: string; name?: string }[] = [];
  try {
    ninjaLeagues = await fetchNinjaLeagues();
  } catch {
    ninjaLeagues = [{ id: ninja.ninjaOverview, name: ninja.gggLeague }];
  }
  const accountLeagues = await listAccountLeagues(token);
  const pick = pickSsfLeague(accountLeagues, ninjaLeagues, {
    gggName: process.env.POE_SSF_LEAGUE,
  });
  if (!pick) {
    throw new Error("Could not detect the current challenge-league SSF league.");
  }

  const characters = (await listCharacters(token)).filter(
    (c) => c.league === pick.gggName,
  );

  const tabs = flattenStashTabs(await listStashes(token, pick.gggName));
  const total = 1 + characters.length + tabs.length;
  let current = 1;
  setProgress(accountName, {
    status: "running",
    current,
    total,
    message: `League ${pick.gggName}: ${characters.length} characters, ${tabs.length} tabs`,
  });

  const acc = new Map<string, UniqueItem>();

  for (const summary of characters) {
    setProgress(accountName, {
      status: "running",
      current: ++current,
      total,
      message: `Character ${summary.name}…`,
    });
    const ch: GggCharacter | undefined = await getCharacter(token, summary.name);
    if (!ch) continue;
    const src = { type: "character" as const, label: ch.name };
    collectUniques(ch.equipment, src, acc);
    collectUniques(ch.inventory, src, acc);
    collectUniques(ch.rucksack, src, acc);
    collectUniques(ch.jewels, src, acc);
    collectUniques(ch.guardian, src, acc);
    await sleep(400);
  }

  for (const tab of tabs) {
    setProgress(accountName, {
      status: "running",
      current: ++current,
      total,
      message: `Stash tab ${tab.name}…`,
    });
    const stash = tab.parentId
      ? await getStash(token, pick.gggName, tab.parentId, tab.id)
      : await getStash(token, pick.gggName, tab.id);
    collectUniques(stash?.items, { type: "stash", label: tab.name }, acc);
    await sleep(400);
  }

  const snapshot = snapshotFromMap(acc, {
    league: pick.gggName,
    ninjaOverview: pick.ninjaOverview,
    accountName,
    mock: false,
    fetchedAt: new Date().toISOString(),
    tabCount: tabs.length,
    characterCount: characters.length,
  });
  await saveInventory(snapshot);
  setProgress(accountName, {
    status: "done",
    current: total,
    total,
    message: `Found ${snapshot.uniques.length} unique names`,
  });
  return snapshot;
}
