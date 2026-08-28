import { readFileSync } from "node:fs";
import path from "node:path";
import fallback from "@/data/ninja-fallback.json";
import { NINJA_MODES } from "../leagues/modes";

function idsFromFile(file: string): string[] {
  try {
    const raw = readFileSync(file, "utf8");
    const data = JSON.parse(raw) as { clusters?: { id?: string }[] };
    return (data.clusters ?? [])
      .map((c) => c.id)
      .filter((id): id is string => Boolean(id));
  } catch {
    return [];
  }
}

export function loadClusterIds(): string[] {
  const ids = new Set<string>();
  for (const mode of NINJA_MODES) {
    for (const id of idsFromFile(
      path.join(process.cwd(), "public/data/ninja", `${mode}.json`),
    )) {
      ids.add(id);
    }
  }
  for (const id of idsFromFile(path.join(process.cwd(), "public/data/ninja.json"))) {
    ids.add(id);
  }
  if (ids.size > 0) return [...ids];
  return fallback.clusters.map((c) => c.id);
}
