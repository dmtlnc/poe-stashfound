export function publicUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

/** Empty string disables live Ladder import. Unset falls back to local wrangler. */
export function importWorkerUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_IMPORT_URL;
  if (raw === "") return null;
  return (raw ?? "http://127.0.0.1:8787").replace(/\/$/, "");
}

export function turnstileSiteKey(): string | null {
  const key = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  return key ? key : null;
}
