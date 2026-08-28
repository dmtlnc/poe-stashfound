/** PoE1 base class from an ascendancy (or already-base) name. */
const ASCENDANCY_TO_BASE: Record<string, string> = {
  Juggernaut: "Marauder",
  Berserker: "Marauder",
  Chieftain: "Marauder",
  Slayer: "Duelist",
  Gladiator: "Duelist",
  Champion: "Duelist",
  Deadeye: "Ranger",
  Raider: "Ranger",
  Pathfinder: "Ranger",
  Warden: "Ranger",
  Assassin: "Shadow",
  Saboteur: "Shadow",
  Trickster: "Shadow",
  Necromancer: "Witch",
  Elementalist: "Witch",
  Occultist: "Witch",
  Inquisitor: "Templar",
  Hierophant: "Templar",
  Guardian: "Templar",
  Ascendant: "Scion",
  Reliquarian: "Scion",
  Luminary: "Scion",
};

export const BASE_CLASSES = [
  "Marauder",
  "Duelist",
  "Ranger",
  "Shadow",
  "Witch",
  "Templar",
  "Scion",
] as const;

const BASE_SET = new Set<string>(BASE_CLASSES);

export function baseClassName(ascendancyOrClass: string): string {
  const name = ascendancyOrClass.trim();
  if (!name) return "";
  if (BASE_SET.has(name)) return name;
  return ASCENDANCY_TO_BASE[name] ?? name;
}

export function normalizeClassFilter(value: string): string {
  return baseClassName(value);
}
