"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { publicUrl } from "@/lib/client/base";

let cached: Record<string, string> | null = null;
let inflight: Promise<Record<string, string>> | null = null;

function loadIcons(): Promise<Record<string, string>> {
  if (cached) return Promise.resolve(cached);
  if (inflight) return inflight;
  inflight = fetch(publicUrl("/data/icons.json"))
    .then(async (r) => {
      if (!r.ok) return {} as Record<string, string>;
      const data: unknown = await r.json();
      if (data && typeof data === "object" && "icons" in data) {
        const icons = (data as { icons: unknown }).icons;
        if (icons && typeof icons === "object") return icons as Record<string, string>;
      }
      return {} as Record<string, string>;
    })
    .then((icons) => {
      cached = icons;
      return icons;
    })
    .catch(() => {
      inflight = null;
      return {} as Record<string, string>;
    });
  return inflight;
}

const UniqueIconContext = createContext<Record<string, string>>({});

export function UniqueIconProvider({ children }: { children: React.ReactNode }) {
  const [icons, setIcons] = useState<Record<string, string>>(cached ?? {});
  useEffect(() => {
    void loadIcons().then(setIcons);
  }, []);
  return (
    <UniqueIconContext.Provider value={icons}>{children}</UniqueIconContext.Provider>
  );
}

export function UniqueArt({
  name,
  src,
  size = 22,
}: {
  name: string;
  src?: string;
  size?: number;
}) {
  const icons = useContext(UniqueIconContext);
  const url = src || icons[name];
  const slotRef = useRef<HTMLSpanElement>(null);
  const [show, setShow] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    setShow(false);
    const el = slotRef.current;
    if (!el || !url) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin: "160px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [url]);

  return (
    <span
      ref={slotRef}
      className="inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      {show && url && !failed ? (
        <img
          src={url}
          alt=""
          width={size}
          height={size}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="object-contain"
          style={{ width: size, height: size }}
        />
      ) : null}
    </span>
  );
}

export function UniqueChip({
  name,
  owned = true,
  count,
  title,
  src,
}: {
  name: string;
  owned?: boolean;
  count?: number;
  title?: string;
  src?: string;
}) {
  return (
    <span className={`chip ${owned ? "chip-owned" : "chip-missing"}`} title={title}>
      <UniqueArt name={name} src={src} />
      <span>
        {name}
        {count != null && count > 1 ? ` ×${count}` : ""}
      </span>
    </span>
  );
}
