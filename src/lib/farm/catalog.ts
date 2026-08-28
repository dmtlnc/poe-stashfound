import catalog from "@/data/farm-catalog.json";
import type { DivCard, FarmHint, FarmKind } from "../types";
import { decodeHtml, itemName, wikiUrl } from "../wiki";
import type { FarmWikiIndex } from "./types";

type CatalogEntry = {
  kind: FarmKind;
  summary: string;
  cards?: { name: string; stack: number; where?: string }[];
  notes?: string[];
};

const entries = catalog as Record<string, CatalogEntry>;
const BOSS_GROUPS = /boss|uber|pinnacle/i;

function stripWiki(text: string): string {
  return decodeHtml(text)
    .replace(/<[^>]+>/g, " ")
    .replace(/\[\[(?:[^|\]]+\|)?([^\]]+)\]\]/g, "$1")
    .replaceAll("'''", "")
    .replace(/\b\d+x\d+px\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function wikiDropSummary(dropText?: string): string | undefined {
  if (!dropText) return;
  const cleaned = stripWiki(dropText);
  if (cleaned.length < 12 || /hoverbox/i.test(cleaned)) return;
  const sentence = cleaned.match(/^(.+?[.!?])(?:\s|$)/);
  return (sentence?.[1] ?? cleaned).slice(0, 240);
}

function genesisNote(slot?: string): string {
  const target = slot ? `, targeting ${slot}` : "";
  return `Farm the Genesis Tree with Ancient Wombgifts (unique womb)${target}.`;
}

function mergeCards(
  wikiCards: DivCard[],
  catalogCards: DivCard[] | undefined,
): DivCard[] {
  const byName = new Map<string, DivCard>();
  for (const card of wikiCards) {
    const name = itemName(card.name);
    byName.set(name, { ...card, name });
  }
  for (const card of catalogCards ?? []) {
    const name = itemName(card.name);
    const prev = byName.get(name);
    if (!prev) {
      byName.set(name, { ...card, name });
      continue;
    }
    byName.set(name, {
      ...prev,
      stack: prev.stack || card.stack,
      where:
        !prev.where || prev.where.startsWith("See the wiki")
          ? card.where ?? prev.where
          : prev.where,
    });
  }
  return [...byName.values()];
}

function buildHint(name: string, wiki: FarmWikiIndex): FarmHint {
  const catalogEntry = entries[name];
  const meta = wiki.uniques[name];
  const restricted = wiki.restricted[name];
  const cards = mergeCards(wiki.cardsByUnique[name] ?? [], catalogEntry?.cards);
  const slot = meta?.slot || restricted?.className;
  const isBoss =
    catalogEntry?.kind === "boss" ||
    Boolean(meta?.boss) ||
    Boolean(restricted) ||
    BOSS_GROUPS.test(meta?.notes ?? "");

  const wikiDrop = wikiDropSummary(restricted?.dropText);
  const bossSummary =
    wikiDrop ??
    catalogEntry?.summary ??
    "Boss / drop-restricted unique. Farm the specific encounter; Genesis Tree will not replace that drop.";

  const notes: string[] = [];
  if (catalogEntry?.notes) notes.push(...catalogEntry.notes);

  if (cards.length > 0) {
    const cardNames = cards.map((c) => (c.stack ? `${c.name} (${c.stack})` : c.name)).join(", ");
    const extra = isBoss ? bossSummary : genesisNote(slot);
    return {
      name,
      kind: "divination",
      summary: `Collect ${cardNames}. ${extra}`,
      wiki: wikiUrl(name),
      cards,
      notes: notes.length ? notes : undefined,
      tier: meta?.tier,
    };
  }

  if (isBoss) {
    return {
      name,
      kind: "boss",
      summary: bossSummary,
      wiki: wikiUrl(name),
      notes: notes.length ? notes : undefined,
      tier: meta?.tier,
    };
  }

  return {
    name,
    kind: "league_mechanic",
    summary: `${genesisNote(slot)} This is not a boss-gated unique.`,
    wiki: wikiUrl(name),
    notes: notes.length ? notes : undefined,
    tier: meta?.tier,
  };
}

export function farmHintsForNames(names: string[], wiki: FarmWikiIndex): FarmHint[] {
  return names.map((name) => buildHint(name, wiki));
}
