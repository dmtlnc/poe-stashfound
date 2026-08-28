export function wikiUrl(name: string): string {
  const slug = name.replaceAll(" ", "_");
  return `https://www.poewiki.net/wiki/${encodeURIComponent(slug)}`;
}
