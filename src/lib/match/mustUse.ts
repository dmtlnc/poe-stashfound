import catalog from "@/data/farm-catalog.json";
import type { FarmWikiIndex } from "../farm/types";

type CatalogEntry = { kind?: string; summary?: string };

const entries = catalog as Record<string, CatalogEntry>;

/** T0–T2 on the wiki tier list. Ignore parse junk like 8/9. */
function isRareTier(tier: number | undefined): boolean {
  return tier === 0 || tier === 1 || tier === 2;
}

const PINNACLE =
  /\b(uber\s+)?(the\s+)?(shaper|elder|maven|sirus|awakener|searing exarch|eater of worlds|atziri|cortex|the feared|incarnation of (?:dread|fear|neglect)|lycia)\b/i;

function plain(text: string): string {
  return text
    .replace(/<[^>]+>/g, " ")
    .replace(/\[\[[^|\]]*\|/g, "")
    .replaceAll("[[", " ")
    .replaceAll("]]", " ")
    .replace(/&[a-z#0-9]+;/gi, " ");
}

function isPinnacleDrop(name: string, wiki: FarmWikiIndex): boolean {
  if (entries[name]?.kind === "boss") return true;
  const meta = wiki.uniques[name];
  const drop = wiki.restricted[name]?.dropText ?? "";
  const blob = plain(`${drop} ${meta?.notes ?? ""} ${entries[name]?.summary ?? ""}`);
  return PINNACLE.test(blob);
}

/** Must-use picker: T0–T2, plus pinnacle-boss drops. */
export function isMustUseUnique(name: string, wiki: FarmWikiIndex): boolean {
  if (isRareTier(wiki.uniques[name]?.tier)) return true;
  return isPinnacleDrop(name, wiki);
}
