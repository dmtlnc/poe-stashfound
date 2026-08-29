import { createHash } from "node:crypto";
import { MIN_BUILD_UNIQUES } from "../config";
import type { NinjaMode } from "../leagues/modes";
import type { BuildCluster } from "../types";
import { ninjaBuildsUrl } from "./url";

export function clusterId(
  ninjaMode: NinjaMode,
  className: string,
  skill: string,
  uniques: string[],
): string {
  const key = `${ninjaMode}|${className}|${skill}|${[...uniques].sort().join(",")}`;
  return `${ninjaMode}-${createHash("sha1").update(key).digest("hex").slice(0, 16)}`;
}

export function buildClusterFromMeta(opts: {
  ninjaMode: NinjaMode;
  className: string;
  skill: string;
  uniqueNames: string[];
  characterCount: number;
  ninjaOverview: string;
  ninjaUrlSlug: string;
}): BuildCluster | null {
  if (opts.uniqueNames.length < MIN_BUILD_UNIQUES) return null;
  return {
    id: clusterId(opts.ninjaMode, opts.className, opts.skill, opts.uniqueNames),
    className: opts.className,
    ascendancy: opts.className,
    mainSkill: opts.skill,
    uniqueNames: opts.uniqueNames,
    characterCount: opts.characterCount,
    example: { account: "poe.ninja", name: opts.skill, level: 0 },
    ninjaUrl: ninjaBuildsUrl({
      ninjaUrlSlug: opts.ninjaUrlSlug,
      ninjaOverview: opts.ninjaOverview,
      skill: opts.skill,
      uniqueNames: opts.uniqueNames,
      className: opts.className,
    }),
  };
}
