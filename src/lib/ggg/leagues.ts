import type { NinjaMode } from "../leagues/modes";

export function isChallengeSsfBuildLeague(name: string, url: string): boolean {
  const n = name.toLowerCase();
  if (url.startsWith("pl")) return false;
  if (n.includes("standard")) return false;
  if (n.includes("ruthless") || n.startsWith("ssf r ") || n.includes("ssf r ")) {
    return false;
  }
  if (n.startsWith("hc ") || n.includes("hardcore") || n.includes("hcssf")) {
    return false;
  }
  return n.startsWith("ssf ");
}

/** Softcore trade challenge league (e.g. Allflame), not SSF/HC/Standard/Ruthless/private. */
export function isChallengeTradeBuildLeague(name: string, url: string): boolean {
  const n = name.toLowerCase();
  if (url.startsWith("pl")) return false;
  if (n.includes("standard")) return false;
  if (n.includes("ruthless") || n.startsWith("ssf ")) return false;
  if (n.startsWith("hc ") || n.includes("hardcore")) return false;
  return true;
}

/** Hardcore trade challenge league (e.g. Hardcore Allflame). */
export function isChallengeHcTradeBuildLeague(name: string, url: string): boolean {
  const n = name.toLowerCase();
  if (url.startsWith("pl")) return false;
  if (n.includes("standard")) return false;
  if (n.includes("ruthless") || n.includes("ssf")) return false;
  return n.startsWith("hardcore ") || n.startsWith("hc ");
}

export function isStandardTradeBuildLeague(name: string, url: string): boolean {
  return !url.startsWith("pl") && name.toLowerCase() === "standard";
}

/** Current challenge-league SSF (e.g. SSF Allflame), not Standard/HC/Ruthless/private. */
export function pickCurrentSsfBuildLeague(
  leagues: { name: string; url: string; displayName?: string }[],
): { name: string; url: string; displayName?: string } | null {
  return leagues.find((l) => isChallengeSsfBuildLeague(l.name, l.url)) ?? null;
}

export function pickCurrentTradeBuildLeague(
  leagues: { name: string; url: string; displayName?: string }[],
): { name: string; url: string; displayName?: string } | null {
  return leagues.find((l) => isChallengeTradeBuildLeague(l.name, l.url)) ?? null;
}

export function pickCurrentHcTradeBuildLeague(
  leagues: { name: string; url: string; displayName?: string }[],
): { name: string; url: string; displayName?: string } | null {
  return leagues.find((l) => isChallengeHcTradeBuildLeague(l.name, l.url)) ?? null;
}

type NinjaLeagueRow = { name: string; url: string; displayName?: string };

/** Trade poe.ninja build league for a cached mode (not SSF). */
export function pickTradeBuildLeagueByMode(
  leagues: NinjaLeagueRow[],
  mode: NinjaMode,
): NinjaLeagueRow | null {
  if (mode === "standard") {
    return leagues.find((l) => isStandardTradeBuildLeague(l.name, l.url)) ?? null;
  }
  if (mode === "allflamehc") {
    return pickCurrentHcTradeBuildLeague(leagues);
  }
  return pickCurrentTradeBuildLeague(leagues);
}

/** Economy league used for unique-name allowlists / icons. */
export function economyLeagueNameForMode(
  economy: NinjaLeagueRow[] | undefined,
  mode: NinjaMode,
  fallback: string,
): string {
  const list = economy ?? [];
  if (mode === "standard") {
    return list.find((l) => l.name.toLowerCase() === "standard")?.name ?? "Standard";
  }
  if (mode === "allflamehc") {
    return (
      pickCurrentHcTradeBuildLeague(list)?.name ??
      list.find((l) => /hardcore/i.test(l.name) && !/ssf|standard|ruthless/i.test(l.name))
        ?.name ??
      fallback
    );
  }
  return pickCurrentTradeBuildLeague(list)?.name ?? fallback;
}

export function ninjaOverviewSlug(leagueName: string): string {
  return leagueName
    .toLowerCase()
    .replaceAll("solo self-found", "ssf")
    .replaceAll("solo self found", "ssf")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export type LeaguePick = {
  gggName: string;
  ninjaOverview: string;
  ninjaUrl?: string;
};

export function isCurrentSsfLeagueName(name: string): boolean {
  return isChallengeSsfBuildLeague(name, ninjaOverviewSlug(name));
}

export function pickSsfLeague(
  gggLeagues: { id?: string; name: string }[],
  ninjaLeagues: { id: string; name?: string }[],
  override?: { gggName?: string; ninjaOverview?: string },
): LeaguePick | null {
  if (override?.gggName || override?.ninjaOverview) {
    const overview =
      override.ninjaOverview ||
      ninjaOverviewSlug(override.gggName ?? "");
    return {
      gggName: override.gggName || overview,
      ninjaOverview: overview,
    };
  }

  const fromNinja = ninjaLeagues.find((l) =>
    isChallengeSsfBuildLeague(l.name ?? l.id, l.id),
  );
  if (fromNinja) {
    const match = gggLeagues.find((l) =>
      isChallengeSsfBuildLeague(l.name, ninjaOverviewSlug(l.name)),
    );
    return {
      gggName: match?.name ?? fromNinja.name ?? fromNinja.id,
      ninjaOverview: fromNinja.id,
    };
  }

  const gggSsf = gggLeagues.find((l) =>
    isChallengeSsfBuildLeague(l.name, ninjaOverviewSlug(l.name)),
  );
  if (gggSsf) {
    return {
      gggName: gggSsf.name,
      ninjaOverview: ninjaOverviewSlug(gggSsf.name),
    };
  }
  return null;
}
