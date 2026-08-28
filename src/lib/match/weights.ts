/** Wiki T0–T5 from Analysis of unique item tiers. Lower = rarer = heavier. */
export const TIER_WEIGHTS: Record<number, number> = {
  0: 8,
  1: 4,
  2: 2,
  3: 1.5,
  4: 1,
  5: 0.5,
};

export const UNKNOWN_TIER_WEIGHT = 1;

export function uniqueWeight(tier: number | undefined): number {
  if (tier == null || !Number.isFinite(tier)) return UNKNOWN_TIER_WEIGHT;
  return TIER_WEIGHTS[tier] ?? UNKNOWN_TIER_WEIGHT;
}
