"use client";

import Link from "next/link";
import { FarmList } from "./FarmList";
import { BuildOutboundLinks } from "./BuildOutboundLinks";
import { UniqueChip } from "./UniqueArt";
import type { MatchRow } from "@/lib/client/data";

export function scoreCaption(row: MatchRow): string {
  const names =
    row.nameTotal === 0 ? "roll-chase only" : `${row.nameHits}/${row.nameTotal} names`;
  return `${Math.round(row.score * 100)}% weighted · ${names} · ${row.cluster.characterCount} ninja characters`;
}

export function BuildMatchList({
  rows,
  openId,
  onToggleFarm,
}: {
  rows: MatchRow[];
  openId: string | null;
  onToggleFarm: (id: string) => void;
}) {
  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.cluster.id} className="panel p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Link
                href={`/app/builds/${row.cluster.id}`}
                className="font-display text-lg tracking-wide hover:text-gold-bright"
              >
                <span className="text-gold-bright">
                  {row.cluster.mainSkill ?? "Unknown skill"}
                </span>{" "}
                <span className="text-muted">
                  {row.cluster.ascendancy || row.cluster.className}
                </span>
              </Link>
              <p className="text-sm text-muted">{scoreCaption(row)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onToggleFarm(row.cluster.id)}
                className="btn-outline h-9 px-3 text-[0.7rem]"
              >
                {openId === row.cluster.id ? "Hide farm" : "Farm missing"}
              </button>
              <BuildOutboundLinks cluster={row.cluster} />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {row.listedNames.map((name) => (
              <UniqueChip
                key={name}
                name={name}
                owned={row.owned.includes(name)}
              />
            ))}
          </div>
          {row.variantWarnings.length > 0 ? (
            <p className="mt-3 text-xs text-unique">
              Roll-dependent: {row.variantWarnings.join(", ")}. Owning the name is
              not the same as owning the right mods.
            </p>
          ) : null}
          {openId === row.cluster.id ? (
            <div className="mt-4">
              <FarmList hints={row.farm} />
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
