import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { cargoQuery, itemName } from "../farm/wiki";
import { fetchIndexState, fetchUniqueIcons } from "../ninja/client";

const CACHE_MS = 7 * 24 * 60 * 60 * 1000;
const CACHE_VERSION = 2;
const cacheFile = path.join(process.cwd(), "data/cache/unique-icons.json");
const SKIP_CLASS = new Set(["Map"]);

export type UniqueIconIndex = {
  version: number;
  fetchedAt: string;
  icons: Record<string, string>;
};

let memory: { expiresAt: number; value: UniqueIconIndex } | null = null;
let inflight: Promise<UniqueIconIndex> | null = null;

function filePathUrl(file: string): string | undefined {
  const raw = itemName(file)
    .replace(/^File:/i, "")
    .trim();
  if (!raw) return;
  const slug = encodeURIComponent(raw.replaceAll(" ", "_")).replaceAll("'", "%27");
  return `https://www.poewiki.net/wiki/Special:FilePath/${slug}`;
}

async function tradeLeagueName(): Promise<string> {
  try {
    const idx = await fetchIndexState();
    return (
      idx.economyLeagues?.find(
        (l) => !/hardcore|standard/i.test(l.name) && !/^ssf /i.test(l.name),
      )?.name ?? "Standard"
    );
  } catch {
    return "Standard";
  }
}

async function buildIndex(): Promise<UniqueIconIndex> {
  const icons: Record<string, string> = {};
  try {
    Object.assign(icons, await fetchUniqueIcons(await tradeLeagueName()));
  } catch (err) {
    console.error("ninja unique icons failed", err);
  }

  try {
    const rows = await cargoQuery(
      "items",
      "name,inventory_icon,class_id",
      'rarity_id="unique"',
      500,
    );
    for (const row of rows) {
      if (!row.name || !row.inventory_icon) continue;
      if (row.class_id && SKIP_CLASS.has(row.class_id)) continue;
      const name = itemName(row.name);
      if (name && !icons[name]) {
        const url = filePathUrl(row.inventory_icon);
        if (url) icons[name] = url;
      }
    }
  } catch (err) {
    console.error("wiki unique icons failed", err);
  }

  return {
    version: CACHE_VERSION,
    fetchedAt: new Date().toISOString(),
    icons,
  };
}

async function readDisk(): Promise<UniqueIconIndex | null> {
  try {
    return JSON.parse(await readFile(cacheFile, "utf8")) as UniqueIconIndex;
  } catch {
    return null;
  }
}

async function writeDisk(value: UniqueIconIndex) {
  await mkdir(path.dirname(cacheFile), { recursive: true });
  await writeFile(cacheFile, JSON.stringify(value));
}

export async function getUniqueIconMap(): Promise<Record<string, string>> {
  const now = Date.now();
  if (memory && memory.expiresAt > now && memory.value.version === CACHE_VERSION) {
    return memory.value.icons;
  }
  if (inflight) return (await inflight).icons;
  inflight = (async () => {
    const disk = await readDisk();
    if (
      disk &&
      disk.version === CACHE_VERSION &&
      Date.now() - Date.parse(disk.fetchedAt) < CACHE_MS &&
      Object.keys(disk.icons).length > 0
    ) {
      memory = { expiresAt: Date.parse(disk.fetchedAt) + CACHE_MS, value: disk };
      return disk;
    }
    try {
      const value = await buildIndex();
      if (Object.keys(value.icons).length === 0 && disk?.icons) return disk;
      await writeDisk(value);
      memory = { expiresAt: Date.now() + CACHE_MS, value };
      return value;
    } catch (err) {
      console.error("unique icon index failed", err);
      if (disk?.icons) {
        memory = { expiresAt: Date.now() + 60 * 60 * 1000, value: disk };
        return disk;
      }
      return { version: CACHE_VERSION, fetchedAt: new Date().toISOString(), icons: {} };
    }
  })().finally(() => {
    inflight = null;
  });
  return (await inflight).icons;
}
