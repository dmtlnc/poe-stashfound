import { gggClientId, gggClientSecret, gggRedirectUri, userAgent } from "../config";

const AUTHORIZE = "https://www.pathofexile.com/oauth/authorize";
const TOKEN = "https://www.pathofexile.com/oauth/token";

export const GGG_SCOPES = [
  "account:profile",
  "account:leagues",
  "account:characters",
  "account:stashes",
].join(" ");

export function randomState(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function authorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: gggClientId(),
    response_type: "code",
    scope: GGG_SCOPES,
    redirect_uri: gggRedirectUri(),
    state,
  });
  return `${AUTHORIZE}?${params.toString()}`;
}

export type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
};

export async function exchangeCode(code: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    client_id: gggClientId(),
    client_secret: gggClientSecret(),
    grant_type: "authorization_code",
    code,
    redirect_uri: gggRedirectUri(),
  });
  const res = await fetch(TOKEN, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": userAgent(),
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GGG token exchange failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<TokenResponse>;
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    client_id: gggClientId(),
    client_secret: gggClientSecret(),
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const res = await fetch(TOKEN, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": userAgent(),
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GGG token refresh failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<TokenResponse>;
}
