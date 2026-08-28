const NAME_HEADERS = /^(name|unique|unique name|item|item name|uniquename)$/i;
const OWNED_HEADERS =
  /^(owned|have|found|collected|count|qty|quantity|copies|owned\?)$/i;
const SKIP_CELL =
  /^(t[0-5]|league|boss|ubers?|yes|no|true|false|owned|missing|count|qty|quantity|tier|rarity|category|type|base|base type|item class|drop|world drop|divination|name|unique|uniques|maps?)$/i;
const FULL_CATALOG_WARN = 800;

export type ParsedImport = {
  names: string[];
  accountHint?: string;
  ladderHint?: string;
  warnings: string[];
};

export type PoeladderRef = {
  user: string;
  ladderIdentifier?: string;
  href?: string;
};

export function parsePoeladderUrl(raw: string): {
  href: string;
  user?: string;
  ladderIdentifier?: string;
  host: string;
} | null {
  try {
    const url = new URL(raw.trim());
    return {
      href: url.href,
      host: url.hostname.replace(/^www\./i, ""),
      user: url.searchParams.get("user") ?? undefined,
      ladderIdentifier: url.searchParams.get("ladderIdentifier") ?? undefined,
    };
  } catch {
    return null;
  }
}

/** PoE Ladder account tags: `name-1234` or `name#1234`. */
export function parsePoeladderTag(raw: string): string | null {
  const t = raw.trim().replace(/^@/, "");
  const m = t.match(/^([A-Za-z0-9_][A-Za-z0-9._]{0,31})[-#](\d{4})$/);
  if (!m) return null;
  return `${m[1]}-${m[2]}`;
}

export function parsePoeladderAccount(raw: string): PoeladderRef | null {
  const t = raw.trim();
  if (!t) return null;
  const fromUrl = parsePoeladderUrl(t);
  if (fromUrl) {
    if (!/poeladder\.com$/i.test(fromUrl.host)) return null;
    const user = fromUrl.user ? parsePoeladderTag(fromUrl.user) ?? fromUrl.user.replace("#", "-") : null;
    if (!user) return null;
    return {
      user,
      ladderIdentifier: fromUrl.ladderIdentifier,
      href: fromUrl.href,
    };
  }
  const user = parsePoeladderTag(t);
  return user ? { user } : null;
}

export function parseUniqueImport(text: string): ParsedImport {
  const warnings: string[] = [];
  const trimmed = text.replace(/^\uFEFF/, "").trim();
  if (!trimmed) return { names: [], warnings: ["Nothing to import."] };

  const jsonNames = tryJsonNames(trimmed);
  if (jsonNames) {
    return finalize(jsonNames, warnings);
  }

  const rows = looksLikeCsv(trimmed)
    ? parseCsv(trimmed)
    : trimmed.split(/\r?\n/).map((line) => [line]);

  if (rows.length === 0) return { names: [], warnings: ["Nothing to import."] };

  const header = rows[0].map((c) => c.trim());
  const nameIdx = header.findIndex((c) => NAME_HEADERS.test(c));
  const ownedIdx = header.findIndex((c) => OWNED_HEADERS.test(c));
  const hasHeader = nameIdx >= 0;
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const nameCol = hasHeader ? nameIdx : 0;

  const names: string[] = [];
  for (const row of dataRows) {
    if (ownedIdx >= 0 && !isOwned(row[ownedIdx])) continue;
    const raw = (row[nameCol] ?? "").trim();
    if (isUniqueName(raw)) names.push(raw);
  }

  if (hasHeader && ownedIdx < 0 && names.length > FULL_CATALOG_WARN) {
    warnings.push(
      "This looks like a full unique catalog. Export from your PoE Ladder Uniques page (the one with user= in the URL), or paste only names you own.",
    );
    return { names: [], warnings };
  }

  return finalize(names, warnings);
}

function finalize(names: string[], warnings: string[]): ParsedImport {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const name of names) {
    if (seen.has(name)) continue;
    seen.add(name);
    unique.push(name);
  }
  if (unique.length === 0 && warnings.length === 0) {
    warnings.push("No unique names found. Need a Name column, or one name per line.");
  }
  return { names: unique, warnings };
}

function tryJsonNames(text: string): string[] | null {
  if (!text.startsWith("[") && !text.startsWith("{")) return null;
  try {
    const data = JSON.parse(text) as unknown;
    const rows = Array.isArray(data)
      ? data
      : data && typeof data === "object" && "uniques" in data
        ? (data as { uniques: unknown }).uniques
        : null;
    if (!Array.isArray(rows)) return null;
    const names: string[] = [];
    for (const row of rows) {
      if (typeof row === "string" && isUniqueName(row)) names.push(row.trim());
      else if (row && typeof row === "object") {
        const obj = row as Record<string, unknown>;
        const owned = obj.owned ?? obj.have ?? obj.count;
        if (owned !== undefined && !isOwned(String(owned))) continue;
        const name = obj.name ?? obj.unique ?? obj.item;
        if (typeof name === "string" && isUniqueName(name)) names.push(name.trim());
      }
    }
    return names;
  } catch {
    return null;
  }
}

function looksLikeCsv(text: string): boolean {
  const first = text.split(/\r?\n/, 1)[0] ?? "";
  return /[,;\t]/.test(first);
}

function parseCsv(text: string): string[][] {
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      quoted = true;
      continue;
    }
    if (ch === delimiter) {
      row.push(cell);
      cell = "";
      continue;
    }
    if (ch === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += ch;
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

function detectDelimiter(text: string): string {
  const first = text.split(/\r?\n/, 1)[0] ?? "";
  const counts: [string, number][] = [
    [",", (first.match(/,/g) ?? []).length],
    [";", (first.match(/;/g) ?? []).length],
    ["\t", (first.match(/\t/g) ?? []).length],
  ];
  return counts.sort((a, b) => b[1] - a[1])[0][0];
}

function isOwned(value: string | undefined): boolean {
  if (value == null) return false;
  const v = value.trim().toLowerCase();
  if (!v) return false;
  if (/^(0|false|no|n|missing|unowned)$/.test(v)) return false;
  if (/^(1|true|yes|y|x|owned|✓|✔)$/.test(v)) return true;
  const n = Number(v);
  return Number.isFinite(n) ? n > 0 : true;
}

function isUniqueName(value: string): boolean {
  const t = value.trim();
  if (t.length < 3 || t.length > 80) return false;
  if (SKIP_CELL.test(t)) return false;
  if (/^https?:/i.test(t)) return false;
  if (/^\d+([.,]\d+)?$/.test(t)) return false;
  if (/^(rare|magic|normal)\b/i.test(t)) return false;
  return /[A-Za-z]/.test(t);
}
