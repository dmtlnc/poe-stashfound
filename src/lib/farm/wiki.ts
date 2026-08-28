import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ninjaUserAgent } from "../config";
import { decodeHtml, itemName } from "../wiki";
import type { DivCard } from "../types";
import type { FarmWikiIndex, UniqueFarmMeta } from "./types";

export { itemName };

export type { FarmWikiIndex, UniqueFarmMeta } from "./types";

const CACHE_MS = 24 * 60 * 60 * 1000;
const CACHE_VERSION = 3;
const cacheFile = path.join(process.cwd(), "data", "cache", "farm-wiki.json");
const TIERS_PAGE = "Guide:Analysis_of_unique_item_tiers";
const SKIP_HEADINGS = /^(tier |distributions|testing |caveats|notes|references|see also|external)/i;

let memory: { expiresAt: number; value: FarmWikiIndex } | null = null;
let inflight: Promise<FarmWikiIndex> | null = null;

async function wikiGet(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": ninjaUserAgent(), Accept: "application/json, text/plain" },
  });
  if (!res.ok) throw new Error(`poewiki ${url} failed (${res.status})`);
  return res.text();
}

export async function cargoQuery(
  tables: string,
  fields: string,
  where: string,
  limit = 500,
): Promise<Record<string, string | null>[]> {
  const rows: Record<string, string | null>[] = [];
  for (let offset = 0; offset < 4000; offset += limit) {
    const url = new URL("https://www.poewiki.net/w/api.php");
    url.searchParams.set("action", "cargoquery");
    url.searchParams.set("tables", tables);
    url.searchParams.set("fields", fields);
    url.searchParams.set("where", where);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("format", "json");
    const json = JSON.parse(await wikiGet(url.toString())) as {
      cargoquery?: { title: Record<string, string | null> }[];
      error?: { info?: string };
    };
    if (json.error) throw new Error(json.error.info ?? "cargoquery failed");
    const batch = json.cargoquery ?? [];
    if (batch.length === 0) break;
    for (const row of batch) {
      const title: Record<string, string | null> = {};
      for (const [k, v] of Object.entries(row.title)) {
        title[k.replaceAll(" ", "_")] = v;
      }
      rows.push(title);
    }
    if (batch.length < limit) break;
  }
  return rows;
}

function remapKeys<T>(obj: Record<string, T>, merge?: (a: T, b: T) => T): Record<string, T> {
  const out: Record<string, T> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = itemName(k);
    out[key] = out[key] != null && merge ? merge(out[key], v) : v;
  }
  return out;
}

function normalizeIndex(index: FarmWikiIndex): FarmWikiIndex {
  return {
    ...index,
    version: CACHE_VERSION,
    uniques: remapKeys(index.uniques, (a, b) => ({
      ...a,
      ...b,
      boss: Boolean(a.boss || b.boss),
      tier: b.tier ?? a.tier,
      slot: b.slot ?? a.slot,
    })),
    cardsByUnique: remapKeys(
      Object.fromEntries(
        Object.entries(index.cardsByUnique).map(([key, cards]) => [
          key,
          cards.map((card) => ({
            ...card,
            name: itemName(card.name),
            where: card.where ? itemName(card.where) : card.where,
          })),
        ]),
      ),
      (a, b) => {
        const names = new Set(a.map((c) => c.name));
        return [...a, ...b.filter((c) => !names.has(c.name))];
      },
    ),
    restricted: remapKeys(index.restricted, (a, b) => {
      const dropText = b.dropText ?? a.dropText;
      return {
        dropText: dropText ? decodeHtml(dropText) : undefined,
        className: b.className ?? a.className,
      };
    }),
  };
}

