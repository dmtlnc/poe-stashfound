import { ninjaUserAgent } from "../config";
import { parsePoeladderAccount } from "../import/parse";
import { pickLadderByMode, type PoeladderLadder } from "./ladders";
import { DEFAULT_LADDER_MODE, parseLadderMode, type LadderMode } from "../leagues/modes";

const BASE = "https://poeladder.com/api/v1";
const BUNDLE_RE = /\/assets\/index-[^"]+\.js/;
const JWT_RE = /REACT_APP_JWT:"([^"]+)"/;

let jwtMemory: { token: string; expiresAt: number } | null = null;

async function publicClientToken(): Promise<string> {
  if (jwtMemory && jwtMemory.expiresAt > Date.now()) return jwtMemory.token;
  const page = await fetch("https://poeladder.com/uniques", {
    headers: { "User-Agent": ninjaUserAgent(), Accept: "text/html" },
  });
  if (!page.ok) throw new Error(`PoE Ladder page failed (${page.status})`);
  const html = await page.text();
  const bundlePath = html.match(BUNDLE_RE)?.[0];
  if (!bundlePath) throw new Error("Could not find PoE Ladder app bundle");
  const js = await fetch(`https://poeladder.com${bundlePath}`, {
    headers: { "User-Agent": ninjaUserAgent() },
  });
  if (!js.ok) throw new Error(`PoE Ladder bundle failed (${js.status})`);
  const token = JWT_RE.exec(await js.text())?.[1];
  if (!token) throw new Error("Could not read PoE Ladder public client token");
  jwtMemory = { token, expiresAt: Date.now() + 6 * 60 * 60 * 1000 };
  return token;
}

async function poeladderGet(url: string): Promise<Response> {
  const token = await publicClientToken();
  return fetch(url, {
    headers: {
      "User-Agent": ninjaUserAgent(),
      Accept: "application/json",
      "jwt-auth": token,
    },
  });
}

export type LadderUnique = {
  name: string;
  owned?: boolean;
  grouping?: string;
  category?: string;
  baseItem?: string;
};

export type LadderUniquesResult = {
  names: string[];
  uniques: LadderUnique[];
  user?: string;
  accountHint: string;
};

async function resolveLadder(mode: LadderMode = DEFAULT_LADDER_MODE): Promise<string> {
  const override = process.env.POE_LADDER_IDENTIFIER?.trim();
  if (override) return override;
  const res = await poeladderGet(`${BASE}/ladders`);
  if (!res.ok) throw new Error(`PoE Ladder ladders failed (${res.status})`);
  const ladders = (await res.json()) as PoeladderLadder[];
  const pick = pickLadderByMode(ladders, mode);
  if (!pick) throw new Error("Could not detect that league on PoE Ladder.");
  return pick.identifier;
}

export async function fetchOwnedUniques(
  user: string,
  ladderIdentifier: string,
): Promise<LadderUniquesResult> {
  const url = new URL(`${BASE}/users/${encodeURIComponent(user)}/uniques`);
  url.searchParams.set("ladderIdentifier", ladderIdentifier);
  url.searchParams.set("display", "owned");
  url.searchParams.set("status", "active");
  url.searchParams.set("excludeLeagueUniques", "1");
  const res = await poeladderGet(url.toString());
  if (!res.ok) {
    throw new Error(`PoE Ladder uniques failed (${res.status})`);
  }
  const data = (await res.json()) as {
    uniques?: Record<string, unknown>[];
    user?: string;
    userAlias?: string;
  };
  const uniques: LadderUnique[] = (data.uniques ?? [])
    .map((row) => ({
      name: String(row.name ?? "").trim(),
      owned: Boolean(row.owned ?? true),
      grouping: row.grouping ? String(row.grouping) : undefined,
      category: row.category ? String(row.category) : undefined,
      baseItem: row.baseItem ? String(row.baseItem) : undefined,
    }))
    .filter((u) => u.name.length > 0 && u.owned !== false);
  const names = [...new Set(uniques.map((u) => u.name))];
  return {
    names,
    uniques,
    user: data.user,
    accountHint: user,
  };
}

export async function fetchUniquesFromPoeladderInput(
  raw: string,
  ladderMode?: LadderMode,
): Promise<LadderUniquesResult> {
  const parsed = parsePoeladderAccount(raw);
  if (!parsed?.user) {
    throw new Error(
      "Need a PoE Ladder account like name-1234, or a Uniques URL with user=.",
    );
  }
  const ladder =
    parsed.ladderIdentifier || (await resolveLadder(parseLadderMode(ladderMode)));
  return fetchOwnedUniques(parsed.user, ladder);
}
