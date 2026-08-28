import { POE_PATCH } from "./config";

/** YouTube results page for this skill + class in the current patch. Not a specific video. */
export function youtubeBuildSearchUrl(opts: {
  skill?: string;
  className: string;
  patch?: string;
}): string {
  const query = [opts.skill, opts.className, opts.patch ?? POE_PATCH]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(" ");
  const params = new URLSearchParams({ search_query: query });
  return `https://www.youtube.com/results?${params.toString()}`;
}
