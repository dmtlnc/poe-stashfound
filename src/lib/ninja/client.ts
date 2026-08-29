import { ninjaUserAgent } from "../config";
import { parseNdic } from "./ndic";
import { parseNinjaSearch, type ParsedSearch } from "./protobuf";

export type NinjaLeague = { id: string; name?: string };

export type IndexLeague = {
  name: string;
  url: string;
  displayName?: string;
};

export type SnapshotVersion = {
  url: string;
  type: string;
  name: string;
  version: string;
  snapshotName: string;
};

export type IndexState = {
  buildLeagues: IndexLeague[];
  oldBuildLeagues?: IndexLeague[];
  snapshotVersions: SnapshotVersion[];
  economyLeagues?: IndexLeague[];
};

async function ninjaGet(url: string): Promise<Response> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": ninjaUserAgent(),
      Accept: "application/json, application/x-protobuf, application/octet-stream, */*",
    },
  });
  if (!res.ok) {
    throw new Error(`poe.ninja ${url} failed (${res.status})`);
  }
  return res;
}

export async function fetchNinjaLeagues(): Promise<NinjaLeague[]> {
  const idx = await fetchIndexState();
  return idx.buildLeagues.map((l) => ({ id: l.url, name: l.name }));
}

export async function fetchIndexState(): Promise<IndexState> {
  const res = await ninjaGet("https://poe.ninja/poe1/api/data/index-state");
  return res.json() as Promise<IndexState>;
}

export async function fetchBuildSearch(
  version: string,
  overview: string,
  extra: Record<string, string | string[]> = {},
): Promise<ParsedSearch> {
  const url = new URL(`https://poe.ninja/poe1/api/builds/${version}/search`);
  url.searchParams.set("overview", overview);
  url.searchParams.set("type", "exp");
  url.searchParams.set("language", "en");
  for (const [k, v] of Object.entries(extra)) {
    if (Array.isArray(v)) {
      for (const item of v) url.searchParams.append(k, item);
    } else {
      url.searchParams.set(k, v);
    }
  }
  const res = await ninjaGet(url.toString());
  const buf = new Uint8Array(await res.arrayBuffer());
  return parseNinjaSearch(buf);
}

export async function fetchDictionary(hash: string): Promise<string[]> {
  const res = await ninjaGet(
    `https://poe.ninja/poe1/api/builds/dictionary/${hash}`,
  );
  return parseNdic(new Uint8Array(await res.arrayBuffer()));
}

const UNIQUE_TYPES = [
  "UniqueWeapon",
  "UniqueArmour",
  "UniqueAccessory",
  "UniqueFlask",
  "UniqueJewel",
  "ForbiddenJewel",
];

export async function fetchUniqueNameAllowlist(tradeLeague: string): Promise<Set<string>> {
  const icons = await fetchUniqueIcons(tradeLeague);
  return new Set(Object.keys(icons));
}

export async function fetchUniqueIcons(tradeLeague: string): Promise<Record<string, string>> {
  const icons: Record<string, string> = {};
  for (const type of UNIQUE_TYPES) {
    const url = new URL(
      "https://poe.ninja/poe1/api/economy/stash/current/item/overview",
    );
    url.searchParams.set("league", tradeLeague);
    url.searchParams.set("type", type);
    try {
      const res = await ninjaGet(url.toString());
      const data = (await res.json()) as { lines?: { name?: string; icon?: string }[] };
      for (const line of data.lines ?? []) {
        if (line.name && line.icon) icons[line.name] = line.icon;
      }
    } catch {
      // best-effort
    }
  }
  return icons;
}

/** @deprecated old JSON overview; kept for fallback parsing */
export async function fetchBuildOverview(overview: string) {
  const url = new URL("https://poe.ninja/api/data/0/getbuildoverview");
  url.searchParams.set("overview", overview);
  url.searchParams.set("type", "exp");
  url.searchParams.set("language", "en");
  const res = await ninjaGet(url.toString());
  return res.json();
}
