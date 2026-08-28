import type { DivCard } from "../types";

export type UniqueFarmMeta = {
  tier?: number;
  slot?: string;
  boss?: boolean;
  notes?: string;
};

export type FarmWikiIndex = {
  version?: number;
  fetchedAt: string;
  uniques: Record<string, UniqueFarmMeta>;
  cardsByUnique: Record<string, DivCard[]>;
  restricted: Record<string, { dropText?: string; className?: string }>;
};

export const EMPTY_FARM_WIKI: FarmWikiIndex = {
  fetchedAt: "",
  uniques: {},
  cardsByUnique: {},
  restricted: {},
};
