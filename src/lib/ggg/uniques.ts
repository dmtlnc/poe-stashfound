import type { GggItem, UniqueItem, UniqueSource } from "../types";

const MAP_NAME = /\bmaps?\b/i;

export function isUniqueItem(item: GggItem): boolean {
  if (item.identified === false) return false;
  if (item.rarity === "Unique") return true;
  return item.frameType === 3 || item.frameType === 9;
}

export function isMapLike(item: GggItem): boolean {
  if (item.properties?.some((p) => p.name === "Map Tier")) return true;
  const hay = `${item.baseType ?? ""} ${item.typeLine ?? ""} ${item.name ?? ""}`;
  return MAP_NAME.test(hay);
}

export function uniqueName(item: GggItem): string | null {
  if (!isUniqueItem(item) || isMapLike(item)) return null;
  const name = (item.name || item.typeLine || "").trim();
  return name.length > 0 ? name : null;
}

export function collectUniques(
  items: GggItem[] | undefined,
  source: UniqueSource,
  acc: Map<string, UniqueItem>,
) {
  if (!items) return;
  for (const item of items) {
    const name = uniqueName(item);
    if (!name) continue;
    const existing = acc.get(name);
    if (existing) {
      existing.count += 1;
      if (!existing.sources.some((s) => s.type === source.type && s.label === source.label)) {
        existing.sources.push(source);
      }
      continue;
    }
    acc.set(name, {
      name,
      baseType: item.baseType || item.typeLine || "",
      icon: item.icon,
      count: 1,
      sources: [source],
    });
  }
}
