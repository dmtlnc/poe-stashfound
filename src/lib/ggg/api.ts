import { userAgent } from "../config";
import type { GggCharacter, GggStashTab } from "../types";

const API = "https://api.pathofexile.com";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function gggFetch<T>(path: string, token: string): Promise<T> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const res = await fetch(`${API}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": userAgent(),
        Accept: "application/json",
      },
    });
    if (res.status === 429) {
      const retry = Number(res.headers.get("Retry-After") ?? "2");
      await sleep(Math.max(1000, (retry + 1) * 1000));
      continue;
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GGG ${path} failed (${res.status}): ${text.slice(0, 400)}`);
    }
    return res.json() as Promise<T>;
  }
  throw new Error(`GGG ${path} rate-limited too many times`);
}

export async function getProfile(token: string) {
  return gggFetch<{ name: string; uuid?: string }>("/profile", token);
}

export async function listCharacters(token: string) {
  const data = await gggFetch<{ characters: GggCharacter[] }>("/character", token);
  return data.characters ?? [];
}

export async function getCharacter(token: string, name: string) {
  const data = await gggFetch<{ character?: GggCharacter }>(
    `/character/${encodeURIComponent(name)}`,
    token,
  );
  return data.character;
}

export async function listAccountLeagues(token: string) {
  try {
    const data = await gggFetch<{ leagues?: { id?: string; name: string }[] }>(
      "/account/leagues",
      token,
    );
    if (data.leagues?.length) return data.leagues;
  } catch {
    // fall through
  }
  try {
    const data = await gggFetch<{ leagues?: { id?: string; name: string }[] }>(
      "/league",
      token,
    );
    return data.leagues ?? [];
  } catch {
    return [];
  }
}

export async function listStashes(token: string, league: string) {
  const data = await gggFetch<{ stashes: GggStashTab[] }>(
    `/stash/${encodeURIComponent(league)}`,
    token,
  );
  return data.stashes ?? [];
}

export async function getStash(
  token: string,
  league: string,
  stashId: string,
  substashId?: string,
) {
  const extra = substashId ? `/${encodeURIComponent(substashId)}` : "";
  const data = await gggFetch<{ stash?: GggStashTab }>(
    `/stash/${encodeURIComponent(league)}/${encodeURIComponent(stashId)}${extra}`,
    token,
  );
  return data.stash;
}

export type FlatTab = { id: string; parentId?: string; name: string };

export function flattenStashTabs(
  tabs: GggStashTab[],
  parentId?: string,
): FlatTab[] {
  const out: FlatTab[] = [];
  for (const tab of tabs) {
    const isFolder = Boolean(tab.folder || tab.metadata?.folder);
    if (!isFolder) {
      out.push({
        id: tab.id,
        parentId: parentId ?? tab.parent ?? undefined,
        name: tab.name,
      });
    }
    if (tab.children?.length) {
      out.push(...flattenStashTabs(tab.children, tab.id));
    }
  }
  return out;
}

export { sleep };
