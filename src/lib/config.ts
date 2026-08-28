export const APP_NAME = "Stashfound";
export const APP_VERSION = "0.1.0";

export function ninjaUserAgent(): string {
  return `stashfound/${APP_VERSION} (PoE1 SSF unique matcher; cache 8h)`;
}

export const NINJA_CACHE_MS = 8 * 60 * 60 * 1000;
export const DEFAULT_MATCH_THRESHOLD = 0.7;
export const MIN_BUILD_UNIQUES = 3;
export const CLUSTER_JACCARD = 0.75;
