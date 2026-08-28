/** Wiki cargo and drop text encode apostrophes as HTML entities. */
export function decodeHtml(s: string): string {
  let out = s;
  for (let i = 0; i < 3; i++) {
    const next = out
      .replaceAll("&nbsp;", " ")
      .replaceAll("&quot;", '"')
      .replaceAll("&apos;", "'")
      .replaceAll("&lt;", "<")
      .replaceAll("&gt;", ">")
      .replaceAll("&amp;", "&")
      .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
        String.fromCodePoint(parseInt(hex, 16)),
      )
      .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)));
    if (next === out) break;
    out = next;
  }
  return out;
}

export function itemName(name: string): string {
  return decodeHtml(name).replaceAll("\u2019", "'").trim();
}

export function wikiUrl(name: string): string {
  const slug = itemName(name).replaceAll(" ", "_");
  return `https://www.poewiki.net/wiki/${encodeURIComponent(slug)}`;
}
