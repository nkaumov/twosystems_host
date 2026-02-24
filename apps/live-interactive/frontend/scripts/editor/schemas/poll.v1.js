export const POLL_SCHEMA_V1 = {
  blockType: "poll",
  schemaVersion: 1,
  typeVersion: 1
};

export function normalizePollContentV1(rawContent) {
  // TODO(step-02+): full validation/normalization for poll v1.
  return rawContent && typeof rawContent === "object" ? rawContent : {};
}

