export const LADDER_MODES = [
  "ssf-standard",
  "ssf-allflame",
  "hcssf-allflame",
] as const;

export type LadderMode = (typeof LADDER_MODES)[number];

export const NINJA_MODES = ["standard", "allflame", "allflamehc"] as const;

export type NinjaMode = (typeof NINJA_MODES)[number];

export const DEFAULT_LADDER_MODE: LadderMode = "ssf-allflame";
export const DEFAULT_NINJA_MODE: NinjaMode = "allflame";

export const LADDER_MODE_OPTIONS: { id: LadderMode; label: string }[] = [
  { id: "ssf-standard", label: "SSF Standard" },
  { id: "ssf-allflame", label: "Allflame SSF" },
  { id: "hcssf-allflame", label: "Allflame HCSSF" },
];

export const NINJA_MODE_OPTIONS: { id: NinjaMode; label: string }[] = [
  { id: "standard", label: "Standard (SC)" },
  { id: "allflame", label: "Allflame (SC)" },
  { id: "allflamehc", label: "Allflame HC" },
];

export const LADDER_TO_NINJA: Record<LadderMode, NinjaMode> = {
  "ssf-standard": "standard",
  "ssf-allflame": "allflame",
  "hcssf-allflame": "allflamehc",
};

export const LADDER_LABEL: Record<LadderMode, string> = {
  "ssf-standard": "SSF Standard",
  "ssf-allflame": "SSF Allflame",
  "hcssf-allflame": "HC SSF Allflame",
};

export function isLadderMode(value: string | null | undefined): value is LadderMode {
  return LADDER_MODES.includes(value as LadderMode);
}

export function isNinjaMode(value: string | null | undefined): value is NinjaMode {
  return NINJA_MODES.includes(value as NinjaMode);
}

export function parseLadderMode(value: string | null | undefined): LadderMode {
  if (isLadderMode(value)) return value;
  if (value === "hcssf-standard") return "ssf-standard";
  return DEFAULT_LADDER_MODE;
}

export function parseNinjaMode(value: string | null | undefined): NinjaMode {
  if (isNinjaMode(value)) return value;
  if (value === "hardcore") return "standard";
  return DEFAULT_NINJA_MODE;
}

/** Longer prefixes first so `allflamehc` is not parsed as `allflame`. */
const NINJA_PREFIXES = [...NINJA_MODES].sort((a, b) => b.length - a.length);

export function ninjaModeFromClusterId(id: string): NinjaMode {
  for (const mode of NINJA_PREFIXES) {
    if (id.startsWith(`${mode}-`)) return mode;
  }
  return DEFAULT_NINJA_MODE;
}

export function ninjaDataPath(mode: NinjaMode): string {
  return `/data/ninja/${mode}.json`;
}
