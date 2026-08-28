const MAGIC = new TextEncoder().encode("NDIC");
const VERSION = 2;

function readU32(view: DataView, offset: number): number {
  return view.getUint32(offset, true);
}

function readVarint(buf: Uint8Array, i: number): [number, number] {
  let r = 0;
  let s = 0;
  while (i < buf.length) {
    const x = buf[i++];
    r += (x & 0x7f) << s;
    if (!(x & 0x80)) return [r, i];
    s += 7;
  }
  return [0, -1];
}

export function parseNdic(buf: Uint8Array): string[] {
  if (
    buf.length < 36 ||
    buf[0] !== MAGIC[0] ||
    buf[1] !== MAGIC[1] ||
    buf[2] !== MAGIC[2] ||
    buf[3] !== MAGIC[3]
  ) {
    throw new Error("NDIC: bad magic");
  }
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  if (readU32(view, 4) !== VERSION) {
    throw new Error("NDIC: unsupported version");
  }
  const count = readU32(view, 12);
  const syncEntries = readU32(view, 28);
  const lengthRegion = readU32(view, 32);
  const lengthStart = 36 + syncEntries * 8;
  const stringStart = lengthStart + lengthRegion;
  const decoder = new TextDecoder();
  const names: string[] = [];
  let cursor = lengthStart;
  let strAt = stringStart;
  for (let i = 0; i < count; i++) {
    const [len, next] = readVarint(buf, cursor);
    if (next < 0) break;
    cursor = next;
    names.push(decoder.decode(buf.subarray(strAt, strAt + len)));
    strAt += len;
  }
  return names;
}
