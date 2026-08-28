import type { LadderMode, NinjaMode } from "./leagues/modes";

export type UniqueSource = {
  type: "stash" | "character" | "import";
  label: string;
};

export type UniqueItem = {
  name: string;
  baseType: string;
  icon?: string;
  count: number;
  sources: UniqueSource[];
};

export type InventorySnapshot = {
  league: string;
  ninjaOverview: string;
  accountName: string;
  mock: boolean;
  fetchedAt: string;
  uniques: UniqueItem[];
  tabCount: number;
  characterCount: number;
  /** PoE Ladder SSF league used for import. */
  ladderMode?: LadderMode;
  /** poe.ninja trade-build cache to match against. */
  ninjaMode?: NinjaMode;
  /** Account tag for re-import when switching stash league. */
  ladderAccount?: string;
};

export type FarmKind =
  | "world_drop"
  | "boss"
  | "divination"
  | "vendor"
  | "league_mechanic";

export type DivCard = {
  name: string;
  stack: number;
  where?: string;
};

export type FarmHint = {
  name: string;
  kind: FarmKind;
  summary: string;
  wiki: string;
  cards?: DivCard[];
  notes?: string[];
  tier?: number;
};

export type BuildCluster = {
  id: string;
  className: string;
  ascendancy?: string;
  mainSkill?: string;
  uniqueNames: string[];
  characterCount: number;
  example: {
    account: string;
    name: string;
    level: number;
  };
  ninjaUrl: string;
};

export type MatchResult = {
  cluster: BuildCluster;
  score: number;
  owned: string[];
  missing: string[];
  /** Counted names owned (roll-chase omitted when that toggle is on). */
  nameHits: number;
  nameTotal: number;
  variantWarnings: string[];
};

export type GggItem = {
  name?: string;
  typeLine?: string;
  baseType?: string;
  rarity?: string;
  frameType?: number;
  identified?: boolean;
  icon?: string;
  inventoryId?: string;
  properties?: { name: string }[];
};

export type GggCharacter = {
  name: string;
  class: string;
  league?: string;
  level: number;
  equipment?: GggItem[];
  inventory?: GggItem[];
  rucksack?: GggItem[];
  jewels?: GggItem[];
  guardian?: GggItem[];
};

export type GggStashTab = {
  id: string;
  name: string;
  parent?: string | null;
  folder?: boolean;
  metadata?: { folder?: boolean };
  children?: GggStashTab[];
  items?: GggItem[];
};
