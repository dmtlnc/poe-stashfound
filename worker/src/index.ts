/**
 * Ladder-only import Worker. CSV/paste stay in the browser.
 *
 * Deploy:
 *   npx wrangler deploy
 *   npx wrangler secret put TURNSTILE_SECRET   # optional; enables Turnstile
 *
 * Set ALLOWED_ORIGINS to the exact browser Origins that may call this
 * (localhost for wrangler dev, plus the GitHub Pages origin). Never put a
 * shared secret in the static frontend — it is extractable.
 */
import { parsePoeladderAccount, parsePoeladderTag } from "../../src/lib/import/parse";
import { pickCurrentSsfLadder, type PoeladderLadder } from "../../src/lib/poeladder/ladders";

const UPSTREAM = "https://poeladder.com";
const API = `${UPSTREAM}/api/v1`;
const UA = "stashfound-import/0.1";
const MAX_BODY = 4096;
const MAX_INPUT = 512;
const MAX_NAMES = 2500;
const TIMEOUT_MS = 12_000;
const RATE_LIMIT = 8;
const RATE_WINDOW_MS = 60_000;
const BUNDLE_RE = /\/assets\/index-[A-Za-z0-9._-]+\.js/;
const JWT_RE = /REACT_APP_JWT:"([^"]+)"/;
const LADDER_ID_RE = /^[A-Za-z0-9_]{3,80}$/;

type RateLimiter = {
  limit: (opts: { key: string }) => Promise<{ success: boolean }>;
};

export interface Env {
  ALLOWED_ORIGINS: string;
  TURNSTILE_SECRET?: string;
  IMPORT_LIMIT?: RateLimiter;
}

type JwtMemory = { token: string; expiresAt: number };
let jwtMemory: JwtMemory | null = null;

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const origin = request.headers.get("Origin");
    const allowed = allowedOrigin(origin, env.ALLOWED_ORIGINS);

    if (request.method === "OPTIONS") {
      if (!allowed) return new Response(null, { status: 403 });
      return new Response(null, { status: 204, headers: corsHeaders(allowed) });
    }

    const url = new URL(request.url);
    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/health")) {
      return json({ ok: true }, 200, allowed);
    }

    if (request.method !== "POST" || url.pathname !== "/import") {
      return json({ error: "Not found" }, 404, allowed);
    }

    if (!allowed) {
      return json({ error: "Forbidden" }, 403, null);
    }

    const limited = await rateLimited(request, env, ctx);
    if (limited) {
      return json({ error: "Too many requests. Try again in a minute." }, 429, allowed);
    }

    try {
      return await handleImport(request, env, allowed);
    } catch {
      return json({ error: "Import failed. You can still upload a CSV export." }, 502, allowed);
    }
  },
};

export default worker;

async function handleImport(request: Request, env: Env, origin: string): Promise<Response> {
  const type = request.headers.get("content-type") ?? "";
  if (!/\bapplication\/json\b/i.test(type)) {
    return json({ error: "JSON body required" }, 415, origin);
  }

  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > MAX_BODY) {
    return json({ error: "Request too large" }, 413, origin);
  }

  const rawText = await request.text();
  if (rawText.length > MAX_BODY) {
    return json({ error: "Request too large" }, 413, origin);
  }

  let body: { url?: unknown; turnstileToken?: unknown };
  try {
    body = JSON.parse(rawText) as { url?: unknown; turnstileToken?: unknown };
  } catch {
    return json({ error: "Invalid JSON" }, 400, origin);
  }

  if (env.TURNSTILE_SECRET) {
    const token = typeof body.turnstileToken === "string" ? body.turnstileToken : "";
    const ip = clientIp(request);
    if (!(await verifyTurnstile(env.TURNSTILE_SECRET, token, ip))) {
      return json({ error: "Verification failed" }, 403, origin);
    }
  }

  if (typeof body.url !== "string" || body.url.length === 0 || body.url.length > MAX_INPUT) {
    return json({ error: "Need a PoE Ladder account like name-1234 or a Uniques URL." }, 400, origin);
  }

  const parsed = parsePoeladderAccount(body.url);
  const user = parsed?.user ? parsePoeladderTag(parsed.user) : null;
  if (!parsed || !user) {
    return json({ error: "Need a PoE Ladder account like name-1234 or a Uniques URL." }, 400, origin);
  }

  let ladder = parsed.ladderIdentifier;
  if (ladder && !LADDER_ID_RE.test(ladder)) {
    return json({ error: "Invalid ladder." }, 400, origin);
  }

  const signal = AbortSignal.timeout(TIMEOUT_MS);
  if (!ladder) {
    ladder = await resolveLadder(signal);
  }

  const names = await fetchOwnedNames(user, ladder, signal);
  if (names.length === 0) {
    return json({ error: "No owned uniques found for that account." }, 404, origin);
  }

  return json({ names, accountHint: user }, 200, origin);
}

async function resolveLadder(signal: AbortSignal): Promise<string> {
  const res = await poeladderGet(`${API}/ladders`, signal);
  if (!res.ok) throw new Error("ladders");
  const ladders = (await res.json()) as PoeladderLadder[];
  const pick = pickCurrentSsfLadder(Array.isArray(ladders) ? ladders : []);
  if (!pick) throw new Error("ladder");
  if (!LADDER_ID_RE.test(pick.identifier)) throw new Error("ladder");
  return pick.identifier;
}

