"use client";

import {
  LADDER_MODE_OPTIONS,
  NINJA_MODE_OPTIONS,
  type LadderMode,
  type NinjaMode,
} from "@/lib/leagues/modes";

export function LeagueSelects({
  ladderMode,
  ninjaMode,
  onLadderMode,
  onNinjaMode,
  disabled,
  showNinja = true,
}: {
  ladderMode: LadderMode;
  ninjaMode?: NinjaMode;
  onLadderMode: (mode: LadderMode) => void;
  onNinjaMode?: (mode: NinjaMode) => void;
  disabled?: boolean;
  showNinja?: boolean;
}) {
  return (
    <div className={`grid gap-3 ${showNinja ? "sm:grid-cols-2" : ""}`}>
      <label className="label-caps block">
        Stash league
        <select
          value={ladderMode}
          disabled={disabled}
          onChange={(e) => onLadderMode(e.target.value as LadderMode)}
          className="field"
        >
          {LADDER_MODE_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
      {showNinja && ninjaMode && onNinjaMode ? (
        <label className="label-caps block">
          poe.ninja builds
          <select
            value={ninjaMode}
            disabled={disabled}
            onChange={(e) => onNinjaMode(e.target.value as NinjaMode)}
            className="field"
          >
            {NINJA_MODE_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}
