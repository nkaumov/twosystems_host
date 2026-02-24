export const FLEX_SCHEMA_V1 = {
  blockType: "flex",
  schemaVersion: 1,
  typeVersion: 1
};

export function normalizeFlexContentV1(rawContent) {
  // TODO(step-02+): full validation/normalization for flex v1.
  return rawContent && typeof rawContent === "object" ? rawContent : {};
}

