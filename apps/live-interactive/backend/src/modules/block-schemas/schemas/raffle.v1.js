const RAFFLE_SCHEMA_V1 = {
  blockType: "raffle",
  schemaVersion: 1,
  typeVersion: 1
};

function validateAndNormalize(editorBlock) {
  // TODO(step-02+): full raffle schema validation + normalization.
  return editorBlock;
}

module.exports = {
  RAFFLE_SCHEMA_V1,
  validateAndNormalize
};

