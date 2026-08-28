import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { InventorySnapshot } from "./types";

const dir = path.join(process.cwd(), "data", "cache");

function fileFor(accountName: string) {
  const safe = accountName.replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(dir, `inventory-${safe}.json`);
}

export async function saveInventory(snapshot: InventorySnapshot) {
  await mkdir(dir, { recursive: true });
  await writeFile(fileFor(snapshot.accountName), JSON.stringify(snapshot, null, 2));
}

export async function loadInventory(
  accountName: string,
): Promise<InventorySnapshot | null> {
  try {
    const raw = await readFile(fileFor(accountName), "utf8");
    return JSON.parse(raw) as InventorySnapshot;
  } catch {
    return null;
  }
}
