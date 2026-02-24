import { FLEX_SCHEMA_V1, normalizeFlexContentV1 } from "./flex.v1.js";
import { QUIZ_SCHEMA_V1, normalizeQuizContentV1 } from "./quiz.v1.js";
import { POLL_SCHEMA_V1, normalizePollContentV1 } from "./poll.v1.js";
import { RAFFLE_SCHEMA_V1, normalizeRaffleContentV1 } from "./raffle.v1.js";

export const EDITOR_BLOCK_SCHEMA_REGISTRY = new Map([
  [
    "flex",
    {
      schema: FLEX_SCHEMA_V1,
      normalizeContent: normalizeFlexContentV1
    }
  ],
  [
    "quiz",
    {
      schema: QUIZ_SCHEMA_V1,
      normalizeContent: normalizeQuizContentV1
    }
  ],
  [
    "poll",
    {
      schema: POLL_SCHEMA_V1,
      normalizeContent: normalizePollContentV1
    }
  ],
  [
    "raffle",
    {
      schema: RAFFLE_SCHEMA_V1,
      normalizeContent: normalizeRaffleContentV1
    }
  ]
]);

export function getEditorBlockSchemaEntry(type) {
  const key = String(type || "").trim().toLowerCase();
  return EDITOR_BLOCK_SCHEMA_REGISTRY.get(key) || null;
}

export function getRegisteredEditorBlockTypes() {
  return Array.from(EDITOR_BLOCK_SCHEMA_REGISTRY.keys());
}

