"use client";

import type { FarmHint } from "@/lib/types";
import { UniqueArt } from "./UniqueArt";

const KIND_LABEL: Record<FarmHint["kind"], string> = {
  world_drop: "World drop",
  boss: "Boss",
  divination: "Divination cards",
  vendor: "Vendor",
  league_mechanic: "Genesis Tree",
};

export function FarmList({ hints }: { hints: FarmHint[] }) {
  if (hints.length === 0) {
    return <p className="text-sm text-ok">You already have every unique on this list.</p>;
  }
  return (
    <ul className="space-y-3">
      {hints.map((hint) => (
        <li key={hint.name} className="panel p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="flex items-center gap-2 font-medium text-unique">
              <UniqueArt name={hint.name} size={28} />
              <span>
                {hint.name}
                {hint.tier != null ? (
                  <span className="ml-2 text-xs font-normal uppercase tracking-wide text-gold-dim">
                    T{hint.tier}
                  </span>
                ) : null}
              </span>
            </p>
            <span className="label-caps">
              {KIND_LABEL[hint.kind]}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted">{hint.summary}</p>
          {hint.cards?.length ? (
            <ul className="mt-2 space-y-1 text-sm text-foreground">
              {hint.cards.map((card) => (
                <li key={card.name}>
                  <a
                    href={`https://www.poewiki.net/wiki/${encodeURIComponent(card.name.replaceAll(" ", "_"))}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-gold hover:text-gold-bright"
                  >
                    {card.name}
                  </a>
                  {card.stack ? ` (${card.stack})` : ""}
                  {card.where ? ` — ${card.where}` : ""}
                </li>
              ))}
            </ul>
          ) : null}
          {hint.notes?.length ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
              {hint.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          ) : null}
          <a
            href={hint.wiki}
            target="_blank"
            rel="noreferrer"
            className="mt-3 mr-3 inline-block text-sm text-gold hover:text-gold-bright"
          >
            Wiki
          </a>
          {hint.kind === "league_mechanic" ? (
            <a
              href="https://www.poewiki.net/wiki/Genesis_Tree"
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-sm text-gold hover:text-gold-bright"
            >
              Genesis Tree
            </a>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
