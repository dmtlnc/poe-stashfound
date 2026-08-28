export type PoeladderLadder = {
  identifier: string;
  name: string;
  leagueName?: string;
  indexed?: boolean;
  startDateUTC?: string;
};

export function pickCurrentSsfLadder(
  ladders: PoeladderLadder[],
): PoeladderLadder | null {
  const candidates = ladders.filter((l) => {
    const id = l.identifier.toLowerCase();
    const name = l.name.toLowerCase();
    if (id.includes("standard") || name.includes("standard")) return false;
    if (id.includes("hardcore") || name.includes("hardcore")) return false;
    if (id.includes("ruthless") || name.includes("ruthless")) return false;
    return id.startsWith("ssf_") || name.startsWith("ssf ");
  });
  candidates.sort(
    (a, b) => Date.parse(b.startDateUTC ?? "0") - Date.parse(a.startDateUTC ?? "0"),
  );
  return candidates[0] ?? null;
}