function uniqueRewardsFromCardHtml(html: string): string[] {
  const decoded = decodeHtml(html);
  if (!/tc -unique/.test(decoded)) return [];
  const names: string[] = [];
  const uniqueBlocks = decoded.split(/tc -unique/);
  for (const block of uniqueBlocks.slice(1)) {
    const chunk = block.slice(0, 800);
    for (const m of chunk.matchAll(/\[\[([^\]|#]+)(?:\|[^\]]*)?\]\]/g)) {
      const name = itemName(m[1].replaceAll("_", " "));
      if (name && !/^File:/i.test(name) && !names.includes(name)) names.push(name);
    }
  }
  return names;
}

export function parseUniqueTierWikitext(wikitext: string): Record<string, UniqueFarmMeta> {
  const out: Record<string, UniqueFarmMeta> = {};
  let slot = "";
  for (const rawLine of wikitext.split(/\r?\n/)) {
    const heading = rawLine.match(/^={2,3}\s*(.+?)\s*={2,3}$/);
    if (heading) {
      const title = heading[1].replaceAll(/\[\[|\]\]/g, "").trim();
      slot = SKIP_HEADINGS.test(title) ? "" : title;
      continue;
    }
    const row = rawLine.match(/^\|\s*\[\[([^\]]+)\]\]\s*\|(.*)$/);
    if (!row) continue;
    const name = itemName(row[1].split("|")[0]);
    const rest = row[2];
    const cells = rest.split("||").map((c) => c.trim());
    const notes = cells.at(-1)?.includes(" ") ? cells.at(-1) : undefined;
    let tier: number | undefined;
    for (let i = cells.length - 1; i >= 0; i--) {
      const m = cells[i].match(/(\d)\s*(?:<sup|$)/);
      if (m) {
        tier = Number(m[1]);
        break;
      }
    }
    const noteText = (notes ?? rest).replaceAll(/\{\{[^}]+\}\}/g, " ");
    const boss = /boss drop/i.test(noteText);
    out[name] = { tier, slot: slot || undefined, boss, notes: notes?.slice(0, 180) };
  }
  return out;
}

async function buildIndex(): Promise<FarmWikiIndex> {
  const raw = await wikiGet(
    `https://www.poewiki.net/wiki/${encodeURIComponent(TIERS_PAGE)}?action=raw`,
  );
  const uniques = parseUniqueTierWikitext(raw);

  const cardRows = await cargoQuery(
    "items",
    "name,description",
    'class_id="DivinationCard"',
    100,
  );
  const cardsByUnique: Record<string, DivCard[]> = {};
  for (const row of cardRows) {
    const cardName = row.name ? itemName(row.name) : "";
    const html = row.description ?? "";
    if (!cardName || !html) continue;
    for (const unique of uniqueRewardsFromCardHtml(html)) {
      const list = cardsByUnique[unique] ?? [];
      if (!list.some((c) => c.name === cardName)) {
        list.push({
          name: cardName,
          stack: 0,
          where: "See the wiki card page for drop areas",
        });
        cardsByUnique[unique] = list;
      }
    }
  }

  const restrictedRows = await cargoQuery(
    "items",
    "name,is_drop_restricted,drop_text,class",
    'rarity_id="unique" AND is_drop_restricted="1"',
    100,
  );
  const restricted: FarmWikiIndex["restricted"] = {};
  for (const row of restrictedRows) {
    if (!row.name) continue;
    const name = itemName(row.name);
    restricted[name] = {
      dropText: row.drop_text ? decodeHtml(row.drop_text) : undefined,
      className: row.class ?? undefined,
    };
    if (uniques[name]) uniques[name].boss = true;
    else uniques[name] = { boss: true, slot: row.class ?? undefined };
  }

  return normalizeIndex({
    fetchedAt: new Date().toISOString(),
    uniques,
    cardsByUnique,
    restricted,
  });
}

async function readDisk(): Promise<FarmWikiIndex | null> {
  try {
    const raw = await readFile(cacheFile, "utf8");
    return JSON.parse(raw) as FarmWikiIndex;
  } catch {
    return null;
  }
}

async function writeDisk(value: FarmWikiIndex) {
  await mkdir(path.dirname(cacheFile), { recursive: true });
  await writeFile(cacheFile, JSON.stringify(value));
}

export async function getFarmWikiIndex(): Promise<FarmWikiIndex> {
  const now = Date.now();
  if (memory && memory.expiresAt > now && memory.value.version === CACHE_VERSION) {
    return memory.value;
  }
  if (inflight) return inflight;
  inflight = (async () => {
    const disk = await readDisk();
    if (disk && Date.now() - Date.parse(disk.fetchedAt) < CACHE_MS) {
      const value = normalizeIndex(disk);
      if (disk.version !== CACHE_VERSION) await writeDisk(value);
      memory = { expiresAt: Date.parse(disk.fetchedAt) + CACHE_MS, value };
      return value;
    }
    try {
      const value = await buildIndex();
      await writeDisk(value);
      memory = { expiresAt: Date.now() + CACHE_MS, value };
      return value;
    } catch (err) {
      console.error("wiki farm index failed", err);
      if (disk) return normalizeIndex(disk);
      return {
        version: CACHE_VERSION,
        fetchedAt: new Date().toISOString(),
        uniques: {},
        cardsByUnique: {},
        restricted: {},
      };
    }
  })().finally(() => {
    inflight = null;
  });
  return inflight;
}
