const { getSchemaEntryByType } = require("./registry");

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asPositiveInt(value, fallback = 1) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function validateAndNormalizeEditorBlock(editorBlock) {
  const block = editorBlock && typeof editorBlock === "object" ? editorBlock : null;
  if (!block) {
    throw badRequest("Block must be an object.");
  }

  const blockType = String(block.type || "").trim().toLowerCase();
  const schemaEntry = getSchemaEntryByType(blockType);
  if (!schemaEntry) {
    throw badRequest(`Unsupported block type: ${blockType || "unknown"}.`);
  }

  const normalized = schemaEntry.validateAndNormalize(block);
  const normalizedBlock = normalized && typeof normalized === "object" ? normalized : {};
  const defaultSchemaVersion = asPositiveInt(schemaEntry.schema?.schemaVersion, 1);
  const defaultTypeVersion = asPositiveInt(schemaEntry.schema?.typeVersion, 1);

  return {
    ...normalizedBlock,
    type: blockType,
    title: String(normalizedBlock.title || "").trim(),
    note: String(normalizedBlock.note || "").trim(),
    settings: asObject(normalizedBlock.settings),
    schemaVersion: asPositiveInt(normalizedBlock.schemaVersion, defaultSchemaVersion),
    typeVersion: asPositiveInt(normalizedBlock.typeVersion, defaultTypeVersion)
  };
}

function extractDbJsonParts(normalizedEditorBlock) {
  const block = normalizedEditorBlock && typeof normalizedEditorBlock === "object" ? normalizedEditorBlock : {};
  const settings = asObject(block.settings);
  const note = String(block.note || "");
  const schemaVersion = asPositiveInt(block.schemaVersion, 1);
  const typeVersion = asPositiveInt(block.typeVersion, 1);

  return {
    contentJson: JSON.stringify({
      note,
      content: asObject(settings.content),
      schemaVersion,
      typeVersion
    }),
    configJson: JSON.stringify({
      main: asObject(settings.main),
      additional: asObject(settings.additional)
    }),
    appearanceJson: JSON.stringify(asObject(settings.appearance))
  };
}

function validateAndExtractDbJsonParts(editorBlock) {
  const normalized = validateAndNormalizeEditorBlock(editorBlock);
  if (!normalized.title) {
    throw badRequest("Block title is required.");
  }

  return {
    normalized,
    dbJson: extractDbJsonParts(normalized)
  };
}

module.exports = {
  validateAndNormalizeEditorBlock,
  extractDbJsonParts,
  validateAndExtractDbJsonParts
};

