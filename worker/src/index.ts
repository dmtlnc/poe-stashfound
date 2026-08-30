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
import { ninjaUserAgent } from "../../src/lib/config";
import { isLadderMode, parseLadderMode, LADDER_LABEL } from "../../src/lib/leagues/modes";
import {
  parseStashfoundLeagues,
  parseStashfoundNames,
  pickStashfoundLeague,
  stashfoundLeaguesUrl,
  stashfoundUniquesUrl,
} from "../../src/lib/poeladder/ladders";

const UA = ninjaUserAgent();
const MAX_BODY = 4096;
const MAX_INPUT = 512;
const MAX_NAMES = 2500;
const TIMEOUT_MS = 12_000;
const RATE_LIMIT = 8;
const RATE_WINDOW_MS = 60_000;
const LADDER_ID_RE = /^[A-Za-z0-9_]{3,80}$/;

type RateLimiter = {
  limit: (opts: { key: string }) => Promise<{ success: boolean }>;
};

export interface Env {
  ALLOWED_ORIGINS: string;
  TURNSTILE_SECRET?: string;
  IMPORT_LIMIT?: RateLimiter;
}

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const origin = request.headers.get("Origin");
    const allowed = allowedOrigin(origin, env.ALLOWED_ORIGINS, request.url);

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

  let body: { url?: unknown; turnstileToken?: unknown; ladderMode?: unknown };
  try {
    body = JSON.parse(rawText) as {
      url?: unknown;
      turnstileToken?: unknown;
      ladderMode?: unknown;
    };
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

  const ladderHint = parsed.ladderIdentifier;
  if (ladderHint && !LADDER_ID_RE.test(ladderHint)) {
    return json({ error: "Invalid ladder." }, 400, origin);
  }

  if (
    body.ladderMode !== undefined &&
    body.ladderMode !== null &&
    (typeof body.ladderMode !== "string" || !isLadderMode(body.ladderMode))
  ) {
    return json({ error: "Unknown league." }, 400, origin);
  }
  const ladderMode = parseLadderMode(
    typeof body.ladderMode === "string" ? body.ladderMode : undefined,
  );

  const signal = AbortSignal.timeout(TIMEOUT_MS);
  let pick;
  try {
    const leaguesRes = await poeladderGet(stashfoundLeaguesUrl(user), signal);
    if (!leaguesRes.ok) throw new Error("leagues");
    pick = pickStashfoundLeague(
      parseStashfoundLeagues(await leaguesRes.json()),
      ladderMode,
      ladderHint,
    );
  } catch {
    pick = null;
  }
  if (!pick || !LADDER_ID_RE.test(pick.identifier)) {
    return json(
      { error: `Could not find ${LADDER_LABEL[ladderMode]} on PoE Ladder.` },
      404,
      origin,
    );
  }

  const namesRes = await poeladderGet(
    stashfoundUniquesUrl(user, pick.identifier),
    signal,
  );
  if (namesRes.status === 404) {
    return json({ error: "No owned uniques found for that account." }, 404, origin);
  }
  if (!namesRes.ok) throw new Error("uniques");
  const names = parseStashfoundNames(await namesRes.json()).slice(0, MAX_NAMES);
  if (names.length === 0) {
    return json({ error: "No owned uniques found for that account." }, 404, origin);
  }

  return json({ names, accountHint: user }, 200, origin);
}

async function poeladderGet(url: string, signal: AbortSignal): Promise<Response> {
  const res = await fetch(url, {
    method: "GET",
    redirect: "follow",
    signal,
    headers: {
      "User-Agent": UA,
      Accept: "application/json",
    },
  });
  assertPoeladder(res);
  return res;
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

function allowedOrigin(
  origin: string | null,
  allowCsv: string,
  requestUrl: string,
): string | null {
  if (!origin) return null;
  let normalized: string;
  try {
    const u = new URL(origin);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    normalized = `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
  try {
    if (normalized === new URL(requestUrl).origin) return normalized;
  } catch {
    // fall through to allowlist
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
