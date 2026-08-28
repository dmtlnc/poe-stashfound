/** Unique names where owning the name is not the same as owning the right roll. */
export const VARIANT_UNIQUES = new Set([
  "Watcher's Eye",
  "Forbidden Flesh",
  "Forbidden Flame",
  "The Golden Rule",
  "Elegant Hubris",
  "Lethal Pride",
  "Brutal Restraint",
  "Glorious Vanity",
  "Militant Faith",
  "The Light of Meaning",
  "Large Cluster Jewel",
  "Medium Cluster Jewel",
  "Small Cluster Jewel",
  "Split Personality",
  "Voices",
  "Megalomaniac",
  "The Green Nightmare",
  "The Red Nightmare",
  "The Blue Nightmare",
  "Thread of Hope",
  "The Blue Dream",
  "The Green Dream",
  "The Red Dream",
  "Skin of the Lords",
  "Skin of the Loyal",
  "The Saviour",
  "Lioneye's Fall",
  "Impossible Escape",
  "Apex of Sacrifice",
]);

export function isVariantUnique(name: string): boolean {
  return VARIANT_UNIQUES.has(name) || /cluster jewel/i.test(name);
}

export function variantWarning(name: string): string {
  return `${name} is roll-dependent — owning the name is not enough; check the mods.`;
}
