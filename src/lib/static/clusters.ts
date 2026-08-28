import { readFileSync } from "node:fs";
import path from "node:path";
import fallback from "@/data/ninja-fallback.json";

export function loadClusterIds(): string[] {
  try {
    const raw = readFileSync(path.join(process.cwd(), "public/data/ninja.json"), "utf8");
    const data = JSON.parse(raw) as { clusters?: { id?: string }[] };
    const ids = (data.clusters ?? []).map((c) => c.id).filter((id): id is string => Boolean(id));
    if (ids.length > 0) return ids;
  } catch {
    // use bundled fallback
  }
  return fallback.clusters.map((c) => c.id);
}
