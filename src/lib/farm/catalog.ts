import catalog from "@/data/farm-catalog.json";
import type { DivCard, FarmHint, FarmKind } from "../types";
import { wikiUrl } from "../wiki";
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
  return text.replace(/\[\[(?:[^|\]]+\|)?([^\]]+)\]\]/g, "$1").replaceAll("'''", "").trim();
}

function genesisNote(slot?: string): string {
  const target = slot ? `, targeting ${slot}` : "";
  return `Farm the Genesis Tree with Ancient Wombgifts (unique womb)${target}.`;
}

function buildHint(name: string, wiki: FarmWikiIndex): FarmHint {
  const catalogEntry = entries[name];
  const meta = wiki.uniques[name];
  const restricted = wiki.restricted[name];
  const cards: DivCard[] = [
    ...(wiki.cardsByUnique[name] ?? []),
    ...(catalogEntry?.cards ?? []).filter(
      (c) => !(wiki.cardsByUnique[name] ?? []).some((w) => w.name === c.name),
    ),
  ];
  const slot = meta?.slot || restricted?.className;
  const isBoss =
    catalogEntry?.kind === "boss" ||
    Boolean(meta?.boss) ||
    Boolean(restricted) ||
    BOSS_GROUPS.test(meta?.notes ?? "");

  const notes: string[] = [];
  if (catalogEntry?.notes) notes.push(...catalogEntry.notes);

  if (cards.length > 0) {
    const cardNames = cards.map((c) => (c.stack ? `${c.name} (${c.stack})` : c.name)).join(", ");
    const extra = isBoss
      ? catalogEntry?.summary ??
        (restricted?.dropText ? stripWiki(restricted.dropText) : undefined) ??
        "Also a boss/restricted drop."
      : genesisNote(slot);
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
      summary:
        catalogEntry?.summary ??
        (restricted?.dropText ? stripWiki(restricted.dropText) : undefined) ??
        "Boss / drop-restricted unique. Farm the specific encounter; Genesis Tree will not replace that drop.",
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
