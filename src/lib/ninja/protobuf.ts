export type PbField = {
  f: number;
  wt: number;
  v?: number;
  data?: Uint8Array;
};

function readVarint(buf: Uint8Array, i: number): [number, number] {
  let r = 0;
  let s = 0;
  while (i < buf.length) {
    const x = buf[i++];
    r += (x & 0x7f) * 2 ** s;
    if (!(x & 0x80)) return [r, i];
    s += 7;
  }
  return [0, -1];
}

export function pbFields(buf: Uint8Array): PbField[] {
  const out: PbField[] = [];
  let i = 0;
  while (i < buf.length) {
    const [tag, ni] = readVarint(buf, i);
    if (ni < 0) break;
    i = ni;
    const f = tag >>> 3;
    const wt = tag & 7;
    if (wt === 0) {
      const [v, n] = readVarint(buf, i);
      if (n < 0) break;
      i = n;
      out.push({ f, wt, v });
    } else if (wt === 2) {
      const [len, n] = readVarint(buf, i);
      if (n < 0 || n + len > buf.length) break;
      out.push({ f, wt, data: buf.subarray(n, n + len) });
      i = n + len;
    } else if (wt === 5) {
      i += 4;
    } else if (wt === 1) {
      i += 8;
    } else {
      break;
    }
  }
  return out;
}

export function pbStr(fields: PbField[], num: number): string | undefined {
  const field = fields.find((x) => x.f === num && x.wt === 2 && x.data);
  if (!field?.data) return undefined;
  return new TextDecoder().decode(field.data);
}

export function pbNum(fields: PbField[], num: number): number | undefined {
  return fields.find((x) => x.f === num && x.wt === 0)?.v;
}

export function pbMsgs(fields: PbField[], num: number): Uint8Array[] {
  return fields
    .filter((x) => x.f === num && x.wt === 2 && x.data)
    .map((x) => x.data as Uint8Array);
}

export type SearchDimension = {
  id: string;
  dictionaryId: string;
  counts: { key: number; count: number }[];
};

export type SearchDictRef = { id: string; hash: string };

export type ParsedSearch = {
  total: number;
  dimensions: SearchDimension[];
  dictionaries: SearchDictRef[];
};

export function parseNinjaSearch(buf: Uint8Array): ParsedSearch {
  const top = pbFields(buf);
  const result = top.find((x) => x.f === 1 && x.wt === 2)?.data;
  if (!result) throw new Error("ninja search: missing result");
  const rf = pbFields(result);
  const dimensions: SearchDimension[] = [];
  for (const raw of pbMsgs(rf, 2)) {
    const ff = pbFields(raw);
    const id = pbStr(ff, 1);
    if (!id) continue;
    const counts = pbMsgs(ff, 3).map((c) => {
      const cf = pbFields(c);
      return { key: pbNum(cf, 1) ?? 0, count: pbNum(cf, 2) ?? 0 };
    });
    dimensions.push({
      id,
      dictionaryId: pbStr(ff, 2) ?? "",
      counts,
    });
  }
  const dictionaries: SearchDictRef[] = pbMsgs(rf, 6).map((raw) => {
    const ff = pbFields(raw);
    return { id: pbStr(ff, 1) ?? "", hash: pbStr(ff, 2) ?? "" };
  });
  return {
    total: pbNum(rf, 1) ?? 0,
    dimensions,
    dictionaries,
  };
}
