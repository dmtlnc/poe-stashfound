export function publicUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

/** Unset/empty = local wrangler. Set `disabled` to turn live import off. */
export function importWorkerUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_IMPORT_URL;
  if (raw === "disabled") return null;
  return (raw || "http://127.0.0.1:8787").replace(/\/$/, "");
}

export function turnstileSiteKey(): string | null {
  const key = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  return key ? key : null;
}
