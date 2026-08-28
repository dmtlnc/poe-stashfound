"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { importUniques } from "@/lib/client/import";
import { turnstileSiteKey } from "@/lib/client/base";

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: { sitekey: string; callback: (token: string) => void },
      ) => string;
    };
  }
}

export function ImportPanel({
  compact = false,
  onImported,
}: {
  compact?: boolean;
  onImported?: () => void | Promise<void>;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const siteKey = turnstileSiteKey();

  useEffect(() => {
    if (!siteKey || !widgetRef.current) return;
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.onload = () => {
      const el = widgetRef.current;
      if (!el || !window.turnstile) return;
      window.turnstile.render(el, {
        sitekey: siteKey,
        callback: (token) => setTurnstileToken(token),
      });
    };
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [siteKey]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await importUniques({
        url: url.trim() || undefined,
        text,
        file,
        turnstileToken: turnstileToken ?? undefined,
      });
      if (onImported) await onImported();
      else router.push("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      autoComplete="off"
      className={`panel space-y-3 ${compact ? "p-4" : "p-5"}`}
    >
      <div>
        <h2 className={compact ? "text-base font-semibold tracking-wide" : "text-lg font-semibold tracking-wide"}>
          Import from PoE Ladder
        </h2>
        <p className="mt-1 text-sm text-muted">
          Paste your PoE Ladder account tag (
          <code className="text-gold">name-1234</code> or{" "}
          <code className="text-gold">name#1234</code>
          ), or a{" "}
          <a
            href="https://poeladder.com/uniques"
            target="_blank"
            rel="noreferrer"
            className="link"
          >
            Uniques URL ↗
          </a>
          . CSV export and a pasted name list still work without the import worker.
        </p>
      </div>
      <label className="label-caps block">
        PoE Ladder account or URL
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="name-1234 or https://poeladder.com/uniques?user=…"
          autoComplete="off"
          spellCheck={false}
          className="field"
        />
      </label>
      <label className="label-caps block">
        CSV file
        <input
          type="file"
          accept=".csv,.txt,text/csv,text/plain"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mt-1 block w-full text-sm text-foreground"
        />
      </label>
      <label className="label-caps block">
        Or paste unique names
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={compact ? 4 : 6}
          placeholder={"Goldrim\nKaom's Heart\nRumi's Concoction"}
          className="field"
        />
      </label>
      {siteKey ? <div ref={widgetRef} className="cf-turnstile" /> : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <button
        type="submit"
        disabled={busy || (!file && !text.trim() && !url.trim()) || Boolean(siteKey && !turnstileToken)}
        suppressHydrationWarning
        className="btn-gold"
      >
        {busy ? "Importing…" : compact ? "Replace unique list" : "Match my uniques"}
      </button>
    </form>
  );
}
