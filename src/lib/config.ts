export const APP_NAME = "Stashfound";
export const APP_VERSION = "0.1.0";

export function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set to at least 32 characters");
  }
  return secret;
}

export function gggConfigured(): boolean {
  return Boolean(process.env.GGG_CLIENT_ID && process.env.GGG_CLIENT_SECRET);
}

export function gggClientId(): string {
  return process.env.GGG_CLIENT_ID ?? "";
}

export function gggClientSecret(): string {
  return process.env.GGG_CLIENT_SECRET ?? "";
}

export function gggRedirectUri(): string {
  return (
    process.env.GGG_REDIRECT_URI ?? "http://localhost:3000/api/auth/callback"
  );
}

export function userAgent(): string {
  const clientId = process.env.GGG_CLIENT_ID || "stashfound";
  const contact = process.env.GGG_CONTACT || "stashfound@localhost";
  return `OAuth ${clientId}/${APP_VERSION} (contact: ${contact})`;
}

export function ninjaUserAgent(): string {
  const contact = process.env.GGG_CONTACT || "stashfound@localhost";
  return `stashfound/${APP_VERSION} (${contact}; PoE1 SSF unique matcher; cache 8h)`;
}

export const NINJA_CACHE_MS = 8 * 60 * 60 * 1000;
export const DEFAULT_MATCH_THRESHOLD = 0.7;
export const MIN_BUILD_UNIQUES = 3;
export const CLUSTER_JACCARD = 0.75;
