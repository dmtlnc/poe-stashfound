import { parsePoeladderAccount, parseUniqueImport } from "@/lib/import/parse";
import {
  DEFAULT_LADDER_MODE,
  LADDER_TO_NINJA,
  parseLadderMode,
  parseNinjaMode,
  type LadderMode,
  type NinjaMode,
} from "@/lib/leagues/modes";
import { importWorkerUrl } from "./base";
import { saveInventory, snapshotFromNames } from "./store";
import type { InventorySnapshot } from "../types";

export async function importUniques(opts: {
  url?: string;
  text?: string;
  file?: File | null;
  turnstileToken?: string;
  ladderMode?: LadderMode;
  ninjaMode?: NinjaMode;
}): Promise<InventorySnapshot> {
  const fileText = opts.file ? await opts.file.text() : "";
  const paste = [fileText, opts.text ?? ""].filter((s) => s.trim()).join("\n");
  const rawUrl = opts.url?.trim() ?? "";
  const ladderRef = rawUrl ? parsePoeladderAccount(rawUrl) : null;
  const ladderMode = parseLadderMode(opts.ladderMode ?? DEFAULT_LADDER_MODE);
  const ninjaMode = parseNinjaMode(opts.ninjaMode ?? LADDER_TO_NINJA[ladderMode]);

  let names: string[] = [];
  const warnings: string[] = [];

  if (!paste.trim() && ladderRef?.user) {
    names = await fetchFromWorker(rawUrl, opts.turnstileToken, ladderMode);
  } else {
    if (!paste.trim() && rawUrl && !ladderRef) {
      throw new Error(
        "Need a PoE Ladder account like name-1234, a Uniques URL, a CSV export, or a pasted name list.",
      );
    }
    const parsed = parseUniqueImport(paste);
    warnings.push(...parsed.warnings);
    names = parsed.names;
  }

  if (names.length === 0) {
    throw new Error(warnings[0] ?? "No unique names found.");
  }

  const accountName = ladderRef?.user || "Imported";
  const snapshot = snapshotFromNames({
    names,
    accountName,
    label: ladderRef?.user ? `PoE Ladder ${ladderRef.user}` : "Imported list",
    ladderMode,
    ninjaMode,
    ladderAccount: ladderRef?.user,
  });
  saveInventory(snapshot);
  return snapshot;
}

async function fetchFromWorker(
  url: string,
  turnstileToken: string | undefined,
  ladderMode: LadderMode,
): Promise<string[]> {
  const worker = importWorkerUrl();
  if (worker == null) {
    throw new Error(
      "Live PoE Ladder import is not configured. Export CSV from the Uniques page and upload it.",
    );
  }
  const endpoint = `${worker}/import`;

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ url, turnstileToken, ladderMode }),
    });
  } catch {
    throw new Error(
      "Could not reach the import worker. Start it with npm run worker, or export CSV from the Uniques page.",
    );
  }

  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    names?: string[];
  };
  if (!res.ok) {
    throw new Error(data.error || "PoE Ladder import failed. You can still upload a CSV export.");
  }
  if (!Array.isArray(data.names) || data.names.length === 0) {
    throw new Error("PoE Ladder returned no owned uniques for that account.");
  }
  return data.names;
}
