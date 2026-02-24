export const RAFFLE_SCHEMA_V1 = {
  blockType: "raffle",
  schemaVersion: 1,
  typeVersion: 1
};

export function normalizeRaffleContentV1(rawContent) {
  // TODO(step-02+): full validation/normalization for raffle v1.
  return rawContent && typeof rawContent === "object" ? rawContent : {};
}

