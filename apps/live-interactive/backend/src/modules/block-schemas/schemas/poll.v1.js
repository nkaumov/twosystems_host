const POLL_SCHEMA_V1 = {
  blockType: "poll",
  schemaVersion: 1,
  typeVersion: 1
};

function validateAndNormalize(editorBlock) {
  // TODO(step-02+): full poll schema validation + normalization.
  return editorBlock;
}

module.exports = {
  POLL_SCHEMA_V1,
  validateAndNormalize
};