async function fetchOwnedNames(
  user: string,
  ladder: string,
  signal: AbortSignal,
): Promise<string[]> {
  const url = new URL(`${API}/users/${encodeURIComponent(user)}/uniques`);
  url.searchParams.set("ladderIdentifier", ladder);
  url.searchParams.set("display", "owned");
  url.searchParams.set("status", "active");
  url.searchParams.set("excludeLeagueUniques", "1");
  const res = await poeladderGet(url.toString(), signal);
  if (res.status === 404) return [];
  if (!res.ok) throw new Error("uniques");
  const data = (await res.json()) as { uniques?: Record<string, unknown>[] };
  const names: string[] = [];
  const seen = new Set<string>();
  for (const row of data.uniques ?? []) {
    const name = String(row.name ?? "").trim();
    const owned = row.owned === undefined ? true : Boolean(row.owned);
    if (!owned || name.length < 3 || name.length > 80 || seen.has(name)) continue;
    seen.add(name);
    names.push(name);
    if (names.length >= MAX_NAMES) break;
  }
  return names;
}

async function poeladderGet(url: string, signal: AbortSignal): Promise<Response> {
  const token = await publicClientToken(signal);
  const res = await fetch(url, {
    method: "GET",
    redirect: "follow",
    signal,
    headers: {
      "User-Agent": UA,
      Accept: "application/json",
      "jwt-auth": token,
    },
  });
  assertPoeladder(res);
  return res;
}

async function publicClientToken(signal: AbortSignal): Promise<string> {
  if (jwtMemory && jwtMemory.expiresAt > Date.now()) return jwtMemory.token;

  const page = await fetch(`${UPSTREAM}/uniques`, {
    method: "GET",
    redirect: "follow",
    signal,
    headers: { "User-Agent": UA, Accept: "text/html" },
  });
  assertPoeladder(page);
  if (!page.ok) throw new Error("page");
  const html = await page.text();
  const bundlePath = html.match(BUNDLE_RE)?.[0];
  if (!bundlePath || bundlePath.includes("..")) throw new Error("bundle");

  const js = await fetch(`${UPSTREAM}${bundlePath}`, {
    method: "GET",
    redirect: "follow",
    signal,
    headers: { "User-Agent": UA },
  });
  assertPoeladder(js);
  if (!js.ok) throw new Error("bundle");
  const token = JWT_RE.exec(await js.text())?.[1];
  if (!token || token.length > 4096) throw new Error("token");
  jwtMemory = { token, expiresAt: Date.now() + 6 * 60 * 60 * 1000 };
  return token;
}

function assertPoeladder(res: Response) {
  let host: string;
  try {
    host = new URL(res.url).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    throw new Error("upstream");
  }
  if (host !== "poeladder.com") throw new Error("upstream");
}

function allowedOrigin(origin: string | null, allowCsv: string): string | null {
  if (!origin) return null;
  let normalized: string;
  try {
    const u = new URL(origin);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    normalized = `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
  const allowed = (allowCsv || "")
    .split(",")
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean);
  return allowed.includes(normalized) ? normalized : null;
}

function corsHeaders(origin: string): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(body: unknown, status: number, origin: string | null): Response {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  if (origin) {
    for (const [k, v] of Object.entries(corsHeaders(origin))) headers.set(k, v);
  }
  return new Response(JSON.stringify(body), { status, headers });
}

function clientIp(request: Request): string {
  return request.headers.get("CF-Connecting-IP") || request.headers.get("cf-connecting-ip") || "unknown";
}

async function rateLimited(request: Request, env: Env, ctx: ExecutionContext): Promise<boolean> {
  const ip = clientIp(request);
  if (env.IMPORT_LIMIT) {
    try {
      const { success } = await env.IMPORT_LIMIT.limit({ key: ip });
      if (!success) return true;
    } catch {
      return cacheRateLimited(ip, ctx);
    }
    return false;
  }
  return cacheRateLimited(ip, ctx);
}

async function cacheRateLimited(ip: string, ctx: ExecutionContext): Promise<boolean> {
  try {
    const key = new Request(`https://stashfound.invalid/rl/${encodeURIComponent(ip)}`);
    const cache = caches.default;
    const hit = await cache.match(key);
    const now = Date.now();
    let n = 0;
    let exp = now + RATE_WINDOW_MS;
    if (hit) {
      const bucket = (await hit.json()) as { n?: number; exp?: number };
      if (typeof bucket.exp === "number" && bucket.exp > now) {
        n = Number(bucket.n) || 0;
        exp = bucket.exp;
      }
    }
    if (n >= RATE_LIMIT) return true;
    const ttlSec = Math.max(1, Math.ceil((exp - now) / 1000));
    ctx.waitUntil(
      cache.put(
        key,
        new Response(JSON.stringify({ n: n + 1, exp }), {
          headers: { "Cache-Control": `max-age=${ttlSec + 5}`, "Content-Type": "application/json" },
        }),
      ),
    );
    return false;
  } catch {
    return false;
  }
}

async function verifyTurnstile(secret: string, token: string, ip: string): Promise<boolean> {
  if (!token || token.length > 2048) return false;
  const body = new FormData();
  body.set("secret", secret);
  body.set("response", token);
  if (ip && ip !== "unknown") body.set("remoteip", ip);
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body,
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { success?: boolean };
  return data.success === true;
}
