import { parsePoeladderAccount } from "../import/parse";
import { ninjaUserAgent } from "../config";
import {
  parseStashfoundLeagues,
  parseStashfoundNames,
  pickStashfoundLeague,
  stashfoundLeaguesUrl,
  stashfoundUniquesUrl,
} from "./ladders";
import { DEFAULT_LADDER_MODE, parseLadderMode, type LadderMode } from "../leagues/modes";

export type LadderUniquesResult = {
  names: string[];
  user?: string;
  accountHint: string;
};

async function stashfoundGet(url: string): Promise<Response> {
  return fetch(url, {
    headers: {
      "User-Agent": ninjaUserAgent(),
      Accept: "application/json",
    },
  });
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
  const user = parsed.user;
  const leaguesRes = await stashfoundGet(stashfoundLeaguesUrl(user));
  if (!leaguesRes.ok) {
    throw new Error(`PoE Ladder leagues failed (${leaguesRes.status})`);
  }
  const leagues = parseStashfoundLeagues(await leaguesRes.json());
  const pick = pickStashfoundLeague(
    leagues,
    parseLadderMode(ladderMode ?? DEFAULT_LADDER_MODE),
    parsed.ladderIdentifier,
  );
  if (!pick) {
    throw new Error("Could not find that league on PoE Ladder.");
  }

  const uniquesRes = await stashfoundGet(stashfoundUniquesUrl(user, pick.identifier));
  if (!uniquesRes.ok) {
    throw new Error(`PoE Ladder uniques failed (${uniquesRes.status})`);
  }
  const names = parseStashfoundNames(await uniquesRes.json());
  return { names, user, accountHint: user };
}
