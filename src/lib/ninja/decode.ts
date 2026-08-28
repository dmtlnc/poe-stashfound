export type NinjaUnique = { name: string; type?: string };

export type NinjaOverview = {
  names?: string[];
  accounts?: string[];
  levels?: number[];
  classes?: number[];
  classNames?: string[];
  ascendancies?: number[];
  ascendancyNames?: string[];
  uniqueItems?: NinjaUnique[];
  uniqueItemUse?: Record<string, number[]>;
  activeSkills?: { name?: string; icon?: string }[] | string[];
  activeSkillUse?: Record<string, number[]>;
};

export function indexesFromDeltas(deltas: number[] | undefined): Set<number> {
  const out = new Set<number>();
  if (!deltas?.length) return out;
  let acc = 0;
  for (const d of deltas) {
    acc += d;
    out.add(acc);
  }
  return out;
}

export type NinjaCharacter = {
  index: number;
  name: string;
  account: string;
  level: number;
  className: string;
  ascendancy?: string;
  uniqueNames: string[];
  skills: string[];
};

function labelAt(
  names: string[] | undefined,
  ids: number[] | undefined,
  index: number,
): string | undefined {
  if (!ids || !names) return undefined;
  const id = ids[index];
  if (id == null) return undefined;
  return names[id] ?? String(id);
}

function skillName(skill: { name?: string } | string): string {
  return typeof skill === "string" ? skill : skill.name ?? "Unknown skill";
}

export function decodeOverview(overview: NinjaOverview): NinjaCharacter[] {
  const names = overview.names ?? [];
  const n = names.length;
  const uniqueUse = new Map<number, string[]>();
  for (let i = 0; i < n; i++) uniqueUse.set(i, []);

  for (const [key, deltas] of Object.entries(overview.uniqueItemUse ?? {})) {
    const unique = overview.uniqueItems?.[Number(key)];
    const uniqueName = unique?.name;
    if (!uniqueName) continue;
    for (const idx of indexesFromDeltas(deltas)) {
      uniqueUse.get(idx)?.push(uniqueName);
    }
  }

  const skillUse = new Map<number, string[]>();
  for (let i = 0; i < n; i++) skillUse.set(i, []);
  const skills = overview.activeSkills ?? [];
  for (const [key, deltas] of Object.entries(overview.activeSkillUse ?? {})) {
    const skill = skills[Number(key)];
    if (!skill) continue;
    const sName = skillName(skill);
    for (const idx of indexesFromDeltas(deltas)) {
      skillUse.get(idx)?.push(sName);
    }
  }

  const out: NinjaCharacter[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      index: i,
      name: names[i] ?? `char-${i}`,
      account: overview.accounts?.[i] ?? "",
      level: overview.levels?.[i] ?? 0,
      className:
        labelAt(overview.classNames, overview.classes, i) ?? "Unknown",
      ascendancy: labelAt(overview.ascendancyNames, overview.ascendancies, i),
      uniqueNames: uniqueUse.get(i) ?? [],
      skills: skillUse.get(i) ?? [],
    });
  }
  return out;
}
