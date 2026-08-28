import type { UniqueItem } from "../types";

export function namesToUniques(names: string[], label: string): UniqueItem[] {
  const counts = new Map<string, number>();
  for (const name of names) {
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, count]) => ({
      name,
      baseType: "",
      count,
      sources: [{ type: "import" as const, label }],
    }));
}
