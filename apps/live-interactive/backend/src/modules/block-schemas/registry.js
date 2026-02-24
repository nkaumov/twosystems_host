const quizV1 = require("./schemas/quiz.v1");
const flexV1 = require("./schemas/flex.v1");
const pollV1 = require("./schemas/poll.v1");
const raffleV1 = require("./schemas/raffle.v1");

const BLOCK_SCHEMA_REGISTRY = new Map([
  [
    "quiz",
    {
      schema: quizV1.QUIZ_SCHEMA_V1,
      validateAndNormalize: quizV1.validateAndNormalize
    }
  ],
  [
    "flex",
    {
      schema: flexV1.FLEX_SCHEMA_V1,
      validateAndNormalize: flexV1.validateAndNormalize
    }
  ],
  [
    "poll",
    {
      schema: pollV1.POLL_SCHEMA_V1,
      validateAndNormalize: pollV1.validateAndNormalize
    }
  ],
  [
    "raffle",
    {
      schema: raffleV1.RAFFLE_SCHEMA_V1,
      validateAndNormalize: raffleV1.validateAndNormalize
    }
  ]
]);

function getSchemaEntryByType(blockType) {
  const type = String(blockType || "").trim().toLowerCase();
  return BLOCK_SCHEMA_REGISTRY.get(type) || null;
}

function listRegisteredTypes() {
  return Array.from(BLOCK_SCHEMA_REGISTRY.keys());
}

module.exports = {
  BLOCK_SCHEMA_REGISTRY,
  getSchemaEntryByType,
  listRegisteredTypes
};

