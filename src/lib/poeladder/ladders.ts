import type { LadderMode } from "../leagues/modes";

export type PoeladderLadder = {
  identifier: string;
  name: string;
  leagueName?: string;
  indexed?: boolean;
  startDateUTC?: string;
};

function hay(l: PoeladderLadder): string {
  return `${l.identifier} ${l.name} ${l.leagueName ?? ""}`.toLowerCase();
}

function isRuthless(l: PoeladderLadder): boolean {
  return /ruthless|\bssf r\b|\bssfr\b/.test(hay(l));
}

function isStandard(l: PoeladderLadder): boolean {
  return hay(l).includes("standard");
}

function isHcSsf(l: PoeladderLadder): boolean {
  const h = hay(l);
  const id = l.identifier.toLowerCase();
  return (
    id.startsWith("hcssf") ||
    id.includes("hcssf") ||
    (id.startsWith("ssf_") && id.includes("hardcore")) ||
    h.includes("hcssf") ||
    h.includes("hc ssf") ||
    h.includes("hardcore ssf") ||
    h.includes("ssf hardcore")
  );
}

function isSsfSc(l: PoeladderLadder): boolean {
  if (isHcSsf(l) || isRuthless(l)) return false;
  const id = l.identifier.toLowerCase();
  const name = l.name.toLowerCase();
  return id.startsWith("ssf_") || name.startsWith("ssf ");
}

function isTradeStandard(l: PoeladderLadder): boolean {
  if (isRuthless(l) || isSsfSc(l) || isHcSsf(l)) return false;
  const id = l.identifier.toLowerCase();
  const name = l.name.toLowerCase();
  return id === "standard" || name === "standard";
}

function newest(list: PoeladderLadder[]): PoeladderLadder | null {
  const copy = [...list];
  copy.sort(
    (a, b) => Date.parse(b.startDateUTC ?? "0") - Date.parse(a.startDateUTC ?? "0"),
  );
  return copy[0] ?? null;
}

export function pickCurrentSsfLadder(
  ladders: PoeladderLadder[],
): PoeladderLadder | null {
  return pickLadderByMode(ladders, "ssf-allflame");
}

export function pickLadderByMode(
  ladders: PoeladderLadder[],
  mode: LadderMode,
): PoeladderLadder | null {
  const list = ladders.filter((l) => l.identifier && !isRuthless(l));
  if (mode === "ssf-standard") {
    return newest(list.filter((l) => isSsfSc(l) && isStandard(l)));
  }
  if (mode === "standard") {
    return newest(list.filter(isTradeStandard));
  }
  if (mode === "hcssf-allflame") {
    return newest(list.filter((l) => isHcSsf(l) && !isStandard(l)));
  }
  return newest(list.filter((l) => isSsfSc(l) && !isStandard(l)));
}

