export const APP_NAME = "Stashfound";
export const APP_VERSION = "0.1.0";
export const POE_WHISPER = "dikfaec#0919";
export const GITHUB_REPO_URL = "https://github.com/dmtlnc/poe-stashfound";
export const GITHUB_ISSUES_URL = `${GITHUB_REPO_URL}/issues`;

/** poe.ninja asks for an identifying User-Agent plus a contact. */
export function ninjaUserAgent(): string {
  return `${APP_NAME}/${APP_VERSION} (+${GITHUB_REPO_URL}; contact ${POE_WHISPER} or ${GITHUB_ISSUES_URL})`;
}

export const NINJA_CACHE_MS = 8 * 60 * 60 * 1000;
export const DEFAULT_MATCH_THRESHOLD = 0.7;
export const MIN_BUILD_UNIQUES = 3;
export const CLUSTER_JACCARD = 0.75;
/** Current PoE1 patch, used for YouTube build search queries. */
export const POE_PATCH = "3.29";

