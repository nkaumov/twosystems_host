const FLEX_SCHEMA_V1 = {
  blockType: "flex",
  schemaVersion: 1,
  typeVersion: 1
};

function validateAndNormalize(editorBlock) {
  // TODO(step-02+): full flex schema validation + normalization.
  return editorBlock;
}

module.exports = {
  FLEX_SCHEMA_V1,
  validateAndNormalize
};

